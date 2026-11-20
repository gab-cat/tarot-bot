// The one Gemini client for this repo. Plain functions called from actions, so no
// runAction hop per AI call. Generation functions throw on failure so callers can
// tell the user and keep their reading or question unused.

import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { formatForMessenger } from "../lib/text";
import { manilaNow } from "../lib/time";
import type { CardInfo } from "../constants";
import { EMBEDDING_DIMENSIONS, EMBEDDING_MODEL, fastModel, readingModel } from "./models";
import {
  followupSystemPrompt,
  followupUserPrompt,
  profileDescriptionPrompt,
  readingSystemPrompt,
  readingUserPrompt,
} from "./prompts";

export class AiUnavailableError extends Error {}

let client: GoogleGenAI | null = null;

function gemini(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new AiUnavailableError("GEMINI_API_KEY is not set");
  // SDK 3.x defaults to the v1 API. Pin v1beta, which every model and tool we use is
  // documented against and which SDK 1.x used.
  client ??= new GoogleGenAI({ apiKey, apiVersion: "v1beta" });
  return client;
}

function requireText(text: string | undefined, what: string): string {
  const trimmed = text?.trim();
  if (!trimmed) throw new AiUnavailableError(`Gemini returned an empty ${what}`);
  return trimmed;
}

export async function generateReading(request: {
  question: string;
  cards: CardInfo[];
  userName?: string;
  userBirthdate?: string;
  emotionTone?: string;
  memoryContext?: string;
}): Promise<string> {
  const { date, time } = manilaNow();
  const response = await gemini().models.generateContent({
    model: readingModel(),
    contents: readingUserPrompt({
      question: request.question,
      cards: request.cards,
      userName: request.userName,
      memoryContext: request.memoryContext,
      today: date,
      time,
    }),
    config: {
      systemInstruction: readingSystemPrompt({
        userName: request.userName,
        birthdate: request.userBirthdate,
        today: date,
        emotionTone: request.emotionTone,
      }),
      tools: [{ googleSearch: {} }],
      httpOptions: { timeout: 120_000 },
      ...thinkingFor(readingModel(), "low"),
    },
  });
  return formatForMessenger(requireText(response.text, "reading"));
}

export async function generateFollowupAnswer(request: {
  question: string;
  cards: CardInfo[];
  reading: string;
  earlierAnswers: string[];
  userName?: string;
  emotionTone?: string;
}): Promise<string> {
  // Same model as the reading so the voice matches, but minimal thinking and no search.
  const model = readingModel();
  const response = await gemini().models.generateContent({
    model,
    contents: followupUserPrompt(request),
    config: {
      systemInstruction: followupSystemPrompt({ userName: request.userName, emotionTone: request.emotionTone }),
      maxOutputTokens: 2048,
      httpOptions: { timeout: 45_000 },
      ...thinkingFor(model, "minimal"),
    },
  });
  return formatForMessenger(requireText(response.text, "follow-up answer"));
}

export async function generateProfileDescription(request: {
  userName?: string;
  readings: Array<{ question?: string; cards: Array<{ name: string; reversed: boolean }>; interpretation: string }>;
}): Promise<string> {
  const response = await gemini().models.generateContent({
    model: fastModel(),
    contents: profileDescriptionPrompt(request),
    config: { maxOutputTokens: 300, httpOptions: { timeout: 30_000 }, ...thinkingFor(fastModel(), "minimal") },
  });
  return formatForMessenger(requireText(response.text, "profile description"));
}

type Thinking = "minimal" | "low" | "medium";

/**
 * Gemini 3+ take a thinking level, billed as output tokens. 2.5 models don't take one.
 * 3.8 Flash and Gemini 4 have no "minimal", so it becomes "low" there.
 */
export function thinkingFor(model: string, level: Thinking): { thinkingConfig?: { thinkingLevel: ThinkingLevel } } {
  if (!/^gemini-([3-9]|\d{2,})/.test(model)) return {};
  const noMinimal = model.startsWith("gemini-3.8") || /^gemini-([4-9]|\d{2,})/.test(model);
  const effective = level === "minimal" && noMinimal ? "low" : level;
  const levels = { minimal: ThinkingLevel.MINIMAL, low: ThinkingLevel.LOW, medium: ThinkingLevel.MEDIUM };
  return { thinkingConfig: { thinkingLevel: levels[effective] } };
}

// Embeddings ---------------------------------------------------------------------
// gemini-embedding-2 has no taskType parameter; Google asks for these text prefixes
// instead, and it renormalises vectors at reduced sizes itself.

export async function embedQuery(text: string): Promise<number[]> {
  return await embed(`task: search result | query: ${text}`);
}

export async function embedDocument(text: string): Promise<number[]> {
  return await embed(`title: none | text: ${text}`);
}

async function embed(text: string): Promise<number[]> {
  const result = await gemini().models.embedContent({
    model: EMBEDDING_MODEL,
    contents: text,
    config: { outputDimensionality: EMBEDDING_DIMENSIONS, httpOptions: { timeout: 15_000 } },
  });
  const values = result.embeddings?.[0]?.values;
  if (!values || values.length !== EMBEDDING_DIMENSIONS) {
    throw new AiUnavailableError(`Expected a ${EMBEDDING_DIMENSIONS}-dim embedding, got ${values?.length ?? 0}`);
  }
  return values;
}
