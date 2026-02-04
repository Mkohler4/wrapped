/**
 * ChatGPT Export Parser
 * 
 * Handles extraction and parsing of ChatGPT data export files.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import JSZip from 'jszip';
import {
  ChatGPTExport,
  ChatGPTConversation,
  ChatGPTNode,
  ChatGPTFeedback,
  LinearizedMessage,
  ProcessedConversation,
  ExtractedCodeBlock,
} from './types';

// ============================================
// ZIP EXTRACTION
// ============================================

export type ImageSource = 'uploaded' | 'generated';

export interface ExtractedImage {
  filename: string;
  data: Buffer;
  size: number;
  source: ImageSource;  // 'uploaded' = user input, 'generated' = DALL-E output
}

export interface ImageWithContext {
  filename: string;
  source: ImageSource;
  prompt: string;           // For generated: the prompt. For uploaded: context/question
  conversationTitle: string;
  conversationId: string;
  timestamp: number | null;
  relatedGeneratedImages?: string[]; // For uploaded images: generated images they inspired
  sourceUploadedImage?: string;      // For generated images: the uploaded image that inspired them
}

export interface ParsedExport {
  conversations: ChatGPTConversation[];
  feedback: ChatGPTFeedback[];
  images: ExtractedImage[];
  imageManifest: ImageWithContext[];
  exportDate: Date;
}

// For backwards compatibility
export type ImageWithPrompt = ImageWithContext;

export async function parseExportZip(zipPath: string): Promise<ParsedExport> {
  const zipData = await fs.readFile(zipPath);
  const zip = await JSZip.loadAsync(zipData);
  
  // Find conversations.json
  const conversationsFile = zip.file('conversations.json');
  if (!conversationsFile) {
    throw new Error('conversations.json not found in export ZIP');
  }
  
  const conversationsJson = await conversationsFile.async('string');
  const conversations: ChatGPTConversation[] = JSON.parse(conversationsJson);
  
  // Try to find feedback file (optional)
  let feedback: ChatGPTFeedback[] = [];
  const feedbackFile = zip.file('message_feedback.json');
  if (feedbackFile) {
    try {
      const feedbackJson = await feedbackFile.async('string');
      feedback = JSON.parse(feedbackJson);
    } catch {
      // Feedback is optional, continue without it
    }
  }
  
  const images: ExtractedImage[] = [];
  const imageExtensions = ['.webp', '.png', '.jpg', '.jpeg', '.gif'];
  
  // Extract DALL-E generated images from dalle-generations folder
  const dalleFolder = zip.folder('dalle-generations');
  if (dalleFolder) {
    const dalleFiles = Object.keys(zip.files).filter(
      name => name.startsWith('dalle-generations/') && 
              !name.endsWith('/') &&
              imageExtensions.some(ext => name.toLowerCase().endsWith(ext))
    );
    
    for (const imagePath of dalleFiles) {
      const file = zip.file(imagePath);
      if (file) {
        const data = await file.async('nodebuffer');
        const filename = path.basename(imagePath);
        images.push({
          filename,
          data,
          size: data.length,
          source: 'generated',
        });
      }
    }
  }
  
  // Extract user-uploaded images from root (files starting with 'file-')
  const uploadedFiles = Object.keys(zip.files).filter(
    name => !name.includes('/') &&  // Only root level
            name.startsWith('file-') &&
            imageExtensions.some(ext => name.toLowerCase().endsWith(ext))
  );
  
  for (const filename of uploadedFiles) {
    const file = zip.file(filename);
    if (file) {
      const data = await file.async('nodebuffer');
      images.push({
        filename,
        data,
        size: data.length,
        source: 'uploaded',
      });
    }
  }
  
  const generatedCount = images.filter(i => i.source === 'generated').length;
  const uploadedCount = images.filter(i => i.source === 'uploaded').length;
  console.log(`Extracted ${generatedCount} DALL-E generated images and ${uploadedCount} user-uploaded images`);
  
  // Link images to their context from conversations
  const imageManifest = linkImagesToContext(conversations, images);
  
  // Get export date from ZIP metadata or file dates
  const exportDate = new Date();
  
  return {
    conversations,
    feedback,
    images,
    imageManifest,
    exportDate,
  };
}

/**
 * Walk up the conversation tree to find the user's prompt that led to an image generation.
 */
