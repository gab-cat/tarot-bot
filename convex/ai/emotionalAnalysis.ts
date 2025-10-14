import { action, type ActionCtx } from "../_generated/server";
import { v } from "convex/values";
import { GoogleGenAI } from "@google/genai";

/**
 * Types for emotion analysis
 */
export interface EmotionResult {
  label: "anxious" | "sad" | "neutral" | "hopeful" | "angry" | "confused";
  scores: Record<string, number>;
  rationale: string;
}

export interface EmotionAnalyzer {
  analyze(text: string, ctx: ActionCtx): Promise<EmotionResult>;
}

/**
 * Default implementation using Gemini 2.5 Flash Lite for emotion analysis.
 * Optimized for low latency and cost-efficiency.
 * See: https://ai.google.dev/gemini-api/docs/models/gemini#gemini-2.5-flash-lite
 */
export class GeminiEmotionAnalyzer implements EmotionAnalyzer {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async analyze(text: string, _: ActionCtx): Promise<EmotionResult> {
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      console.warn("GEMINI_API_KEY not found, returning neutral emotion");
      return this.getNeutralResult();
    }

    try {
      const ai = new GoogleGenAI({ apiKey: geminiApiKey });

      const prompt = `Analyze the emotional state expressed in this text and return ONLY a JSON response with exactly this format (no markdown, no code blocks, no explanation):

{
  "label": "anxious" | "sad" | "neutral" | "hopeful" | "angry" | "confused",
  "scores": {
    "anxious": number,
    "sad": number,
    "neutral": number,
    "hopeful": number,
    "angry": number,
    "confused": number
  },
  "rationale": "brief explanation"
}

Text to analyze: "${text}"

Choose the single most dominant emotion as the label. Scores should sum to approximately 100. Be precise and consider tarot/spiritual context. Return ONLY the JSON object, nothing else.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-lite",
        contents: prompt,
      });

      const rawText = response.text || "{}";

      // Handle Gemini responses that may include markdown code blocks
      let jsonText = rawText.trim();
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      const result = JSON.parse(jsonText) as Partial<EmotionResult>;

      // Validate and sanitize the response
      return this.validateAndSanitizeResult(result);
    } catch (error) {
      console.error("Error in emotion analysis:", error);
      return this.getNeutralResult();
    }
  }

  private validateAndSanitizeResult(result: Partial<EmotionResult>): EmotionResult {
    // Default to neutral if parsing fails
    const defaultResult: EmotionResult = this.getNeutralResult();

    // Validate label
    const validLabels = ["anxious", "sad", "neutral", "hopeful", "angry", "confused"] as const;
    const label = validLabels.includes(result.label as EmotionResult["label"]) ? result.label : "neutral";

    // Validate scores (ensure they're numbers and reasonable)
    const scores: Record<string, number> = { ...defaultResult.scores };
    if (result.scores && typeof result.scores === "object") {
      for (const emotion of validLabels) {
        const score = result.scores[emotion];
        if (typeof score === "number" && score >= 0 && score <= 100) {
          scores[emotion] = score;
        }
      }
    }

    // Normalize scores to sum to 100
    const total = Object.values(scores).reduce((sum, score) => sum + score, 0);
    if (total > 0) {
      for (const emotion of validLabels) {
        scores[emotion] = Math.round((scores[emotion] / total) * 100);
      }
    }

    return {
      label: label as EmotionResult["label"],
      scores,
      rationale: typeof result.rationale === "string" ? result.rationale : "Analysis based on text content",
    };
  }

  private getNeutralResult(): EmotionResult {
    return {
      label: "neutral",
      scores: {
        anxious: 10,
        sad: 10,
        neutral: 60,
        hopeful: 10,
        angry: 5,
        confused: 5,
      },
      rationale: "Default neutral emotion when analysis unavailable",
    };
  }
}

/**
 * Tone guidelines mapping emotions to conversational styles.
 * Used to adapt AI responses based on detected emotions.
 */
export function toneGuidelines(emotion: EmotionResult["label"]): string {
  const guidelines: Record<EmotionResult["label"], string> = {
    anxious: "Use calming, reassuring language. Be gentle and supportive. Avoid overwhelming with too much information. Focus on providing comfort and practical next steps.",
    sad: "Be empathetic and understanding. Use warm, compassionate language. Acknowledge their feelings. Offer hope and gentle encouragement without being overly cheerful.",
    neutral: "Use balanced, informative language. Be direct but friendly. Provide clear guidance without emotional overload.",
    hopeful: "Match their positive energy. Be enthusiastic and encouraging. Celebrate their optimism while providing grounded advice.",
    angry: "Be calm and understanding. Acknowledge their frustration. Use neutral, non-defensive language. Help them channel energy constructively.",
    confused: "Be patient and clear. Break down complex ideas simply. Provide structure and clarity. Reassure them that confusion is normal.",
  };

  return guidelines[emotion] || guidelines.neutral;
}

/**
 * Action wrapper for emotion analysis.
 * Can be called from other Convex functions.
 */
export const analyzeEmotion = action({
  args: {
    text: v.string(),
  },
  handler: async (ctx, args): Promise<EmotionResult> => {
    const analyzer = new GeminiEmotionAnalyzer();
    return await analyzer.analyze(args.text, ctx);
  },
});
