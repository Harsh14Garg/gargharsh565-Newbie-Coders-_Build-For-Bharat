'use server';
/**
 * @fileOverview A Genkit flow for simulating the detection of distress keywords or panic sounds from audio.
 * This flow processes a textual description of an audio event and determines if it indicates distress.
 *
 * - detectDistressAudio - A function that simulates distress audio detection.
 * - DistressAudioDetectionInput - The input type for the detectDistressAudio function.
 * - DistressAudioDetectionOutput - The return type for the detectDistressAudio function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Input Schema for the distress audio detection flow.
const DistressAudioDetectionInputSchema = z.object({
  audioEventDescription: z
    .string()
    .describe('A description of the detected audio event, such as keywords spoken (e.g., "help", "bachao", "stop") or panic sounds (e.g., "scream", "shout").'),
});
export type DistressAudioDetectionInput = z.infer<typeof DistressAudioDetectionInputSchema>;

// Output Schema for the distress audio detection flow.
const DistressAudioDetectionOutputSchema = z.object({
  isDistressDetected: z
    .boolean()
    .describe('True if a distress keyword or panic sound was detected in the audio event description.'),
  detectedReason: z
    .string()
    .describe('A brief explanation of why distress was detected, or "No distress detected" if no distress was found.'),
});
export type DistressAudioDetectionOutput = z.infer<typeof DistressAudioDetectionOutputSchema>;

/**
 * Simulates distress audio detection by analyzing a textual description of an audio event.
 * This function wraps the Genkit flow for server-side execution.
 *
 * @param input - An object containing the audio event description.
 * @returns A promise that resolves to an object indicating if distress was detected and a reason.
 */
export async function detectDistressAudio(
  input: DistressAudioDetectionInput
): Promise<DistressAudioDetectionOutput> {
  return distressAudioDetectionFlow(input);
}

// Define the prompt for the distress audio detection.
const distressAudioDetectionPrompt = ai.definePrompt({
  name: 'distressAudioDetectionPrompt',
  input: { schema: DistressAudioDetectionInputSchema },
  output: { schema: DistressAudioDetectionOutputSchema },
  prompt: `You are an AI assistant tasked with detecting distress from audio event descriptions.
Analyze the following audio event description and determine if it indicates a distress situation.
Look for explicit distress keywords like "help", "bachao", "stop", or descriptions of panic sounds like "scream", "shout", or "cry for help".

Audio Event Description: {{{audioEventDescription}}}

Based on the description, set 'isDistressDetected' to true if distress is clearly indicated, otherwise set it to false.
Provide a concise reason in 'detectedReason'.`,
});

// Define the Genkit flow for distress audio detection.
const distressAudioDetectionFlow = ai.defineFlow(
  {
    name: 'distressAudioDetectionFlow',
    inputSchema: DistressAudioDetectionInputSchema,
    outputSchema: DistressAudioDetectionOutputSchema,
  },
  async (input) => {
    const { output } = await distressAudioDetectionPrompt(input);
    // The output from the prompt should directly match the DistressAudioDetectionOutputSchema.
    // We assert non-null as the prompt is designed to always return an output.
    return output!;
  }
);
