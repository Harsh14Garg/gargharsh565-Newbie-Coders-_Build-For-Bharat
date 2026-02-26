
import { config } from 'dotenv';
config();

import '@/ai/flows/generate-emergency-message.ts';
import '@/ai/flows/distress-audio-detection-flow.ts';
import '@/ai/flows/send-sms-flow.ts';
