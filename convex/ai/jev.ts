// TypeSafe Jev: fast typed judgments (about 200 ms, about $0.00003 a call). Used for what a
// message means and how it feels; Gemini still writes every reply.
// Docs: https://docs.typesafe.ai/api.md. Plain fetch, because the SDK is untested in
// Convex's runtime. Every function returns null when Jev is off or fails, and callers fall
// back to the bot's older behaviour, so Jev can never block a reply.
//
// The step questions were tuned on 49 English and Taglish messages with jev-1.14.0 (all
// correct; the closest call was 0.88 vs 0.12), emotion and memory on 21 more (20 correct).
// Pin the model so a new Jev release can't move the thresholds.

import type { EmotionLabel } from "../validators";

const ENDPOINT = "https://api.typesafe.ai/v1/systemone";
const TIMEOUT_MS = 4000;

export function jevModel(): string {
  return process.env.TYPESAFE_MODEL || "jev-1.14.0";
}

type ChoiceAnswer = { type: "choice"; choice: string; confidence: number; probabilities: Record<string, number> };
type NoulAnswer = { type: "noul"; noul: number };
type Answers = Record<string, ChoiceAnswer | NoulAnswer>;

async function systemOne(state: unknown, questions: Record<string, unknown>): Promise<Answers | null> {
  const apiKey = process.env.TYPESAFE_API_KEY;
  if (!apiKey) return null;
  const body = JSON.stringify({ model: jevModel(), state, questions });
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (res.ok) return ((await res.json()) as { answers: Answers }).answers;
      const retryable = res.status === 429 || res.status === 529 || res.status >= 500;
      console.warn("Jev request failed", res.status, (await res.text().catch(() => "")).slice(0, 300));
      if (!retryable) return null;
    } catch (error) {
      console.warn("Jev request threw", error);
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  return null;
}

// Questions ------------------------------------------------------------------------

const EMOTION_QUESTION = {
  type: "choice",
  instructions:
    "Which emotional state comes through most strongly in `message`, written by someone asking a tarot reader for guidance?",
  criteria: {
    anxious: "Worried, nervous or afraid of what will happen.",
    sad: "Hurt, heartbroken, grieving, lonely or down.",
    neutral: "Calm or matter-of-fact: a plain question about their life or future with no strong feeling in the wording.",
    hopeful: "Optimistic, excited or looking forward to something.",
    angry: "Frustrated, resentful or upset at someone or something.",
    confused: "Says they are unsure what to think or do, or torn between options.",
  },
};

// One intent question per step of the conversation. Each lists only what makes sense at
// that step; convex/messenger.ts decides what each intent does there.

const ANY_LANGUAGE = " The message may be in English, Tagalog or Taglish.";
const ABOUT_ME = "They want to see their own profile, current plan or reading history.";
const UPGRADE = "They ask about the paid plans, prices, upgrading or paying.";

const STEPS = {
  /** No session: anything typed. */
  idle: {
    instructions:
      "A person typed `message` to a tarot reading chatbot on Facebook Messenger. They are not in the middle of a reading. What do they want right now?",
    criteria: {
      tarot_question:
        "They ask something they want the cards to answer, or describe a situation they want guidance on: love, an ex, work, money, family, school, exams, a decision, their future. Any language, including Tagalog and Taglish.",
      start_reading:
        "They want a reading but have not said what it should be about yet, e.g. 'start', 'read my cards', 'pa-reading po'.",
      about_me: ABOUT_ME,
      upgrade: "They ask about the paid plans, prices, upgrading or paying for the bot.",
      how_it_works: "They ask what the bot is, how it works, what it can do, or whether it is free.",
      greeting: "They only say hello, thanks or make small talk, with no question for the cards.",
      other: "Anything else: complaints, test messages or gibberish.",
    },
  },
  /** The bot asked for their birthdate. */
  birthdate: {
    instructions:
      "A tarot chatbot on Messenger asked the person for their birthdate (month and day) so it can use their sun sign. They replied with `message`. What did they do?" +
      ANY_LANGUAGE,
    criteria: {
      gives_birthdate:
        "They give a birthdate or a month and day, in any format, e.g. 'Oct 15', 'October 15th', '15/10', 'Oktubre 15'.",
      asks_why: "They ask why the bot needs their birthdate, or whether they can skip it, without giving one.",
      tarot_question: "Instead of a birthdate, they ask the question they want the cards to answer or describe their situation.",
      about_me: ABOUT_ME,
      upgrade: UPGRADE,
      wants_to_stop: "They want to stop or cancel, or say they don't want a reading now.",
      small_talk: "Only a greeting, thanks, 'ok', or a question about how the bot works, with no birthdate.",
    },
  },
  /** The bot asked what they want the cards to answer. */
  question: {
    instructions:
      "A tarot chatbot on Messenger just asked the person what question they want the cards to answer. They replied with `message`. What is `message`?" +
      ANY_LANGUAGE,
    criteria: {
      tarot_question:
        "A question for the cards or a description of a situation they want guidance on, however short: love, an ex, work, money, family, school, exams, a decision, their future, or a topic like 'career' or 'love life'.",
      about_me: ABOUT_ME,
      upgrade: UPGRADE,
      wants_to_stop: "They want to stop or cancel, or say they changed their mind about a reading.",
      small_talk:
        "Only a greeting, thanks, 'ok', 'start', 'hmm wait', or a question about how the bot works, with nothing for the cards to answer yet.",
    },
  },
  /** The 10-minute follow-up window after a reading. */
  followup: {
    instructions:
      "A person just got a tarot reading in Messenger about `reading_question` and has a few minutes to ask follow-up questions. Then they sent `message`. What is `message`?" +
      ANY_LANGUAGE,
    criteria: {
      followup_question:
        "A question, request or comment they want answered about the reading, its cards or their situation, including a related new angle.",
      thanks: "Only thanks, praise or an acknowledgement like 'ok' or 'got it', with nothing they want answered.",
      wants_to_end: "They say goodbye or that they are done, e.g. 'bye', 'that's all', 'tama na', 'end'.",
      wants_new_reading: "They ask for a new or another reading, or for new cards to be drawn.",
      about_me: ABOUT_ME,
      upgrade: UPGRADE,
    },
  },
} as const;

