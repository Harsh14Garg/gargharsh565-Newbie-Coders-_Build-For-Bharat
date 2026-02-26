'use server';
/**
 * @fileOverview A Genkit flow for sending emergency alerts via multiple channels:
 * - SMS & WhatsApp (Twilio)
 * - Discord Webhooks (Supports audio & photo attachments)
 * - Telegram Bot API (Supports voice & photo messages)
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import twilio from 'twilio';

const SendSMSInputSchema = z.object({
  recipientPhones: z.array(z.string()).describe('List of phone numbers to send the message to.'),
  message: z.string().describe('The content of the message.'),
  webhookUrl: z.string().optional().describe('A Discord webhook URL for free alerts.'),
  telegramBotToken: z.string().optional().describe('Telegram Bot Token.'),
  telegramChatId: z.string().optional().describe('Telegram Chat ID.'),
  audioDataUri: z.string().optional().describe('Base64 encoded audio recording to send as a voice message.'),
  photoDataUri: z.string().optional().describe('Base64 encoded photo to send as an image alert.'),
});
export type SendSMSInput = z.infer<typeof SendSMSInputSchema>;

const SendSMSOutputSchema = z.object({
  success: z.boolean().describe('Whether at least one dispatch was successful.'),
  sentCount: z.number().describe('Number of successful transmissions across all channels.'),
  channel: z.enum(['sms', 'webhook', 'whatsapp', 'telegram', 'both', 'all']).describe('The primary channel used.'),
  logs: z.array(z.string()).describe('Detailed dispatch logs.'),
});
export type SendSMSOutput = z.infer<typeof SendSMSOutputSchema>;

export async function sendSMS(input: SendSMSInput): Promise<SendSMSOutput> {
  return sendSMSFlow(input);
}

const sendSMSFlow = ai.defineFlow(
  {
    name: 'sendSMSFlow',
    inputSchema: SendSMSInputSchema,
    outputSchema: SendSMSOutputSchema,
  },
  async (input) => {
    const logs: string[] = [];
    let success = false;
    let sentCount = 0;
    let channel: 'sms' | 'webhook' | 'whatsapp' | 'telegram' | 'both' | 'all' = 'sms';

    logs.push(`[SYSTEM] Initializing multi-channel dispatch...`);

    // Helper to process data uri into Buffer and ContentType
    const getBlobInfo = (dataUri: string) => {
      const parts = dataUri.split(',');
      if (parts.length < 2) throw new Error('Invalid Data URI');
      const meta = parts[0];
      const base64Data = parts[1];
      const contentType = meta.split(':')[1].split(';')[0];
      const buffer = Buffer.from(base64Data, 'base64');
      return { buffer, contentType };
    };

    // 1. DISCORD WEBHOOK
    if (input.webhookUrl) {
      logs.push(`[DISCORD] Attempting delivery...`);
      try {
        const formData = new FormData();
        formData.append('payload_json', JSON.stringify({
          content: `🚨 **GUARDIAN SOS ALERT** 🚨\n\n${input.message}`,
        }));
        
        if (input.audioDataUri) {
          const { buffer, contentType } = getBlobInfo(input.audioDataUri);
          const extension = contentType.includes('mp4') ? 'm4a' : contentType.includes('ogg') ? 'ogg' : 'webm';
          formData.append('file1', new Blob([buffer], { type: contentType }), `emergency_audio.${extension}`);
        }

        if (input.photoDataUri) {
          const { buffer, contentType } = getBlobInfo(input.photoDataUri);
          formData.append('file2', new Blob([buffer], { type: contentType }), `emergency_photo.jpg`);
        }

        const response = await fetch(input.webhookUrl, {
          method: 'POST',
          body: formData,
        });
        
        if (response.ok) {
          logs.push(`[DISCORD] Success: Alert dispatched.`);
          success = true;
          channel = 'webhook';
          sentCount++;
        } else {
          logs.push(`[DISCORD] Failed: ${response.status} ${response.statusText}`);
        }
      } catch (e) {
        logs.push(`[DISCORD] Error: ${String(e)}`);
      }
    }

    // 2. TELEGRAM BOT API
    if (input.telegramBotToken && input.telegramChatId) {
      logs.push(`[TELEGRAM] Attempting delivery via Bot API...`);
      try {
        // Step A: Send photo if available
        if (input.photoDataUri) {
          const { buffer, contentType } = getBlobInfo(input.photoDataUri);
          const photoUrl = `https://api.telegram.org/bot${input.telegramBotToken}/sendPhoto`;
          const photoFormData = new FormData();
          photoFormData.append('chat_id', input.telegramChatId);
          photoFormData.append('caption', `🚨 GUARDIAN SOS ALERT 🚨\n\n${input.message}`);
          photoFormData.append('photo', new Blob([buffer], { type: contentType }), 'emergency_photo.jpg');

          const photoResponse = await fetch(photoUrl, { method: 'POST', body: photoFormData });
          if (photoResponse.ok) {
            logs.push(`[TELEGRAM] Photo sent.`);
            success = true;
            channel = 'telegram';
            sentCount++;
          }
        } else {
          // Fallback to text if no photo
          const textUrl = `https://api.telegram.org/bot${input.telegramBotToken}/sendMessage`;
          const textResponse = await fetch(textUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              chat_id: input.telegramChatId, 
              text: `🚨 GUARDIAN SOS ALERT 🚨\n\n${input.message}` 
            }),
          });
          if (textResponse.ok) {
            logs.push(`[TELEGRAM] Text sent.`);
            success = true;
            channel = 'telegram';
            sentCount++;
          }
        }

        // Step B: Send actual voice message
        if (input.audioDataUri) {
          const { buffer, contentType } = getBlobInfo(input.audioDataUri);
          const voiceUrl = `https://api.telegram.org/bot${input.telegramBotToken}/sendVoice`;
          const voiceFormData = new FormData();
          voiceFormData.append('chat_id', input.telegramChatId);
          
          let ext = 'ogg'; 
          if (contentType.includes('webm')) ext = 'webm';
          else if (contentType.includes('mp4')) ext = 'm4a';

          voiceFormData.append('voice', new Blob([buffer], { type: contentType }), `voice_alert.${ext}`);

          const voiceResponse = await fetch(voiceUrl, { method: 'POST', body: voiceFormData });
          if (voiceResponse.ok) {
            logs.push(`[TELEGRAM] Voice message sent.`);
            sentCount++;
          }
        }
      } catch (e) {
        logs.push(`[TELEGRAM] Error: ${String(e)}`);
      }
    }

    // 3. TWILIO (SMS & WhatsApp)
    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioFrom = process.env.TWILIO_PHONE_NUMBER;

    if (twilioSid && twilioToken && twilioFrom && input.recipientPhones.length > 0) {
      logs.push(`[TWILIO] Attempting delivery...`);
      const client = twilio(twilioSid, twilioToken);
      const results = await Promise.allSettled(
        input.recipientPhones.flatMap(phone => [
          client.messages.create({ body: input.message, from: twilioFrom, to: phone }),
          client.messages.create({ body: input.message, from: `whatsapp:${twilioFrom}`, to: `whatsapp:${phone}` })
        ])
      );

      results.forEach((res) => {
        if (res.status === 'fulfilled') {
          sentCount++;
          success = true;
        }
      });
      channel = 'both';
    }

    return {
      success: success || sentCount > 0,
      sentCount,
      channel,
      logs,
    };
  }
);
