"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Shield, ShieldAlert, MapPin, Mic, Users, Settings, AlertTriangle, CheckCircle2, History, Send, Terminal, Bell, Code, MessageCircle, Share2, Info, Activity, Volume2, Play } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useGuardianStore } from '@/lib/guardian-store';
import { detectDistressAudio } from '@/ai/flows/distress-audio-detection-flow';
import { generateEmergencyMessage } from '@/ai/flows/generate-emergency-message';
import { sendSMS } from '@/ai/flows/send-sms-flow';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function SafetyDashboard() {
  const { 
    isMonitoring, 
    toggleMonitoring, 
    alerts, 
    addAlert, 
    contacts, 
    freeChannelUrl,
    telegramBotToken,
    telegramChatId
  } = useGuardianStore();
  
  const [isEmergencyActive, setIsEmergencyActive] = useState(false);
  const [micActivity, setMicActivity] = useState(0);
  const [monitoringStatus, setMonitoringStatus] = useState("Idle");
  const [isRecording, setIsRecording] = useState(false);
  const { toast } = useToast();
  
  const simulationInterval = useRef<NodeJS.Timeout | null>(null);
  const continuousAnalysisInterval = useRef<NodeJS.Timeout | null>(null);
  const emergencyRepeatInterval = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  // Simulate active background monitoring when Guardian Mode is on
  useEffect(() => {
    if (isMonitoring) {
      simulationInterval.current = setInterval(() => {
        setMicActivity(Math.random() * 100);
      }, 300);

      continuousAnalysisInterval.current = setInterval(() => {
        const statusMsgs = [
          "Scanning ambient frequencies...", 
          "Processing local audio buffer...", 
          "Checking against keywords...", 
          "Environment: Normal", 
          "AI Listener: Active",
          "Privacy Shield: Engaged",
          "Waiting for trigger..."
        ];
        setMonitoringStatus(statusMsgs[Math.floor(Math.random() * statusMsgs.length)]);
      }, 2500);

    } else {
      if (simulationInterval.current) clearInterval(simulationInterval.current);
      if (continuousAnalysisInterval.current) clearInterval(continuousAnalysisInterval.current);
      setMicActivity(0);
      setMonitoringStatus("Idle");
    }
    return () => {
      if (simulationInterval.current) clearInterval(simulationInterval.current);
      if (continuousAnalysisInterval.current) clearInterval(continuousAnalysisInterval.current);
    };
  }, [isMonitoring]);

  // Handle continuous updates every 5 minutes when SOS is active
  useEffect(() => {
    if (isEmergencyActive) {
      if (emergencyRepeatInterval.current) clearInterval(emergencyRepeatInterval.current);
      
      emergencyRepeatInterval.current = setInterval(() => {
        triggerDispatch("CONTINUOUS TRACKING UPDATE");
      }, 300000); // 5 minutes
    } else {
      if (emergencyRepeatInterval.current) clearInterval(emergencyRepeatInterval.current);
    }
    return () => {
      if (emergencyRepeatInterval.current) clearInterval(emergencyRepeatInterval.current);
    };
  }, [isEmergencyActive]);

  const startVoiceRecording = async (): Promise<string | undefined> => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return undefined;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Select supported mime type for the browser
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') 
        ? 'audio/webm' 
        : MediaRecorder.isTypeSupported('audio/mp4') 
          ? 'audio/mp4' 
          : 'audio/ogg';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      const chunks: Blob[] = [];

      setIsRecording(true);

      return new Promise((resolve) => {
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) chunks.push(event.data);
        };

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(chunks, { type: mimeType });
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = () => {
            setIsRecording(false);
            resolve(reader.result as string);
          };
          stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.start();
        setTimeout(() => {
          if (mediaRecorder.state === 'recording') mediaRecorder.stop();
        }, 5000); // Record for 5 seconds
      });
    } catch (err) {
      setIsRecording(false);
      return undefined;
    }
  };

  const getCoordinates = (): Promise<{lat: number, lng: number}> => {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !navigator.geolocation) {
        resolve({ lat: 28.6139, lng: 77.2090 });
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => {
          resolve({ lat: 28.6139, lng: 77.2090 });
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  };

  const triggerDispatch = async (detectedReason?: string) => {
    const coords = await getCoordinates();
    const locationLink = `https://www.google.com/maps?q=${coords.lat},${coords.lng}`;
    
    // Start recording audio in parallel to alert generation
    const voiceRecordingTask = startVoiceRecording();

    try {
      const emergencyResponse = await generateEmergencyMessage({
        locationLink,
        detectedKeywords: [detectedReason || "MANUAL SOS"],
        audioDescription: detectedReason ? `${detectedReason} (Audio recording captured)` : "Emergency trigger (Audio recording captured)"
      });

      const dispatchResult = await sendSMS({
        recipientPhones: contacts.map(c => c.phone),
        message: emergencyResponse.message,
        webhookUrl: freeChannelUrl,
        telegramBotToken,
        telegramChatId
      });

      if (dispatchResult.success) {
        toast({
          title: "Alerts Dispatched",
          description: `Used: ${dispatchResult.channel?.toUpperCase() || 'SYSTEM'} - Reached ${dispatchResult.sentCount} targets.`,
        });
      }

      const audioClipUrl = await voiceRecordingTask;

      addAlert({
        timestamp: Date.now(),
        location: coords,
        status: 'sent',
        message: emergencyResponse.message,
        channelUsed: dispatchResult.channel,
        audioClipUrl
      });

    } catch (error) {
      toast({
        title: "Dispatch Error",
        description: "Critical failure in AI dispatch flow.",
        variant: "destructive"
      });
    }
  };

  const triggerEmergency = async (detectedReason?: string) => {
    setIsEmergencyActive(true);
    toast({
      title: "SOS ACTIVE",
      description: "Recording audio and dispatching alerts. Tracking active.",
      variant: "destructive",
    });
    await triggerDispatch(detectedReason);
  };

  const deactivateEmergency = () => {
    setIsEmergencyActive(false);
    toast({
      title: "SOS Deactivated",
      description: "Continuous tracking updates have been stopped.",
    });
  };

  const handleWhatsAppManual = async () => {
    const coords = await getCoordinates();
    const message = encodeURIComponent(`🚨 EMERGENCY SOS 🚨\nI am in distress and need help! My live location: https://www.google.com/maps?q=${coords.lat},${coords.lng}`);
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  const simulateDistress = async (keyword: string) => {
    if (!isMonitoring) {
        toast({ title: "Monitoring Inactive", description: "Turn on Guardian mode first." });
        return;
    }
    setMonitoringStatus(`Detecting: "${keyword}"...`);
    const detection = await detectDistressAudio({ audioEventDescription: keyword });
    if (detection.isDistressDetected) {
      triggerEmergency(detection.detectedReason);
    } else {
      setMonitoringStatus("Listening...");
    }
  };

  const playRecordedAudio = (url: string) => {
    const audio = new Audio(url);
    audio.play().catch(e => console.error("Playback failed", e));
  };

  return (
    <div className="flex flex-col gap-6 max-w-md mx-auto w-full p-4">
      <header className="flex justify-between items-center py-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary">GuardianLink</h1>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Always Protected</p>
        </div>
        <div className="flex gap-2">
           <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full bg-white shadow-sm border border-border">
                  <Info className="h-4 w-4 text-primary" />
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-3xl max-w-xs sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Setup Help Guide</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 text-xs leading-relaxed">
                  <div>
                    <p className="font-bold text-primary mb-1">Telegram (Free Alerts)</p>
                    <p>1. Open Telegram and search for <span className="font-mono text-accent">@BotFather</span>.</p>
                    <p>2. Send <span className="font-mono">/newbot</span> and follow steps to get your <span className="font-bold">API Token</span>.</p>
                    <p>3. Search for <span className="font-mono text-accent">@userinfobot</span> and send a message to get your <span className="font-bold">Chat ID</span>.</p>
                    <p className="mt-2 text-destructive font-bold p-2 bg-destructive/5 rounded-lg border border-destructive/10">
                      CRITICAL: You MUST open your new bot and click the START button to receive alerts! This is a one-time setup step.
                    </p>
                  </div>
                  <div className="h-px bg-border" />
                  <div>
                    <p className="font-bold text-accent mb-1">Discord Webhooks</p>
                    <p>1. Go to Discord Server Settings &gt; Integrations.</p>
                    <p>2. Create a Webhook and copy the URL.</p>
                    <p>3. Paste it in the <span className="font-bold">Network</span> tab.</p>
                  </div>
                </div>
              </DialogContent>
           </Dialog>
           <Button variant="ghost" size="icon" className="rounded-full bg-white shadow-sm border border-border">
            <Settings className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      </header>

      <Card className={`relative overflow-hidden transition-all duration-500 border-none shadow-xl ${isMonitoring ? 'bg-primary text-white' : 'bg-white'}`}>
        <CardContent className="pt-8 flex flex-col items-center text-center">
          <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 transition-all duration-500 shadow-inner ${isMonitoring ? 'bg-white/20 emergency-pulse' : 'bg-secondary'}`}>
            {isMonitoring ? <Shield className="h-12 w-12 text-white" /> : <ShieldAlert className="h-12 w-12 text-primary/40" />}
          </div>
          <h2 className="text-xl font-bold mb-1">{isMonitoring ? 'Live Monitoring' : 'Guardian Offline'}</h2>
          <div className="flex items-center gap-2 mb-6 h-4">
            {isMonitoring && <Activity className="h-3 w-3 animate-pulse text-white/60" />}
            <p className={`text-[10px] font-bold uppercase tracking-wider ${isMonitoring ? 'text-white/80' : 'text-muted-foreground'}`}>
              {monitoringStatus}
            </p>
          </div>
          <Button 
            onClick={toggleMonitoring}
            className={`w-full h-14 text-base font-bold rounded-2xl shadow-lg transition-transform active:scale-95 ${isMonitoring ? 'bg-white text-primary hover:bg-white/90' : 'bg-primary text-white hover:bg-primary/90'}`}
          >
            {isMonitoring ? 'Stop Monitoring' : 'Start Guardian Mode'}
          </Button>
        </CardContent>
        {isMonitoring && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
            <div className="h-full bg-white transition-all duration-300" style={{ width: `${micActivity}%` }} />
          </div>
        )}
      </Card>

      {isRecording && (
        <Badge variant="destructive" className="mx-auto flex items-center gap-2 animate-pulse py-2 px-4 rounded-full shadow-lg">
          <Mic className="h-3 w-3" /> RECORDING EMERGENCY AUDIO...
        </Badge>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Card className="border-none shadow-md bg-white overflow-hidden group">
          <Button 
            variant="ghost" 
            onClick={handleWhatsAppManual}
            className="w-full h-full p-4 flex flex-col items-center text-center gap-2 hover:bg-green-50"
          >
            <div className="bg-green-50 p-3 rounded-xl transition-colors group-hover:bg-green-100"><Share2 className="h-5 w-5 text-green-600" /></div>
            <span className="text-[10px] font-bold">WhatsApp</span>
            <span className="text-[8px] text-green-600 font-bold uppercase tracking-tighter">Manual Share</span>
          </Button>
        </Card>
        <Card className="border-none shadow-md bg-white">
          <CardContent className="p-4 flex flex-col items-center text-center">
            <div className="bg-sky-50 p-3 rounded-xl mb-2"><Send className="h-5 w-5 text-sky-600" /></div>
            <span className="text-[10px] font-bold">Telegram Bot</span>
            <span className="text-[8px] text-sky-600 font-bold uppercase tracking-tighter">Automated Free</span>
          </CardContent>
        </Card>
      </div>

      <Card className={`border-none shadow-xl overflow-hidden transition-all duration-300 ${isEmergencyActive ? 'bg-green-600' : 'bg-destructive'}`}>
        <Button 
          variant="ghost" 
          onClick={() => isEmergencyActive ? deactivateEmergency() : triggerEmergency()}
          className="w-full h-20 flex items-center justify-center gap-3 active:scale-95 transition-transform text-white hover:bg-black/10"
        >
          <div className="bg-white/20 p-2 rounded-full">
            {isEmergencyActive ? <CheckCircle2 className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}
          </div>
          <div className="text-left">
            <div className="text-lg font-extrabold uppercase tracking-tight">
              {isEmergencyActive ? 'STOP EMERGENCY' : 'SOS TRIGGER'}
            </div>
            <div className="text-[9px] font-medium opacity-80 uppercase tracking-tighter">
              {isEmergencyActive ? 'Tracking active' : 'All channels active'}
            </div>
          </div>
        </Button>
      </Card>

      <Tabs defaultValue="history" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-white/50 p-1 rounded-xl">
          <TabsTrigger value="history" className="rounded-lg text-xs">History</TabsTrigger>
          <TabsTrigger value="test" className="rounded-lg text-xs">Simulate</TabsTrigger>
        </TabsList>
        <TabsContent value="test">
          <Card className="border-none shadow-sm bg-white/40">
            <CardContent className="flex flex-wrap gap-2 p-4">
              <Button size="sm" variant="outline" onClick={() => simulateDistress("Help!")} className="text-[10px] h-8 rounded-full">Say "Help"</Button>
              <Button size="sm" variant="outline" onClick={() => simulateDistress("Bachao!")} className="text-[10px] h-8 rounded-full">Say "Bachao"</Button>
              <Button size="sm" variant="outline" onClick={() => simulateDistress("Stop it now!")} className="text-[10px] h-8 rounded-full">Say "Stop"</Button>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="history">
          <div className="space-y-2">
            {alerts.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground py-10">No recent alerts.</p>
            ) : (
              alerts.map((alert) => (
                <Card key={alert.id} className="border-none shadow-sm bg-white">
                  <CardContent className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-green-100 p-2 rounded-full"><CheckCircle2 className="h-3 w-3 text-green-600" /></div>
                      <div>
                        <p className="text-[10px] font-bold">{new Date(alert.timestamp).toLocaleTimeString()}</p>
                        <p className="text-[9px] text-muted-foreground uppercase">
                          Via: {alert.channelUsed?.toUpperCase() || 'SYSTEM'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {alert.audioClipUrl && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 rounded-full bg-primary/10 hover:bg-primary/20"
                          onClick={() => playRecordedAudio(alert.audioClipUrl!)}
                        >
                          <Volume2 className="h-4 w-4 text-primary animate-pulse" />
                        </Button>
                      )}
                      <Badge variant="secondary" className="text-[8px] uppercase">Delivered</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
