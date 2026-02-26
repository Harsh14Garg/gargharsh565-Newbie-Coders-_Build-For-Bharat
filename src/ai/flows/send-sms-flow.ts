
'use server';
/**
 * @fileOverview A Genkit flow for sending emergency alerts via multiple channels:
 * - SMS & WhatsApp (Twilio)
 * - Discord Webhooks
 * - Telegram Bot API
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

    // 1. DISCORD WEBHOOK
    if (input.webhookUrl) {
      logs.push(`[DISCORD] Attempting delivery...`);
      try {
        const response = await fetch(input.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: `🚨 **GUARDIAN SOS ALERT** 🚨\n\n${input.message}`,
          }),
        });
        
        if (response.ok) {
          logs.push(`[DISCORD] Success: Alert posted to webhook.`);
          success = true;
          channel = 'webhook';
          sentCount++;
        } else {
          logs.push(`[DISCORD] Failed: Status ${response.status}`);
        }
      } catch (e) {
        logs.push(`[DISCORD] Error: ${String(e)}`);
      }
    }

    // 2. TELEGRAM BOT API
    if (input.telegramBotToken && input.telegramChatId) {
      logs.push(`[TELEGRAM] Attempting delivery via Bot API...`);
      try {
        const url = `https://api.telegram.org/bot${input.telegramBotToken}/sendMessage`;
        // Use plain text for Telegram to avoid HTML parsing errors with links (& characters)
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: input.telegramChatId,
            text: `🚨 GUARDIAN SOS ALERT 🚨\n\n${input.message}`,
          }),
        });

        if (response.ok) {
          logs.push(`[TELEGRAM] Success: Message sent to Telegram.`);
          success = true;
          channel = 'telegram';
          sentCount++;
        } else {
          const errData = await response.json().catch(() => ({}));
          const detail = errData.description || `Status ${response.status}`;
          logs.push(`[TELEGRAM] Failed: ${detail}`);
          logs.push(`[TELEGRAM] TIP: Ensure you clicked 'START' in your bot and used a numeric Chat ID.`);
        }
      } catch (e) {
        logs.push(`[TELEGRAM] Error: ${String(e)}`);
      }
    }

    // 3. TWILIO (SMS & WhatsApp)
    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioFrom = process.env.TWILIO_PHONE_NUMBER;

    if (twilioSid && twilioToken && twilioFrom) {
      logs.push(`[TWILIO] Keys detected. Sending via SMS and WhatsApp.`);
      const client = twilio(twilioSid, twilioToken);
      
      const results = await Promise.allSettled(
        input.recipientPhones.flatMap(phone => [
          client.messages.create({ body: input.message, from: twilioFrom, to: phone }),
          client.messages.create({ body: input.message, from: `whatsapp:${twilioFrom}`, to: `whatsapp:${phone}` })
        ])
      );

      results.forEach((res, i) => {
        const type = i % 2 === 0 ? 'SMS' : 'WhatsApp';
        const target = input.recipientPhones[Math.floor(i / 2)];
        if (res.status === 'fulfilled') {
          logs.push(`[TWILIO] ${type} sent to ${target}`);
          sentCount++;
          success = true;
        } else {
          logs.push(`[TWILIO] ${type} failed for ${target}: ${res.reason?.message}`);
        }
      });
      
      channel = 'both';
    } else {
      logs.push(`[SIMULATOR] Twilio missing. Real SMS/WhatsApp skipped.`);
    }

    // If Telegram/Discord was successful, adjust final channel
    if (success && sentCount > 0) {
        if (input.telegramBotToken && input.webhookUrl) channel = 'all';
        else if (input.telegramBotToken) channel = 'telegram';
        else if (input.webhookUrl) channel = 'webhook';
    }

    return {
      success: success || sentCount > 0,
      sentCount,
      channel,
      logs,
    };
  }
);
