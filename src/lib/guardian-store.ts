
'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Contact = {
  id: string;
  name: string;
  phone: string;
  relation: string;
};

export type EmergencyAlert = {
  id: string;
  timestamp: number;
  location: { lat: number; lng: number };
  audioClipUrl?: string;
  photoUrl?: string;
  status: 'sent' | 'responded' | 'resolved';
  message: string;
  channelUsed?: 'sms' | 'webhook' | 'whatsapp' | 'telegram' | 'both' | 'all';
};

interface GuardianState {
  isMonitoring: boolean;
  contacts: Contact[];
  alerts: EmergencyAlert[];
  freeChannelUrl: string;
  telegramBotToken: string;
  telegramChatId: string;
  toggleMonitoring: () => void;
  setFreeChannelUrl: (url: string) => void;
  setTelegramConfig: (token: string, chatId: string) => void;
  addContact: (contact: Omit<Contact, 'id'>) => void;
  removeContact: (id: string) => void;
  addAlert: (alert: Omit<EmergencyAlert, 'id'>) => void;
}

export const useGuardianStore = create<GuardianState>()(
  persist(
    (set) => ({
      isMonitoring: false,
      contacts: [
        { id: '1', name: 'Amara Singh', phone: '+91 98765 43210', relation: 'Sister' },
        { id: '2', name: 'Rajesh Kumar', phone: '+91 99999 88888', relation: 'Father' },
      ],
      alerts: [],
      freeChannelUrl: '',
      telegramBotToken: '',
      telegramChatId: '',
      toggleMonitoring: () => set((state) => ({ isMonitoring: !state.isMonitoring })),
      setFreeChannelUrl: (url) => set({ freeChannelUrl: url }),
      setTelegramConfig: (token, chatId) => set({ telegramBotToken: token, telegramChatId: chatId }),
      addContact: (contact) =>
        set((state) => ({
          contacts: [...state.contacts, { ...contact, id: Math.random().toString(36).substr(2, 9) }],
        })),
      removeContact: (id) =>
        set((state) => ({
          contacts: state.contacts.filter((c) => c.id !== id),
        })),
      addAlert: (alert) =>
        set((state) => ({
          alerts: [{ ...alert, id: Math.random().toString(36).substr(2, 9) }, ...state.alerts],
        })),
    }),
    {
      name: 'guardian-storage',
    }
  )
);