function findUserPromptBefore(
  mapping: ChatGPTConversation['mapping'],
  messageId: string | null,
  maxDepth = 5
): { prompt: string; timestamp: number | null } | null {
  let currentId = messageId;
  let depth = 0;
  
  while (currentId && depth < maxDepth) {
    const node = mapping[currentId];
    if (!node) break;
    
    const msg = node.message;
    if (msg?.author?.role === 'user') {
      const content = msg.content;
      if (content?.parts) {
        for (const part of content.parts) {
          if (typeof part === 'string' && part.trim().length > 10) {
            return {
              prompt: part,
              timestamp: msg.create_time || null,
            };
          }
        }
      }
    }
    
    currentId = node.parent;
    depth++;
  }
  
  return null;
}

/**
 * Extract the original filename suffix from an export filename.
 * Export filenames are in format: file-XXXX-originalname.ext
 */
function extractOriginalFilename(exportFilename: string): string {
  const match = exportFilename.match(/^file-[A-Za-z0-9]+-(.+)$/);
  if (match) {
    return match[1].toLowerCase();
  }
  return exportFilename.toLowerCase();
}

interface AttachmentContext {
  originalName: string;
  context: string;
  title: string;
  convId: string;
  timestamp: number | null;
}

/**
 * Build a map from original attachment names to their conversation context.
 * The key is the original filename (lowercased) from message.metadata.attachments[].name
 */
function buildAttachmentContextMap(
  conversations: ChatGPTConversation[]
): Map<string, AttachmentContext> {
  const nameToContext = new Map<string, AttachmentContext>();
  
  for (const conv of conversations) {
    const title = conv.title || 'Untitled';
    const convId = conv.id || '';
    
    for (const node of Object.values(conv.mapping)) {
      const msg = node.message;
      if (!msg) continue;
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const metadata = msg.metadata as any;
      const attachments = metadata?.attachments as Array<{ name?: string }> | undefined;
      
      if (attachments && attachments.length > 0) {
        // Get text context from this message
        let textContext = '';
        const parts = msg.content?.parts || [];
        for (const part of parts) {
          if (typeof part === 'string' && part.length > 5) {
            textContext = part;
            break;
          }
        }
        
        for (const att of attachments) {
          const name = att.name;
          if (name) {
            const nameLower = name.toLowerCase();
            // Only store first occurrence (earliest context)
            if (!nameToContext.has(nameLower)) {
              nameToContext.set(nameLower, {
                originalName: name,
                context: textContext?.substring(0, 300) || title,
                title,
                convId,
                timestamp: msg.create_time || null,
              });
            }
          }
        }
      }
    }
  }
  
  return nameToContext;
}

/**
 * Link extracted images to their context from conversations.
 * Handles both user-uploaded images (inputs) and DALL-E generated images (outputs).
 * 
 * CONVERSATION TREE PAIR DETECTION:
 * For each DALL-E generated image, walk up the conversation tree to find
 * the user message with an attachment that prompted it. This traces the
 * actual input→output relationship in the data.
 */
