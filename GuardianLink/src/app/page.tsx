"use client";

import React, { useState } from 'react';
import { Shield, Users, HelpCircle, LayoutDashboard, Radio } from 'lucide-react';
import SafetyDashboard from '@/components/safety-dashboard';
import ContactManager from '@/components/contact-manager';

export default function GuardianLinkApp() {
  const [activeTab, setActiveTab] = useState('home');

  return (
    <div className="flex-1 flex flex-col bg-background max-w-md mx-auto w-full relative h-screen overflow-y-auto overflow-x-hidden">
      
      <main className="flex-1 pb-24">
        {activeTab === 'home' && <SafetyDashboard />}
        {activeTab === 'network' && <ContactManager />}
        {activeTab === 'about' && (
          <div className="p-6 space-y-6">
            <header className="py-4">
              <h1 className="text-2xl font-bold text-primary">GuardianLink</h1>
              <p className="text-sm text-muted-foreground">About the Project</p>
            </header>
            <div className="space-y-4">
              <section className="bg-white p-4 rounded-2xl shadow-sm border-none">
                <h2 className="font-bold text-primary mb-2 flex items-center gap-2">
                  <Shield className="h-4 w-4" /> AI On-Device
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  We use TinyML models (TensorFlow Lite) to monitor audio keywords locally. Your privacy is protected because no audio is sent to servers unless distress is detected.
                </p>
              </section>
              <section className="bg-white p-4 rounded-2xl shadow-sm border-none">
                <h2 className="font-bold text-primary mb-2 flex items-center gap-2">
                  <LayoutDashboard className="h-4 w-4" /> Smart Cities
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  GuardianLink aligns with the Smart Cities Mission by creating a hyper-local response network of verified contacts and first responders.
                </p>
              </section>
              <section className="bg-white p-4 rounded-2xl shadow-sm border-none">
                <h2 className="font-bold text-primary mb-2 flex items-center gap-2">
                  <Radio className="h-4 w-4" /> Tech Stack
                </h2>
                <p className="text-xs text-muted-foreground font-mono">
                  - Next.js 15 (App Router)<br/>
                  - Genkit (AI Orchestration)<br/>
                  - Gemini 2.5 Flash<br/>
                  - Tailwind CSS / Shadcn UI<br/>
                  - Firebase (Firestore/Auth)
                </p>
              </section>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 max-w-md w-full bg-white/80 backdrop-blur-lg border-t border-border px-6 py-3 flex justify-around items-center z-50">
        <NavButton 
          active={activeTab === 'home'} 
          onClick={() => setActiveTab('home')}
          icon={<LayoutDashboard className="h-6 w-6" />}
          label="Home"
        />
        <NavButton 
          active={activeTab === 'network'} 
          onClick={() => setActiveTab('network')}
          icon={<Users className="h-6 w-6" />}
          label="Network"
        />
        <NavButton 
          active={activeTab === 'about'} 
          onClick={() => setActiveTab('about')}
          icon={<HelpCircle className="h-6 w-6" />}
          label="About"
        />
      </nav>
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center gap-1 transition-all duration-300 ${active ? 'text-primary' : 'text-muted-foreground opacity-60'}`}
    >
      <div className={`p-1 rounded-xl transition-all ${active ? 'bg-primary/10' : ''}`}>
        {icon}
      </div>
      <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
    </button>
  );
}