export type Step = keyof typeof STEPS;
export type StepIntent<S extends Step> = keyof (typeof STEPS)[S]["criteria"] & string;

// Results --------------------------------------------------------------------------

const EMOTION_LABELS: EmotionLabel[] = ["anxious", "sad", "neutral", "hopeful", "angry", "confused"];

export interface EmotionResult {
  label: EmotionLabel;
  scores: Record<EmotionLabel, number>; // percentages, summing to about 100
}

export function emotionFromAnswer(answer: ChoiceAnswer | NoulAnswer | undefined): EmotionResult | null {
  if (answer?.type !== "choice" || !EMOTION_LABELS.includes(answer.choice as EmotionLabel)) return null;
  const scores = Object.fromEntries(
    EMOTION_LABELS.map((label) => [label, Math.round((answer.probabilities[label] ?? 0) * 100)]),
  ) as Record<EmotionLabel, number>;
  return { label: answer.choice as EmotionLabel, scores };
}

export interface Intent<T extends string> {
  intent: T;
  probability: number;
}

function intentFromAnswer<T extends string>(
  answer: ChoiceAnswer | NoulAnswer | undefined,
  allowed: readonly T[],
): Intent<T> | null {
  if (answer?.type !== "choice" || !allowed.includes(answer.choice as T)) return null;
  return { intent: answer.choice as T, probability: answer.probabilities[answer.choice] ?? 0 };
}

/** True when Jev picked `intent` with at least `threshold` probability. */
export function isConfident<T extends string>(result: Intent<T> | null | undefined, intent: T, threshold: number): boolean {
  return result?.intent === intent && result.probability >= threshold;
}

// Calls ----------------------------------------------------------------------------

export async function readEmotion(message: string): Promise<EmotionResult | null> {
  const answers = await systemOne({ message }, { emotion: EMOTION_QUESTION });
  return emotionFromAnswer(answers?.emotion);
}

/**
 * What a typed message means at this step, and how it feels, in one request.
 * `readingQuestion` is the question of the reading the follow-up window belongs to.
 */
export async function readMessage<S extends Step>(
  step: S,
  message: string,
  readingQuestion?: string,
): Promise<{ intent: Intent<StepIntent<S>> | null; emotion: EmotionResult | null }> {
  const definition = STEPS[step];
  const state = step === "followup" ? { reading_question: readingQuestion || "general guidance", message } : { message };
  const answers = await systemOne(state, {
    intent: { type: "choice", instructions: definition.instructions, criteria: definition.criteria },
    emotion: EMOTION_QUESTION,
  });
  const allowed = Object.keys(definition.criteria) as Array<StepIntent<S>>;
  return { intent: intentFromAnswer(answers?.intent, allowed), emotion: emotionFromAnswer(answers?.emotion) };
}

/**
 * For each past reading, the probability that it is about the same situation, person
 * or goal as the new question. Null when Jev is unavailable.
 */
export async function rateRelatedReadings(
  question: string,
  pastReadings: Array<{ date: string; question: string; cards: string }>,
): Promise<number[] | null> {
  if (pastReadings.length === 0) return [];
  const questions = Object.fromEntries(
    pastReadings.map((_, i) => [
      `reading_${i}`,
      {
        type: "noul",
        instructions: `Is the past reading \`past_readings[${i}]\` about the same situation, person or goal as \`question\`, so it would help to mention it in the new reading?`,
      },
    ]),
  );
  const answers = await systemOne({ question, past_readings: pastReadings }, questions);
  if (!answers) return null;
  return pastReadings.map((_, i) => {
    const answer = answers[`reading_${i}`];
    return answer?.type === "noul" ? answer.noul : 0;
  });
}