function linkImagesToContext(
  conversations: ChatGPTConversation[],
  images: ExtractedImage[]
): ImageWithContext[] {
  const manifest: ImageWithContext[] = [];
  
  // Separate images by source
  const generatedImages = images.filter(i => i.source === 'generated');
  const uploadedImages = images.filter(i => i.source === 'uploaded');
  
  // Build attachment context map for uploaded images
  const attachmentContextMap = buildAttachmentContextMap(conversations);
  
  // Build a map from attachment ID to export filename
  // Attachment IDs look like "file-XXX" and export filenames are "file-XXX-originalname.ext"
  const attachmentIdToFilename = new Map<string, string>();
  for (const img of uploadedImages) {
    // Extract the attachment ID from filename: "file-XXX-something.ext" → "file-XXX"
    const match = img.filename.match(/^(file-[A-Za-z0-9]+)-/);
    if (match) {
      attachmentIdToFilename.set(match[1], img.filename);
    }
  }
  
  // Build a map from asset_pointer ID to export filename for generated images
  // Asset pointers look like "file-service://file-XXX" and filenames are "file-XXX-uuid.webp"
  const assetIdToFilename = new Map<string, string>();
  for (const img of generatedImages) {
    const match = img.filename.match(/^(file-[A-Za-z0-9]+)-/);
    if (match) {
      assetIdToFilename.set(match[1], img.filename);
    }
  }
  
  // Track pairs: uploaded filename → generated filenames
  const uploadToGeneratedMap = new Map<string, string[]>();
  const generatedToUploadMap = new Map<string, string>();
  
  // Generation info for manifest
  const generationInfo = new Map<string, {
    prompt: string;
    title: string;
    convId: string;
    timestamp: number | null;
  }>();
  
  // CONVERSATION TREE PAIR DETECTION:
  // For each DALL-E output, walk up the tree to find the user's uploaded image
  for (const conv of conversations) {
    const title = conv.title || 'Untitled';
    const convId = conv.id || '';
    const mapping = conv.mapping;
    
    for (const [nodeId, node] of Object.entries(mapping)) {
      const msg = node.message;
      if (!msg) continue;
      
      const content = msg.content;
      
      // Look for DALL-E image outputs (tool responses with image_asset_pointer)
      if (content?.content_type === 'multimodal_text' && content.parts) {
        for (const part of content.parts) {
          if (typeof part === 'object' && part.content_type === 'image_asset_pointer') {
            const assetPointer = part.asset_pointer || '';
            // Extract file ID from "file-service://file-XXX"
            const assetMatch = assetPointer.match(/file-service:\/\/(file-[A-Za-z0-9]+)/);
            if (!assetMatch) continue;
            
            const assetId = assetMatch[1];
            const generatedFilename = assetIdToFilename.get(assetId);
            if (!generatedFilename) continue;
            
            // Get the prompt from the user message
            const promptInfo = findUserPromptBefore(mapping, node.parent);
            generationInfo.set(generatedFilename, {
              prompt: promptInfo?.prompt || 'AI Generated Image',
              title,
              convId,
              timestamp: promptInfo?.timestamp || msg.create_time || null,
            });
            
            // WALK UP THE TREE to find the user message with attachments
            let currentId: string | null = node.parent;
            let depth = 0;
            const maxDepth = 20;
            
            while (currentId && depth < maxDepth) {
              const parentNode = mapping[currentId];
              if (!parentNode) break;
              
              const parentMsg = parentNode.message;
              if (parentMsg?.author?.role === 'user') {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const metadata = parentMsg.metadata as any;
                const attachments = metadata?.attachments as Array<{ id?: string; name?: string }> | undefined;
                
                if (attachments && attachments.length > 0) {
                  // Found the user message with attachments - these are the inputs!
                  for (const att of attachments) {
                    const attId = att.id;
                    if (attId) {
                      const uploadedFilename = attachmentIdToFilename.get(attId);
                      if (uploadedFilename) {
                        // Link this upload to this generated image
                        const existing = uploadToGeneratedMap.get(uploadedFilename) || [];
                        if (!existing.includes(generatedFilename)) {
                          existing.push(generatedFilename);
                          uploadToGeneratedMap.set(uploadedFilename, existing);
                        }
                        generatedToUploadMap.set(generatedFilename, uploadedFilename);
                        
                        console.log(`[TREE PAIR] ${title}: ${uploadedFilename.slice(0, 40)}... → ${generatedFilename.slice(0, 40)}...`);
                      }
                    }
                  }
                  break; // Found the input, stop walking up
                }
              }
              
              currentId = parentNode.parent;
              depth++;
            }
          }
        }
      }
    }
  }
  
  const pairCount = uploadToGeneratedMap.size;
  const totalOutputs = Array.from(uploadToGeneratedMap.values()).reduce((sum, arr) => sum + arr.length, 0);
  console.log(`[IMAGE PAIRS] Found ${pairCount} transformation chains with ${totalOutputs} total outputs using tree traversal`);
  
  // Create manifest entries for generated images
  for (const img of generatedImages) {
    const info = generationInfo.get(img.filename);
    manifest.push({
      filename: img.filename,
      source: 'generated',
      prompt: info?.prompt || 'AI Generated Image',
      conversationTitle: info?.title || 'Art Gallery',
      conversationId: info?.convId || '',
      timestamp: info?.timestamp || null,
      sourceUploadedImage: generatedToUploadMap.get(img.filename),
    });
  }
  
  // Create manifest entries for uploaded images
  for (const img of uploadedImages) {
    const originalName = extractOriginalFilename(img.filename);
    const ctx = attachmentContextMap.get(originalName);
    
    if (ctx) {
      manifest.push({
        filename: img.filename,
        source: 'uploaded',
        prompt: ctx.context,
        conversationTitle: ctx.title,
        conversationId: ctx.convId,
        timestamp: ctx.timestamp,
        relatedGeneratedImages: uploadToGeneratedMap.get(img.filename),
      });
    } else {
      // No context found - add with generic info
      manifest.push({
        filename: img.filename,
        source: 'uploaded',
        prompt: 'User uploaded image',
        conversationTitle: 'Uploads',
        conversationId: '',
        timestamp: null,
        relatedGeneratedImages: uploadToGeneratedMap.get(img.filename),
      });
    }
  }
  
  return manifest;
}

