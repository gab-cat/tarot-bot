import { afterEach, describe, expect, test } from "bun:test";
import { emotionFromAnswer, isConfident, rateRelatedReadings, readMessage } from "../convex/ai/jev";
import { ThinkingLevel } from "@google/genai";
import { thinkingFor } from "../convex/ai/gemini";

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
  delete process.env.TYPESAFE_API_KEY;
});

function mockFetch(responses: Array<{ status: number; body: unknown }>) {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    const next = responses[Math.min(calls.length - 1, responses.length - 1)];
    return new Response(JSON.stringify(next.body), { status: next.status });
  }) as typeof fetch;
  return calls;
}

const choice = (picked: string, probabilities: Record<string, number>) => ({
  type: "choice",
  choice: picked,
  confidence: 0.9,
  probabilities,
});

describe("Jev client", () => {
  test("without an API key it returns nothing and makes no request", async () => {
    const calls = mockFetch([{ status: 200, body: {} }]);
    expect(await readMessage("idle", "Will my ex come back?")).toEqual({ intent: null, emotion: null });
    expect(await rateRelatedReadings("q", [{ date: "Oct 3", question: "x", cards: "y" }])).toBeNull();
    expect(calls.length).toBe(0);
  });

  test("sends the message as state with intent and emotion questions, and reads the answers", async () => {
    process.env.TYPESAFE_API_KEY = "test-key";
    const calls = mockFetch([
      {
        status: 200,
        body: {
          answers: {
            intent: choice("tarot_question", { tarot_question: 0.97, start_reading: 0.02, other: 0.01 }),
            emotion: choice("anxious", { anxious: 0.8, sad: 0.1, neutral: 0.1 }),
          },
        },
      },
    ]);
    const result = await readMessage("idle", "Babalikan pa ba ako ng ex ko?");
    expect(result.intent).toEqual({ intent: "tarot_question", probability: 0.97 });
    expect(result.emotion?.label).toBe("anxious");
    expect(result.emotion?.scores.anxious).toBe(80);

    expect(calls[0].url).toBe("https://api.typesafe.ai/v1/systemone");
    expect((calls[0].init.headers as Record<string, string>).Authorization).toBe("Bearer test-key");
    const body = JSON.parse(calls[0].init.body as string);
    expect(body.model).toBe("jev-1.14.0");
    expect(body.state).toEqual({ message: "Babalikan pa ba ako ng ex ko?" });
    expect(Object.keys(body.questions).sort()).toEqual(["emotion", "intent"]);
  });

  test("retries once when Jev is overloaded", async () => {
    process.env.TYPESAFE_API_KEY = "test-key";
    const calls = mockFetch([
      { status: 529, body: { detail: "overloaded" } },
      { status: 200, body: { answers: { intent: choice("thanks", { thanks: 0.99 }) } } },
    ]);
    const result = await readMessage("followup", "salamat po", "Will my ex come back?");
    expect(calls.length).toBe(2);
    expect(result.intent?.intent).toBe("thanks");
    expect(JSON.parse(calls[1].init.body as string).state).toEqual({
      reading_question: "Will my ex come back?",
      message: "salamat po",
    });
  });

  test("does not retry a bad key", async () => {
    process.env.TYPESAFE_API_KEY = "bad";
    const calls = mockFetch([{ status: 401, body: { detail: "invalid key" } }]);
    expect((await readMessage("idle", "hi")).intent).toBeNull();
    expect(calls.length).toBe(1);
  });

  test("rates each past reading", async () => {
    process.env.TYPESAFE_API_KEY = "test-key";
    mockFetch([
      { status: 200, body: { answers: { reading_0: { type: "noul", noul: 0.89 }, reading_1: { type: "noul", noul: 0.07 } } } },
    ]);
    const past = [
      { date: "Oct 3", question: "Will Mark come back?", cards: "The Tower" },
      { date: "Oct 20", question: "Should I take the job?", cards: "The Chariot" },
    ];
    expect(await rateRelatedReadings("Does Mark still think about me?", past)).toEqual([0.89, 0.07]);
  });
});

test("ignores an intent that doesn't belong to the step", async () => {
  process.env.TYPESAFE_API_KEY = "test-key";
  mockFetch([{ status: 200, body: { answers: { intent: choice("followup_question", { followup_question: 1 }) } } }]);
  expect((await readMessage("birthdate", "hmm")).intent).toBeNull();
});

test("each step sends only its own options", async () => {
  process.env.TYPESAFE_API_KEY = "test-key";
  const calls = mockFetch([{ status: 200, body: { answers: {} } }]);
  await readMessage("birthdate", "October 15th");
  const options = Object.keys(JSON.parse(calls[0].init.body as string).questions.intent.criteria);
  expect(options).toEqual([
    "gives_birthdate",
    "asks_why",
    "tarot_question",
    "about_me",
    "upgrade",
    "wants_to_stop",
    "small_talk",
  ]);
});

describe("answer helpers", () => {
  test("emotion probabilities become percentages", () => {
    const emotion = emotionFromAnswer(choice("sad", { anxious: 0.1, sad: 0.85, neutral: 0.05 }) as never);
    expect(emotion).toEqual({ label: "sad", scores: { anxious: 10, sad: 85, neutral: 5, hopeful: 0, angry: 0, confused: 0 } });
    expect(emotionFromAnswer(choice("ecstatic", { ecstatic: 1 }) as never)).toBeNull();
    expect(emotionFromAnswer(undefined)).toBeNull();
  });

  test("isConfident needs the right intent and enough probability", () => {
    expect(isConfident({ intent: "greeting", probability: 0.9 }, "greeting", 0.8)).toBe(true);
    expect(isConfident({ intent: "greeting", probability: 0.7 }, "greeting", 0.8)).toBe(false);
    expect(isConfident({ intent: "other", probability: 0.99 }, "greeting", 0.8)).toBe(false);
    expect(isConfident(null, "greeting", 0.1)).toBe(false);
  });
});

describe("thinkingFor", () => {
  test("uses the requested level on Gemini 3 Flash-Lite", () => {
    expect(thinkingFor("gemini-3.5-flash-lite", "minimal").thinkingConfig?.thinkingLevel).toBe(ThinkingLevel.MINIMAL);
    expect(thinkingFor("gemini-3.5-flash-lite", "low").thinkingConfig?.thinkingLevel).toBe(ThinkingLevel.LOW);
  });
  test("raises minimal to low where it isn't supported", () => {
    expect(thinkingFor("gemini-3.8-flash", "minimal").thinkingConfig?.thinkingLevel).toBe(ThinkingLevel.LOW);
    expect(thinkingFor("gemini-4-hydrogen", "minimal").thinkingConfig?.thinkingLevel).toBe(ThinkingLevel.LOW);
  });
  test("sends no thinking level to 2.5 models", () => {
    expect(thinkingFor("gemini-2.5-flash-lite", "low")).toEqual({});
  });
});
