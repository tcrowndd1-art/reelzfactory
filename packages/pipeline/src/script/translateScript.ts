import OpenAI from 'openai';
import * as dotenv from 'dotenv';
import { TRANSLATE_SYSTEM_PROMPT, TRANSLATE_USER_PROMPT } from './prompts';
import type { ScriptOutput } from '../../../shared/src/types/production';

dotenv.config();

interface TranslateOptions {
  script: ScriptOutput;
  targetLanguage: string;
  apiKey?: string;
  model?: string;
}

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  ja: '日本語 (Japanese)',
  es: 'Español (Spanish)',
  pt: 'Português (Portuguese)',
  zh: '中文 (Chinese)',
  de: 'Deutsch (German)',
};

export async function translateScript(options: TranslateOptions): Promise<ScriptOutput> {
  const {
    script,
    targetLanguage,
    apiKey = process.env.OPENROUTER_API_KEY,
    model = 'deepseek/deepseek-chat-v3-0324',
  } = options;

  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is required');
  }

  const langName = LANGUAGE_NAMES[targetLanguage] || targetLanguage;

  const client = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: apiKey,
  });

  const response = await client.chat.completions.create({
    model: model,
    messages: [
      { role: 'system', content: TRANSLATE_SYSTEM_PROMPT },
      {
        role: 'user',
        content: TRANSLATE_USER_PROMPT(JSON.stringify(script, null, 2), langName),
      },
    ],
    max_tokens: 4096,
    temperature: 0.3,
  });

  const content = response.choices[0]?.message?.content;

  if (!content) {
    throw new Error('No response from translate model');
  }

  const jsonString = content
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();

  try {
    const translated: ScriptOutput = JSON.parse(jsonString);
    return translated;
  } catch (e) {
    throw new Error(`Failed to parse translated JSON: ${(e as Error).message}`);
  }
}