// Keep backwards compatible alias
const linkImagesToPrompts = linkImagesToContext;

export async function parseExportDirectory(dirPath: string): Promise<ParsedExport> {
  const conversationsPath = path.join(dirPath, 'conversations.json');
  const conversationsJson = await fs.readFile(conversationsPath, 'utf-8');
  const conversations: ChatGPTConversation[] = JSON.parse(conversationsJson);
  
  let feedback: ChatGPTFeedback[] = [];
  const feedbackPath = path.join(dirPath, 'message_feedback.json');
  try {
    const feedbackJson = await fs.readFile(feedbackPath, 'utf-8');
    feedback = JSON.parse(feedbackJson);
  } catch {
    // Feedback is optional
  }
  
  const images: ExtractedImage[] = [];
  const imageExtensions = ['.webp', '.png', '.jpg', '.jpeg', '.gif'];
  
  // Extract DALL-E generated images from dalle-generations folder
  const dallePath = path.join(dirPath, 'dalle-generations');
  try {
    const dalleFiles = await fs.readdir(dallePath);
    
    for (const filename of dalleFiles) {
      const ext = path.extname(filename).toLowerCase();
      if (imageExtensions.includes(ext)) {
        const filePath = path.join(dallePath, filename);
        const data = await fs.readFile(filePath);
        images.push({
          filename,
          data,
          size: data.length,
          source: 'generated',
        });
      }
    }
  } catch {
    // DALL-E folder doesn't exist - that's ok
  }
  
  // Extract user-uploaded images from root directory
  try {
    const rootFiles = await fs.readdir(dirPath);
    
    for (const filename of rootFiles) {
      const ext = path.extname(filename).toLowerCase();
      if (filename.startsWith('file-') && imageExtensions.includes(ext)) {
        const filePath = path.join(dirPath, filename);
        const data = await fs.readFile(filePath);
        images.push({
          filename,
          data,
          size: data.length,
          source: 'uploaded',
        });
      }
    }
  } catch {
    // Can't read root - that's ok
  }
  
  const generatedCount = images.filter(i => i.source === 'generated').length;
  const uploadedCount = images.filter(i => i.source === 'uploaded').length;
  console.log(`Found ${generatedCount} DALL-E generated and ${uploadedCount} user-uploaded images in export directory`);
  
  // Link images to context
  const imageManifest = linkImagesToContext(conversations, images);
  
  return {
    conversations,
    feedback,
    images,
    imageManifest,
    exportDate: new Date(),
  };
}

// ============================================
// CONVERSATION LINEARIZATION
// ============================================

/**
 * Convert tree structure to linear message array.
 * Follows the path from root to current_node (the conversation as user last saw it).
 */
