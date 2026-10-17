// Groq model that answers /api/chat. Override with GROQ_CHAT_MODEL when Groq
// retires a model (llama-3.3-70b-versatile stopped working in Oct 2026).
// gpt-oss returns its reasoning separately, so textStream carries only the answer.
export const DEFAULT_CHAT_MODEL = "openai/gpt-oss-120b";

export const CHAT_MODEL = process.env.GROQ_CHAT_MODEL?.trim() || DEFAULT_CHAT_MODEL;
