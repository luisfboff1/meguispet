import { ChatOpenAI } from '@langchain/openai'
import { ChatAnthropic } from '@langchain/anthropic'
import type { BaseChatModel } from '@langchain/core/language_models/chat_models'
import type { AgentProvider } from '@/types'

interface ProviderConfig {
  provider: AgentProvider
  model: string
  apiKey: string
  temperature: number
  maxTokens: number
  topP?: number
  frequencyPenalty?: number
  presencePenalty?: number
  streaming?: boolean
}

/**
 * Creates a LangChain chat model instance based on the provider configuration.
 * Supports OpenAI and Anthropic providers.
 */
export function createLLM(config: ProviderConfig): BaseChatModel {
  const {
    provider,
    model,
    apiKey,
    temperature,
    maxTokens,
    topP = 1.0,
    frequencyPenalty = 0,
    presencePenalty = 0,
    streaming = true,
  } = config

  switch (provider) {
    case 'openai':
      // GPT-5-nano only supports default temperature (1.0), no customization
      const isGpt5Nano = model === 'gpt-5-nano'
      return new ChatOpenAI({
        modelName: model,
        openAIApiKey: apiKey,
        configuration: {
          apiKey: apiKey,
        },
        // Don't send these params for gpt-5-nano (only supports defaults)
        ...(isGpt5Nano ? {} : {
          temperature,
          topP,
          frequencyPenalty,
          presencePenalty,
        }),
        maxTokens,
        streaming,
      })

    case 'anthropic':
      return new ChatAnthropic({
        modelName: model,
        anthropicApiKey: apiKey,
        clientOptions: {
          apiKey: apiKey,
        },
        temperature,
        maxTokens,
        topP,
        streaming,
      })

    default:
      throw new Error(`Unsupported provider: ${provider}`)
  }
}

/**
 * Returns the context window size for a given model.
 * Used to calculate context window usage percentage.
 */
export function getContextWindowSize(provider: AgentProvider, model: string): number {
  const contextWindows: Record<string, number> = {
    // OpenAI
    'gpt-5-nano': 400000, // Biggest context window!
    'gpt-4o': 128000,
    'gpt-4o-mini': 128000,
    'gpt-4.5-preview': 128000,
    // Anthropic
    'claude-sonnet-4-5-20250929': 200000,
    'claude-opus-4-20250514': 200000,
    'claude-haiku-4-5-20251001': 200000,
  }

  return contextWindows[model] || 128000
}
