
"use client";

import React, { useState, useEffect } from 'react';
import { Map, MapPin, Navigation, Clock, ShieldCheck, HeartPulse } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useGuardianStore } from '@/lib/guardian-store';

export default function VolunteerSimulation() {
  const { alerts } = useGuardianStore();
  const latestAlert = alerts[0];

  return (
    <div className="flex flex-col gap-6 max-w-md mx-auto w-full p-4 pb-20">
      <header className="py-4">
        <h1 className="text-2xl font-bold tracking-tight text-accent">Volunteer Portal</h1>
        <p className="text-sm text-muted-foreground">Community response network (Simulator)</p>
      </header>

      {latestAlert ? (
        <Card className="border-2 border-destructive shadow-2xl animate-in fade-in slide-in-from-bottom-4">
          <CardHeader className="bg-destructive text-destructive-foreground">
            <div className="flex justify-between items-start">
              <Badge variant="outline" className="bg-white/20 text-white border-none">ACTIVE DISTRESS</Badge>
              <div className="flex items-center gap-1 text-[10px] font-bold">
                <Clock className="h-3 w-3" /> {new Date(latestAlert.timestamp).toLocaleTimeString()}
              </div>
            </div>
            <CardTitle className="text-lg mt-2 flex items-center gap-2">
              <HeartPulse className="h-5 w-5" /> Emergency Response Needed
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
             <div className="bg-muted p-3 rounded-xl">
                <p className="text-xs font-bold uppercase text-muted-foreground mb-1">Message Detail:</p>
                <p className="text-sm italic text-foreground">"{latestAlert.message}"</p>
             </div>
             
             <div className="flex gap-2">
                <Button className="flex-1 bg-destructive hover:bg-destructive/90 text-white font-bold h-12 rounded-xl gap-2">
                    <Navigation className="h-4 w-4" /> Navigate Now
                </Button>
                <Button variant="outline" className="flex-1 border-destructive text-destructive hover:bg-destructive/10 font-bold h-12 rounded-xl">
                    Accept Task
                </Button>
             </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-white border-none shadow-md overflow-hidden">
          <CardContent className="p-10 flex flex-col items-center justify-center text-center opacity-60">
            <ShieldCheck className="h-16 w-16 text-accent mb-4" />
            <h3 className="font-bold text-lg mb-2">System Ready</h3>
            <p className="text-sm text-muted-foreground">Monitoring for distress signals in your verified area. Stay alert.</p>
          </CardContent>
        </Card>
      )}

      <div className="rounded-2xl bg-primary/5 p-4 border border-primary/10">
        <h3 className="text-sm font-bold text-primary mb-2">Simulated Live Map View</h3>
        <div className="w-full aspect-square bg-muted rounded-xl relative overflow-hidden flex items-center justify-center">
            <Map className="h-12 w-12 text-muted-foreground/30" />
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none"></div>
            
            {latestAlert && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                    <MapPin className="h-8 w-8 text-destructive fill-destructive" />
                    <div className="w-4 h-4 bg-destructive/30 rounded-full animate-ping -mt-4"></div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}
