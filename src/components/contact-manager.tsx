"use client";

import React, { useState } from 'react';
import { UserPlus, UserMinus, Phone, Heart, Users, Globe, Info, Send, HelpCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useGuardianStore } from '@/lib/guardian-store';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function ContactManager() {
  const { 
    contacts, 
    addContact, 
    removeContact, 
    freeChannelUrl, 
    setFreeChannelUrl,
    telegramBotToken,
    telegramChatId,
    setTelegramConfig
  } = useGuardianStore();
  
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRelation, setNewRelation] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleAdd = () => {
    if (!newName || !newPhone) return;
    addContact({ name: newName, phone: newPhone, relation: newRelation });
    setNewName('');
    setNewPhone('');
    setNewRelation('');
    setIsDialogOpen(false);
  };

  return (
    <div className="flex flex-col gap-6 max-w-md mx-auto w-full p-4 pb-24">
      <header className="py-4">
        <h1 className="text-2xl font-bold tracking-tight text-primary">Safety Network</h1>
        <p className="text-sm text-muted-foreground">Manage your emergency circle and free alerts</p>
      </header>

      {/* Free Channel Section */}
      <div className="space-y-4">
        <Card className="border-none shadow-md bg-accent/5 p-4 rounded-2xl border border-accent/10">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-accent">
              <Globe className="h-4 w-4" />
              <h3 className="text-sm font-bold uppercase tracking-tight">Discord Webhook</h3>
            </div>
            <Badge variant="outline" className={`text-[8px] ${freeChannelUrl ? 'bg-green-50 text-green-700' : ''}`}>
              {freeChannelUrl ? 'ACTIVE' : 'OFF'}
            </Badge>
          </div>
          <Input 
            value={freeChannelUrl} 
            onChange={(e) => setFreeChannelUrl(e.target.value)}
            placeholder="Discord Webhook URL" 
            className="h-9 text-[10px] rounded-xl bg-white border-accent/20 mb-2"
          />
          <p className="text-[9px] text-muted-foreground leading-tight">
            Creates a public channel alert. Paste a Discord Webhook URL to get real push notifications.
          </p>
        </Card>

        <Card className="border-none shadow-md bg-sky-50 p-4 rounded-2xl border border-sky-100">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sky-600">
              <Send className="h-4 w-4" />
              <h3 className="text-sm font-bold uppercase tracking-tight">Telegram Bot</h3>
            </div>
            <div className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-sky-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[200px] text-[10px]">
                    <p>1. Search <b>@BotFather</b> on Telegram to get a Token.</p>
                    <p className="mt-1">2. Search <b>@userinfobot</b> to get your Chat ID.</p>
                    <p className="mt-1 text-sky-700 font-bold">3. IMPORTANT: You MUST click 'START' in your bot to receive messages.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <Badge variant="outline" className={`text-[8px] ${telegramBotToken && telegramChatId ? 'bg-green-50 text-green-700' : ''}`}>
                {(telegramBotToken && telegramChatId) ? 'ACTIVE' : 'OFF'}
              </Badge>
            </div>
          </div>
          <div className="space-y-2">
            <div className="space-y-1">
              <Label className="text-[9px] text-sky-700 opacity-70">BOT TOKEN (@BotFather)</Label>
              <Input 
                value={telegramBotToken} 
                onChange={(e) => setTelegramConfig(e.target.value, telegramChatId)}
                placeholder="Paste Token here" 
                className="h-9 text-[10px] rounded-xl bg-white border-sky-200"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[9px] text-sky-700 opacity-70">YOUR CHAT ID (@userinfobot)</Label>
              <Input 
                value={telegramChatId} 
                onChange={(e) => setTelegramConfig(telegramBotToken, e.target.value)}
                placeholder="Paste Chat ID here" 
                className="h-9 text-[10px] rounded-xl bg-white border-sky-200"
              />
            </div>
          </div>
          <p className="text-[9px] text-sky-700/70 mt-3 leading-tight italic">
            Search for <b>@BotFather</b> in Telegram to create your bot. Then find <b>@userinfobot</b> to get your numeric ID. <b>Don't forget to click 'START' in your own bot!</b>
          </p>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button className="w-full h-14 rounded-2xl gap-2 font-bold shadow-lg">
            <UserPlus className="h-5 w-5" /> Add Personal Contact
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px] rounded-3xl">
          <DialogHeader>
            <DialogTitle>New Safety Contact</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. John Doe" className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="+1 XXXXX XXXXX" className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="relation">Relationship</Label>
              <Input id="relation" value={newRelation} onChange={(e) => setNewRelation(e.target.value)} placeholder="e.g. Parent, Friend" className="rounded-xl" />
            </div>
          </div>
          <Button onClick={handleAdd} className="w-full rounded-xl h-12 font-bold">Save Contact</Button>
        </DialogContent>
      </Dialog>

      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-1">
            <Heart className="h-4 w-4 text-primary fill-primary" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">My Circle ({contacts.length})</h2>
        </div>
        {contacts.length === 0 ? (
          <Card className="border-dashed border-2 bg-transparent opacity-40">
            <CardContent className="flex flex-col items-center justify-center p-10 text-center">
              <Users className="h-10 w-10 mb-2" />
              <p className="text-xs font-medium">Your circle is empty.</p>
            </CardContent>
          </Card>
        ) : (
          contacts.map((contact) => (
            <Card key={contact.id} className="border-none shadow-sm bg-white overflow-hidden">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 h-10 w-10 rounded-xl flex items-center justify-center text-primary font-bold text-sm">
                    {contact.name[0]}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">{contact.name}</h3>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium">
                      <Phone className="h-3 w-3" />
                      <span>{contact.phone}</span>
                      <span className="opacity-30">•</span>
                      <span>{contact.relation}</span>
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => removeContact(contact.id)} className="text-destructive h-8 w-8 hover:bg-destructive/10 rounded-full">
                  <UserMinus className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}