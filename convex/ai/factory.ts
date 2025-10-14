import { GeminiEmotionAnalyzer, type EmotionAnalyzer } from "./emotionalAnalysis";
import { GeminiInterpretationModel, type InterpretationModel } from "./interpretationModel";

/**
 * Factory functions for creating AI model instances.
 * Allows for environment-based model selection and testing.
 */

/**
 * Get the emotion analyzer instance.
 * Currently returns Gemini implementation, but can be extended for model selection.
 */
export function getEmotionAnalyzer(): EmotionAnalyzer {
  // Could read from env var to select different models
  const modelType = process.env.EMOTION_MODEL || "gemini";

  switch (modelType) {
    case "gemini":
    default:
      return new GeminiEmotionAnalyzer();
  }
}

/**
 * Get the interpretation model instance.
 * Currently returns Gemini implementation, but can be extended for model selection.
 */
export function getInterpretationModel(): InterpretationModel {
  // Could read from env var to select different models
  const modelType = process.env.INTERPRETATION_MODEL || "gemini";

  switch (modelType) {
    case "gemini":
    default:
      return new GeminiInterpretationModel();
  }
}

/**
 * Environment variable configuration for AI models.
 * Add these to your Convex environment variables:
 *
 * EMOTION_MODEL=gemini          # Default: gemini
 * INTERPRETATION_MODEL=gemini   # Default: gemini
 *
 * Future models can be added by extending the switch statements above.
 */