export function linearizeConversation(conv: ChatGPTConversation): LinearizedMessage[] {
  const messages: LinearizedMessage[] = [];
  
  // Build the canonical path from current_node back to root
  const pathIds: string[] = [];
  let currentId: string | null = conv.current_node;
  
  while (currentId) {
    const node: ChatGPTNode | undefined = conv.mapping[currentId];
    if (!node) break;
    pathIds.unshift(currentId);
    currentId = node.parent;
  }
  
  // Convert nodes to messages
  for (const nodeId of pathIds) {
    const node = conv.mapping[nodeId];
    if (!node?.message) continue;
    
    const msg = node.message;
    
    // Skip hidden/system messages
    if (msg.metadata?.is_visually_hidden_from_conversation) continue;
    if (msg.author.role === 'system' && !msg.content?.parts?.length) continue;
    
    const text = extractText(node);
    if (!text.trim()) continue;
    
    messages.push({
      id: msg.id,
      role: msg.author.role,
      text,
      timestamp: msg.create_time ? new Date(msg.create_time * 1000) : null,
      model: msg.metadata?.model_slug,
      hasCode: hasCodeContent(node),
      contentType: msg.content?.content_type || 'text',
      parentId: node.parent,
    });
  }
  
  return messages;
}

/**
 * Extract text content from a message node.
 */
export function extractText(node: ChatGPTNode): string {
  const content = node.message?.content;
  if (!content) return '';
  
  // Handle different content types
  if (content.parts) {
    return content.parts
      .filter((part): part is string => typeof part === 'string')
      .join('\n');
  }
  
  if (content.text) {
    return content.text;
  }
  
  return '';
}

/**
 * Check if message contains code.
 */
function hasCodeContent(node: ChatGPTNode): boolean {
  const content = node.message?.content;
  if (!content) return false;
  
  // Direct code content type
  if (content.content_type === 'code') return true;
  
  // Check for code fences in text
  const text = extractText(node);
  return /```[\s\S]*?```/.test(text);
}

// ============================================
// CONVERSATION FILTERING
// ============================================

export interface FilterOptions {
  minUserMessages: number;
  since?: Date;
  excludeTitles?: string[];
}

export function shouldImportConversation(
  conv: ChatGPTConversation,
  options: FilterOptions
): { import: boolean; reason?: string } {
  // Count user messages
  const userMessageCount = Object.values(conv.mapping).filter(
    node => node.message?.author.role === 'user' && extractText(node).trim()
  ).length;
  
  if (userMessageCount < options.minUserMessages) {
    return { import: false, reason: `Only ${userMessageCount} user messages (min: ${options.minUserMessages})` };
  }
  
  // Check title exclusions
  const title = conv.title?.toLowerCase() || '';
  const excludedTitles = options.excludeTitles || ['new chat'];
  if (excludedTitles.some(ex => title === ex.toLowerCase()) && userMessageCount < 3) {
    return { import: false, reason: 'Default title with minimal content' };
  }
  
  // Check date filter
  if (options.since && conv.create_time) {
    const convDate = new Date(conv.create_time * 1000);
    if (convDate < options.since) {
      return { import: false, reason: `Before cutoff date (${options.since.toISOString()})` };
    }
  }
  
  // Check if conversation has any substance
  const allText = Object.values(conv.mapping)
    .filter(node => node.message?.author.role === 'user')
    .map(node => extractText(node))
    .join(' ');
  
  if (allText.length < 50) {
    return { import: false, reason: 'Insufficient content' };
  }
  
  return { import: true };
}

// ============================================
// TOPIC CLASSIFICATION
// ============================================

