/**
 * ChatGPT Export Type Definitions
 * 
 * These types match the structure of OpenAI's ChatGPT data export format.
 */

// ============================================
// RAW CHATGPT EXPORT TYPES
// ============================================

export interface ChatGPTExport {
  conversations: ChatGPTConversation[];
}

export interface ChatGPTConversation {
  title: string;
  create_time: number | null;  // Unix timestamp (float)
  update_time: number | null;
  mapping: Record<string, ChatGPTNode>;
  moderation_results: unknown[];
  current_node: string;
  conversation_template_id?: string;
  id?: string;
}

export interface ChatGPTNode {
  id: string;
  message: ChatGPTMessageContent | null;
  parent: string | null;
  children: string[];
}

export interface ChatGPTMessageContent {
  id: string;
  author: {
    role: 'user' | 'assistant' | 'system' | 'tool';
    name?: string;
    metadata: Record<string, unknown>;
  };
  create_time: number | null;
  update_time?: number | null;
  content: ChatGPTContent;
  status: 'finished_successfully' | 'in_progress' | string;
  end_turn?: boolean;
  weight?: number;
  metadata: {
    model_slug?: string;
    finish_details?: Record<string, unknown>;
    is_visually_hidden_from_conversation?: boolean;
    message_type?: string;
    parent_id?: string;
  };
  recipient?: string;
}

export interface ChatGPTContent {
  content_type: 'text' | 'code' | 'execution_output' | 'tether_browsing_display' | 'tether_quote' | 'multimodal_text';
  parts?: (string | ChatGPTImagePart)[];
  language?: string;
  text?: string;
}

export interface ChatGPTImagePart {
  asset_pointer?: string;
  content_type?: string;
  width?: number;
  height?: number;
}

export interface ChatGPTFeedback {
  message_id: string;
  conversation_id: string;
  rating: 'thumbsUp' | 'thumbsDown';
  tags?: string[];
  text?: string;
  create_time: number;
}

// ============================================
// PROCESSED/INTERNAL TYPES
// ============================================

export interface LinearizedMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  text: string;
  timestamp: Date | null;
  model?: string;
  hasCode: boolean;
  contentType: string;
  parentId: string | null;
}

export interface ProcessedConversation {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messages: LinearizedMessage[];
  topics: string[];
  userMessageCount: number;
  totalMessageCount: number;
  summary?: string;
}

export interface ImportOptions {
  minMessages?: number;       // Min user messages to import (default: 2)
  since?: Date;               // Only import after this date
  skipEmbeddings?: boolean;   // Import without generating embeddings
  dryRun?: boolean;           // Preview only, don't persist
  batchSize?: number;         // Embedding batch size (default: 100)
  imagesOutputDir?: string;   // Directory to save extracted images (default: projects/chatgpt-wrapped/images/dalle)
  skipImages?: boolean;       // Skip image extraction
}

export interface ImportProgress {
  stage: 'extracting' | 'parsing' | 'filtering' | 'linearizing' | 'creating' | 'embedding' | 'extracting_insights' | 'saving_images' | 'persisting' | 'complete' | 'error';
  conversationsTotal: number;
  conversationsProcessed: number;
  conversationsSkipped: number;
  eventsCreated: number;
  memoriesQueued: number;
  imagesExtracted: number;
  currentConversation?: string;
  errors: string[];
  startedAt: Date;
  estimatedTimeRemaining?: number;
}

export interface ImportResult {
  success: boolean;
  conversationsImported: number;
  conversationsSkipped: number;
  eventsCreated: number;
  memoriesQueued: number;
  imagesExtracted: number;
  topicDistribution: Record<string, number>;
  dateRange: {
    earliest: Date;
    latest: Date;
  };
  errors: string[];
  durationMs: number;
}

// ============================================
// MEMORY EXTRACTION TYPES
// ============================================

export interface ExtractedPreference {
  category: 'technology' | 'communication' | 'work' | 'personal';
  key: string;
  value: string;
  confidence: number;
  sourceConversationId: string;
  sourceText: string;
}

export interface ExtractedDecision {
  summary: string;
  reasoning: string;
  alternatives: string[];
  confidence: number;
  sourceConversationId: string;
  timestamp: Date;
}

export interface ExtractedLearning {
  summary: string;
  context: string;
  confidence: number;
  sourceConversationId: string;
  timestamp: Date;
}

export interface ExtractedInsights {
  preferences: ExtractedPreference[];
  decisions: ExtractedDecision[];
  learnings: ExtractedLearning[];
}

// ============================================
// CODE EXTRACTION
// ============================================

export interface ExtractedCodeBlock {
  language: string;
  code: string;
  context: string;
  messageId: string;
  conversationId: string;
}

