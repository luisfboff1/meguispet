import type { AgentProvider } from "@/types";

/**
 * Legacy compatibility helpers.
 *
 * The chat route no longer uses LangChain model wrappers; it calls the OpenAI
 * Responses API directly. This file remains only for older imports that need
 * context-window metadata.
 */

export interface LLMConfig {
  provider: AgentProvider;
  model: string;
  apiKey: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  streaming?: boolean;
}

export function createLLM(): never {
  throw new Error(
    "createLLM foi removido. Use a OpenAI Responses API diretamente em pages/api/agente/chat.ts.",
  );
}

export function getContextWindowSize(
  provider: AgentProvider,
  model: string,
): number {
  const contextWindows: Record<string, number> = {
    "gpt-5.4-mini": 400000,
    "gpt-5.4-nano": 400000,
    "gpt-5-mini": 400000,
    "gpt-5-nano": 400000,
    "gpt-4o": 128000,
    "gpt-4o-mini": 128000,
    "gpt-4.5-preview": 128000,
    "claude-sonnet-4-5-20250929": 200000,
    "claude-opus-4-20250514": 200000,
    "claude-haiku-4-5-20251001": 200000,
  };

  return contextWindows[model] || (provider === "anthropic" ? 200000 : 128000);
}