export const TOPIC_PATTERNS: Record<string, { keywords: string[]; weight: number }> = {
  coding: {
    keywords: ['code', 'function', 'error', 'debug', 'api', 'database', 'typescript', 'python', 'react', 'javascript', 'bug', 'implement', 'class', 'method', 'variable'],
    weight: 1.5,
  },
  writing: {
    keywords: ['write', 'draft', 'email', 'essay', 'article', 'blog', 'copy', 'rewrite', 'edit', 'proofread', 'tone', 'style'],
    weight: 1.2,
  },
  research: {
    keywords: ['explain', 'what is', 'how does', 'compare', 'difference', 'pros cons', 'versus', 'vs', 'overview', 'summary'],
    weight: 1.0,
  },
  brainstorm: {
    keywords: ['ideas', 'brainstorm', 'options', 'possibilities', 'what if', 'creative', 'suggest', 'alternatives'],
    weight: 1.0,
  },
  planning: {
    keywords: ['plan', 'schedule', 'organize', 'roadmap', 'strategy', 'goals', 'project', 'timeline', 'milestone', 'prioritize'],
    weight: 1.3,
  },
  personal: {
    keywords: ['i feel', 'my life', 'relationship', 'family', 'health', 'habit', 'advice', 'help me', 'stressed', 'worried'],
    weight: 1.4,
  },
  career: {
    keywords: ['job', 'interview', 'resume', 'career', 'salary', 'promotion', 'startup', 'business', 'entrepreneur', 'hire', 'company'],
    weight: 1.4,
  },
  learning: {
    keywords: ['learn', 'tutorial', 'course', 'understand', 'teach', 'beginner', 'example', 'practice', 'study'],
    weight: 1.1,
  },
};

export function classifyConversation(conv: ChatGPTConversation): string[] {
  const userText = Object.values(conv.mapping)
    .filter(node => node.message?.author.role === 'user')
    .map(node => extractText(node))
    .join(' ')
    .toLowerCase();
  
  const titleText = (conv.title || '').toLowerCase();
  const combinedText = `${titleText} ${userText}`;
  
  const scores: Record<string, number> = {};
  
  for (const [topic, config] of Object.entries(TOPIC_PATTERNS)) {
    const matches = config.keywords.filter(kw => combinedText.includes(kw)).length;
    if (matches >= 2) {
      scores[topic] = matches * config.weight;
    }
  }
  
  // Sort by score and return top topics
  const sortedTopics = Object.entries(scores)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([topic]) => topic);
  
  return sortedTopics.length > 0 ? sortedTopics : ['general'];
}

// ============================================
// CODE EXTRACTION
// ============================================

export function extractCodeBlocks(
  conv: ChatGPTConversation,
  conversationId: string
): ExtractedCodeBlock[] {
  const blocks: ExtractedCodeBlock[] = [];
  
  for (const node of Object.values(conv.mapping)) {
    if (!node.message) continue;
    
    const content = node.message.content;
    const messageId = node.message.id;
    
    // Direct code content type
    if (content?.content_type === 'code') {
      blocks.push({
        language: content.language || 'unknown',
        code: content.parts?.join('\n') || content.text || '',
        context: conv.title || '',
        messageId,
        conversationId,
      });
      continue;
    }
    
    // Extract from markdown code fences
    const text = extractText(node);
    const codeRegex = /```(\w+)?\n([\s\S]*?)```/g;
    
    let match;
    while ((match = codeRegex.exec(text)) !== null) {
      blocks.push({
        language: match[1] || 'unknown',
        code: match[2].trim(),
        context: text.slice(0, 200),
        messageId,
        conversationId,
      });
    }
  }
  
  return blocks;
}

// ============================================
// PROCESS CONVERSATION
// ============================================

export function processConversation(
  conv: ChatGPTConversation,
  filterOptions: FilterOptions
): ProcessedConversation | null {
  // Check if should import
  const filterResult = shouldImportConversation(conv, filterOptions);
  if (!filterResult.import) {
    return null;
  }
  
  // Linearize messages
  const messages = linearizeConversation(conv);
  
  // Generate conversation ID
  const id = conv.id || generateConversationId(conv);
  
  // Parse timestamps
  const createdAt = conv.create_time 
    ? new Date(conv.create_time * 1000) 
    : new Date();
  const updatedAt = conv.update_time 
    ? new Date(conv.update_time * 1000) 
    : createdAt;
  
  // Classify
  const topics = classifyConversation(conv);
  
  // Count messages
  const userMessageCount = messages.filter(m => m.role === 'user').length;
  
  return {
    id,
    title: conv.title || 'Untitled',
    createdAt,
    updatedAt,
    messages,
    topics,
    userMessageCount,
    totalMessageCount: messages.length,
  };
}

function generateConversationId(conv: ChatGPTConversation): string {
  const hash = simpleHash(`${conv.title}-${conv.create_time}`);
  return `chatgpt-${hash}`;
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

