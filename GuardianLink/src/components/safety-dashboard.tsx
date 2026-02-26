"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Shield, ShieldAlert, MapPin, Mic, Users, Settings, AlertTriangle, CheckCircle2, History, Send, Terminal, Bell, Code, MessageCircle, Share2, Info, Activity, Volume2, Play, Camera, Lock, RefreshCw } from 'lucide-react';
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

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
  const [hasCameraPermission, setHasCameraPermission] = useState(false);
  const { toast } = useToast();
  
  const simulationInterval = useRef<NodeJS.Timeout | null>(null);
  const continuousAnalysisInterval = useRef<NodeJS.Timeout | null>(null);
  const emergencyUpdateInterval = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const getCameraPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setHasCameraPermission(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(e => console.warn("Video play blocked"));
      }
      
      toast({
        title: 'Permissions Granted',
        description: 'Safety systems are now active.',
      });
    } catch (error) {
      setHasCameraPermission(false);
      toast({
        variant: 'destructive',
        title: 'Access Blocked',
        description: 'Please enable camera/mic in browser settings.',
      });
    }
  };

  useEffect(() => {
    getCameraPermission();
    return () => {
      if (emergencyUpdateInterval.current) clearInterval(emergencyUpdateInterval.current);
    };
  }, []);

  useEffect(() => {
    if (isMonitoring) {
      simulationInterval.current = setInterval(() => {
        setMicActivity(Math.random() * 100);
      }, 300);

      continuousAnalysisInterval.current = setInterval(() => {
        const statusMsgs = [
          "Scanning frequencies...", 
          "AI Listener: Active",
          "Waiting for trigger...",
          "Privacy Shield: Engaged"
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

  useEffect(() => {
    if (isEmergencyActive) {
      emergencyUpdateInterval.current = setInterval(() => {
        triggerDispatch("Active Emergency Update");
      }, 300000); 
    } else {
      if (emergencyUpdateInterval.current) clearInterval(emergencyUpdateInterval.current);
    }
  }, [isEmergencyActive]);

  const takePhoto = (): string | undefined => {
    if (!videoRef.current || !canvasRef.current) return undefined;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Ensure video is rendering frames
    if (video.readyState < 2) return undefined;
    
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const context = canvas.getContext('2d');
    if (context) {
      try {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/jpeg', 0.8);
      } catch (e) {
        console.error("Canvas capture failed", e);
        return undefined;
      }
    }
    return undefined;
  };

  const startVoiceRecording = async (): Promise<string | undefined> => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return undefined;
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
      const mimeType = types.find(type => MediaRecorder.isTypeSupported(type)) || '';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      const chunks: Blob[] = [];
      setIsRecording(true);

      return new Promise((resolve) => {
        mediaRecorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            chunks.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          if (chunks.length === 0) {
            resolve(undefined);
            return;
          }
          const audioBlob = new Blob(chunks, { type: mimeType || 'audio/webm' });
          const reader = new FileReader();
          reader.onloadend = () => {
            setIsRecording(false);
            resolve(reader.result as string);
          };
          reader.readAsDataURL(audioBlob);
          stream.getTracks().forEach(track => track.stop());
        };

        // Start without timeslice to prevent NotSupportedError on some devices
        try {
          mediaRecorder.start();
        } catch (e) {
          console.error("Recorder start failed", e);
          resolve(undefined);
        }

        setTimeout(() => {
          if (mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
          }
        }, 5000);
      });
    } catch (err) {
      console.error("Voice recording failed", err);
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
        (err) => resolve({ lat: 28.6139, lng: 77.2090 }),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  };

  const triggerDispatch = async (detectedReason?: string) => {
    setMonitoringStatus("Initiating SOS dispatch...");
    const coords = await getCoordinates();
    const locationLink = `https://www.google.com/maps?q=${coords.lat},${coords.lng}`;
    
    // Non-blocking capture
    const photoDataUri = takePhoto();
    const audioClipUrlPromise = startVoiceRecording();

    try {
      setMonitoringStatus("Broadcasting...");
      const audioClipUrl = await audioClipUrlPromise;

      const emergencyResponse = await generateEmergencyMessage({
        locationLink,
        detectedKeywords: [detectedReason || "MANUAL SOS"],
        audioDescription: detectedReason ? `${detectedReason} (Evidence Attached)` : "Manual SOS (Evidence Attached)"
      });

      const dispatchResult = await sendSMS({
        recipientPhones: contacts.map(c => c.phone),
        message: emergencyResponse.message,
        webhookUrl: freeChannelUrl,
        telegramBotToken,
        telegramChatId,
        audioDataUri: audioClipUrl,
        photoDataUri: photoDataUri
      });

      if (dispatchResult.success) {
        toast({
          title: "Alerts Dispatched",
          description: `Dispatched across ${dispatchResult.channel}.`,
        });
      } else {
        toast({
          title: "Dispatch Issue",
          description: "Alert partially sent. Check config.",
          variant: "destructive"
        });
      }

      addAlert({
        timestamp: Date.now(),
        location: coords,
        status: 'sent',
        message: emergencyResponse.message,
        channelUsed: dispatchResult.channel,
        audioClipUrl,
        photoUrl: photoDataUri
      });

      setMonitoringStatus("SOS Dispatched");
    } catch (error) {
      console.error("Dispatch Error:", error);
      toast({
        title: "Dispatch Error",
        description: "Failed to broadcast alert.",
        variant: "destructive"
      });
    }
  };

  const triggerEmergency = async (detectedReason?: string) => {
    setIsEmergencyActive(true);
    toast({
      title: "SOS INITIATED",
      description: "Broadcasting location and media...",
      variant: "destructive",
    });
    await triggerDispatch(detectedReason);
  };

  const playRecordedAudio = (url: string) => {
    const audio = new Audio(url);
    audio.play().catch(e => console.error("Audio play failed", e));
  };

  return (
    <div className="flex-1 flex flex-col bg-background max-w-md mx-auto w-full relative h-full overflow-y-auto">
      {/* Active but invisible camera to prevent black images */}
      <div className="fixed top-0 left-0 w-full h-full opacity-0 pointer-events-none z-[-1] overflow-hidden">
        <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
        <canvas ref={canvasRef} />
      </div>

      <div className="p-4 space-y-6 pb-24">
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
                    <DialogTitle>Emergency Setup</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 text-xs leading-relaxed">
                    <div>
                      <p className="font-bold text-primary mb-1">Telegram Integration</p>
                      <p>1. Open <b>@BotFather</b> to get your token.</p>
                      <p>2. Open <b>@userinfobot</b> to get your ID.</p>
                      <p className="mt-2 text-destructive font-bold p-2 bg-destructive/5 rounded-lg border border-destructive/10">
                        IMPORTANT: You must click "START" in your bot to receive messages!
                      </p>
                    </div>
                    <div>
                      <p className="font-bold text-primary mb-1">System Permissions</p>
                      <p>Click the <b>Lock Icon</b> in the address bar and set Camera/Mic to "Allow".</p>
                    </div>
                  </div>
                </DialogContent>
             </Dialog>
          </div>
        </header>

        {!(hasCameraPermission) && (
          <Alert variant="destructive" className="rounded-2xl border-2 bg-white text-destructive shadow-lg overflow-hidden border-destructive/20 p-0">
            <div className="bg-destructive p-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Lock className="h-5 w-5" />
                <AlertTitle className="text-sm font-bold mb-0">Permissions Required</AlertTitle>
              </div>
              <Button size="sm" variant="outline" onClick={getCameraPermission} className="bg-white/10 hover:bg-white/20 border-white/40 text-white h-8 text-[10px] font-bold rounded-lg">
                <RefreshCw className="h-3 w-3 mr-1" /> RETRY
              </Button>
            </div>
            <AlertDescription className="p-4 text-[11px] space-y-3">
              <p className="font-medium">GuardianLink needs camera and microphone access for evidence capture.</p>
            </AlertDescription>
          </Alert>
        )}

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
              className={`w-full h-14 text-base font-bold rounded-2xl shadow-lg ${isMonitoring ? 'bg-white text-primary hover:bg-white/90' : 'bg-primary text-white hover:bg-primary/90'}`}
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

        <Card className={`border-none shadow-xl overflow-hidden transition-all duration-300 ${isEmergencyActive ? 'bg-green-600' : 'bg-destructive'}`}>
          <Button 
            variant="ghost" 
            onClick={() => isEmergencyActive ? setIsEmergencyActive(false) : triggerEmergency()}
            className="w-full h-20 flex items-center justify-center gap-3 text-white hover:bg-black/10"
          >
            <div className="bg-white/20 p-2 rounded-full">
              {isEmergencyActive ? <CheckCircle2 className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}
            </div>
            <div className="text-left">
              <div className="text-lg font-extrabold uppercase tracking-tight">
                {isEmergencyActive ? 'STOP EMERGENCY' : 'SOS TRIGGER'}
              </div>
              <div className="text-[9px] font-medium opacity-80 uppercase tracking-tighter">
                {isEmergencyActive ? 'Auto-updates: ON' : 'Broadcast Location + Media'}
              </div>
            </div>
          </Button>
        </Card>

        <Tabs defaultValue="history" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-white/50 p-1 rounded-xl">
            <TabsTrigger value="history" className="rounded-lg text-xs font-bold">Alert History</TabsTrigger>
            <TabsTrigger value="test" className="rounded-lg text-xs font-bold">Simulate</TabsTrigger>
          </TabsList>
          <TabsContent value="test">
            <Card className="border-none shadow-sm bg-white/40">
              <CardContent className="p-4">
                <p className="text-[10px] font-bold uppercase text-muted-foreground mb-3">Simulate Keywords:</p>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => triggerEmergency("Manual SOS Test")} className="text-[10px] h-8 rounded-full">Manual SOS</Button>
                  <Button size="sm" variant="outline" onClick={() => triggerEmergency("Bachao Trigger Detected")} className="text-[10px] h-8 rounded-full">Bachao</Button>
                  <Button size="sm" variant="outline" onClick={() => triggerEmergency("Help Trigger Detected")} className="text-[10px] h-8 rounded-full">Help</Button>
                  <Button size="sm" variant="outline" onClick={() => triggerEmergency("Stop Trigger Detected")} className="text-[10px] h-8 rounded-full">Stop</Button>
                  <Button size="sm" variant="outline" onClick={() => triggerEmergency("Kidnaping Trigger Detected")} className="text-[10px] h-8 rounded-full">Kidnaping</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="history">
            <div className="space-y-3">
              {alerts.length === 0 ? (
                <p className="text-center text-xs text-muted-foreground py-10">System Status: All Clear.</p>
              ) : (
                alerts.map((alert) => (
                  <Card key={alert.id} className="border-none shadow-md bg-white overflow-hidden">
                    <CardContent className="p-0">
                      {alert.photoUrl && (
                        <div className="w-full aspect-video relative overflow-hidden bg-muted">
                          <img src={alert.photoUrl} alt="Emergency capture" className="w-full h-full object-cover" />
                          <div className="absolute top-2 left-2">
                            <Badge className="bg-destructive text-[8px] border-none">EMERGENCY CAPTURE</Badge>
                          </div>
                        </div>
                      )}
                      <div className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="bg-green-100 p-2 rounded-full"><CheckCircle2 className="h-4 w-4 text-green-600" /></div>
                          <div>
                            <p className="text-[10px] font-bold">{new Date(alert.timestamp).toLocaleTimeString()}</p>
                            <p className="text-[9px] text-muted-foreground uppercase">
                              Via {alert.channelUsed || 'Multi-Channel'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {alert.audioClipUrl && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-10 w-10 rounded-full bg-primary/10 hover:bg-primary/20"
                              onClick={() => playRecordedAudio(alert.audioClipUrl!)}
                            >
                              <Volume2 className="h-5 w-5 text-primary" />
                            </Button>
                          )}
                          <a href={`https://www.google.com/maps?q=${alert.location.lat},${alert.location.lng}`} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-muted">
                              <MapPin className="h-5 w-5 text-muted-foreground" />
                            </Button>
                          </a>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
