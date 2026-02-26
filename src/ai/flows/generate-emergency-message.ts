'use server';
/**
 * @fileOverview A Genkit flow for generating personalized and context-aware emergency messages.
 *
 * - generateEmergencyMessage - A function that crafts an emergency message based on distress detection.
 * - GenerateEmergencyMessageInput - The input type for the generateEmergencyMessage function.
 * - GenerateEmergencyMessageOutput - The return type for the generateEmergencyMessage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateEmergencyMessageInputSchema = z.object({
  locationLink: z
    .string()
    .url()
    .describe('The Google Maps link to the user\'s current live location.'),
  detectedKeywords: z
    .array(z.string())
    .describe('A list of distress keywords detected (e.g., "help", "stop").'),
  audioDescription: z
    .string()
    .optional()
    .describe('An optional description of the detected audio event (e.g., "scream detected").'),
});
export type GenerateEmergencyMessageInput = z.infer<
  typeof GenerateEmergencyMessageInputSchema
>;

const GenerateEmergencyMessageOutputSchema = z.object({
  message: z.string().describe('The personalized emergency message.'),
});
export type GenerateEmergencyMessageOutput = z.infer<
  typeof GenerateEmergencyMessageOutputSchema
>;

export async function generateEmergencyMessage(
  input: GenerateEmergencyMessageInput
): Promise<GenerateEmergencyMessageOutput> {
  return generateEmergencyMessageFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateEmergencyMessagePrompt',
  input: {schema: GenerateEmergencyMessageInputSchema},
  output: {schema: GenerateEmergencyMessageOutputSchema},
  prompt: `You are an AI assistant designed to generate concise and urgent emergency messages.

Craft a personalized emergency message for the user's emergency contacts. The message should be clear, actionable, and include the following details:

1.  A clear statement that the user is in distress and needs help immediately.
2.  The user's live location via the provided Google Maps link.
3.  Any detected distress keywords that provide context about the situation.
4.  Optionally, a description of any significant audio events detected.
5.  A direct call to action for the recipients.

Keep the message brief and to the point, suitable for an SMS or instant message.

Detected Keywords: {{#each detectedKeywords}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
{{#if audioDescription}}Audio Event: {{{audioDescription}}}{{/if}}
Location: {{{locationLink}}}
`,
});

const generateEmergencyMessageFlow = ai.defineFlow(
  {
    name: 'generateEmergencyMessageFlow',
    inputSchema: GenerateEmergencyMessageInputSchema,
    outputSchema: GenerateEmergencyMessageOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
