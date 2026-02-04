/**
 * Multi-Model LLM Client
 * 
 * Unified interface for OpenAI and Anthropic models.
 * Automatically routes to the right provider based on model name.
 */

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

// ============================================
// TYPES
// ============================================

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface CompletionOptions {
  model: ModelName;
  messages: Message[];
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
}

export interface CompletionResult {
  content: string;
  model: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}

// ============================================
// SUPPORTED MODELS
// ============================================

export const MODELS = {
  // Anthropic - Claude
  'claude-3-5-sonnet': { provider: 'anthropic', id: 'claude-sonnet-4-20250514', tier: 'primary' },
  'claude-3-opus': { provider: 'anthropic', id: 'claude-3-opus-20240229', tier: 'premium' },
  'claude-3-haiku': { provider: 'anthropic', id: 'claude-3-haiku-20240307', tier: 'fast' },
  
  // OpenAI - GPT
  'gpt-4o': { provider: 'openai', id: 'gpt-4o', tier: 'primary' },
  'gpt-4o-mini': { provider: 'openai', id: 'gpt-4o-mini', tier: 'fast' },
  'gpt-4-turbo': { provider: 'openai', id: 'gpt-4-turbo', tier: 'primary' },
} as const;

export type ModelName = keyof typeof MODELS;
export type Provider = 'openai' | 'anthropic';

// ============================================
// MODEL CONFIGURATION
// ============================================

export interface ModelConfig {
  // Primary model for main chat/reasoning
  primary: ModelName;
  
  // Fast/cheap model for classification, tagging
  fast: ModelName;
  
  // Premium model for complex analysis (optional)
  premium?: ModelName;
  
  // Embedding model (OpenAI only for now)
  embedding: 'text-embedding-3-small' | 'text-embedding-3-large';
}

// Default configuration - can be overridden via environment
export function getModelConfig(): ModelConfig {
  return {
    primary: (process.env.LLM_PRIMARY as ModelName) || 'claude-3-5-sonnet',
    fast: (process.env.LLM_FAST as ModelName) || 'gpt-4o-mini',
    premium: (process.env.LLM_PREMIUM as ModelName) || 'claude-3-opus',
    embedding: 'text-embedding-3-small',
  };
}

// ============================================
// CLIENTS
// ============================================

let openaiClient: OpenAI | null = null;
let anthropicClient: Anthropic | null = null;

function getOpenAI(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is required for OpenAI models');
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

function getAnthropic(): Anthropic {
  if (!anthropicClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is required for Claude models');
    }
    anthropicClient = new Anthropic({ apiKey });
  }
  return anthropicClient;
}

// ============================================
// COMPLETION
// ============================================

export async function complete(options: CompletionOptions): Promise<CompletionResult> {
  const modelConfig = MODELS[options.model];
  if (!modelConfig) {
    throw new Error(`Unknown model: ${options.model}`);
  }
  
  if (modelConfig.provider === 'anthropic') {
    return completeWithAnthropic(options, modelConfig.id);
  } else {
    return completeWithOpenAI(options, modelConfig.id);
  }
}

async function completeWithOpenAI(
  options: CompletionOptions,
  modelId: string
): Promise<CompletionResult> {
  const client = getOpenAI();
  
  const response = await client.chat.completions.create({
    model: modelId,
    messages: options.messages.map(m => ({
      role: m.role,
      content: m.content,
    })),
    max_tokens: options.maxTokens ?? 1000,
    temperature: options.temperature ?? 0.7,
  });
  
  return {
    content: response.choices[0]?.message?.content || '',
    model: response.model,
    usage: {
      inputTokens: response.usage?.prompt_tokens || 0,
      outputTokens: response.usage?.completion_tokens || 0,
    },
  };
}

async function completeWithAnthropic(
  options: CompletionOptions,
  modelId: string
): Promise<CompletionResult> {
  const client = getAnthropic();
  
  // Anthropic handles system message separately
  const systemMessage = options.messages.find(m => m.role === 'system');
  const otherMessages = options.messages.filter(m => m.role !== 'system');
  
  const response = await client.messages.create({
    model: modelId,
    max_tokens: options.maxTokens ?? 1000,
    system: systemMessage?.content,
    messages: otherMessages.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
  });
  
  const textContent = response.content.find(c => c.type === 'text');
  
  return {
    content: textContent?.text || '',
    model: response.model,
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    },
  };
}

// ============================================
// CONVENIENCE METHODS
// ============================================

/**
 * Quick completion with the primary model.
 */
export async function ask(
  prompt: string,
  options?: Partial<CompletionOptions>
): Promise<string> {
  const config = getModelConfig();
  const result = await complete({
    model: options?.model ?? config.primary,
    messages: [{ role: 'user', content: prompt }],
    ...options,
  });
  return result.content;
}

/**
 * Quick completion with system context.
 */
export async function chat(
  system: string,
  userMessage: string,
  options?: Partial<CompletionOptions>
): Promise<string> {
  const config = getModelConfig();
  const result = await complete({
    model: options?.model ?? config.primary,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: userMessage },
    ],
    ...options,
  });
  return result.content;
}

/**
 * Classification/tagging with fast model.
 */
export async function classify(
  system: string,
  input: string
): Promise<string> {
  const config = getModelConfig();
  const result = await complete({
    model: config.fast,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: input },
    ],
    maxTokens: 100,
    temperature: 0.3,
  });
  return result.content;
}

// ============================================
// EXPORT FOR IMPORTER COMPATIBILITY
// ============================================

export const llmClient = {
  complete: async (params: {
    model: string;
    messages: Array<{ role: string; content: string }>;
    max_tokens: number;
    temperature?: number;
  }) => {
    // Map generic model names to our supported models
    let modelName: ModelName = 'gpt-4o-mini';
    if (params.model.includes('claude')) {
      modelName = 'claude-3-5-sonnet';
    } else if (params.model.includes('gpt-4o-mini')) {
      modelName = 'gpt-4o-mini';
    } else if (params.model.includes('gpt-4')) {
      modelName = 'gpt-4o';
    }
    
    const result = await complete({
      model: modelName,
      messages: params.messages as Message[],
      maxTokens: params.max_tokens,
      temperature: params.temperature,
    });
    
    return { content: result.content };
  },
};

