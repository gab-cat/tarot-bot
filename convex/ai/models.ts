// Model ids and embedding size. No SDK import here, so the schema can read
// EMBEDDING_DIMENSIONS without bundling the Gemini client.
//
// Nov 2026: gemini-2.5-pro and gemini-2.5-flash shut down on the Gemini API on
// 2026-12-01. gemini-3.5-flash-lite is Google's "lowest-cost general model" ($0.30 input,
// $2.50 output per 1M tokens) and supports Google Search grounding. gemini-3.8-flash and
// gemini-3.6-flash cost $0.75 / $3.75, rising to $1.50 / $7.50 on 2027-01-01. If reading
// quality falls short, set GEMINI_READING_MODEL=gemini-3.8-flash (or gemini-4-hydrogen) in
// the Convex dashboard; no deploy needed. gemini-embedding-001 shuts down 2028-05-14;
// gemini-embedding-2 replaces it. Check https://ai.google.dev/gemini-api/docs/deprecations
// before changing these.

/** Writes the three-card reading and follow-up answers. */
export function readingModel(): string {
  return process.env.GEMINI_READING_MODEL || "gemini-3.5-flash-lite";
}

/** The "About me" profile blurb. Emotion and intent are read by Jev (convex/ai/jev.ts). */
export function fastModel(): string {
  return process.env.GEMINI_FAST_MODEL || "gemini-3.5-flash-lite";
}

export const EMBEDDING_MODEL = "gemini-embedding-2";

/** Must match the `readingEmbeddings.by_embedding` vector index in `convex/schema.ts`. */
export const EMBEDDING_DIMENSIONS = 1536;
