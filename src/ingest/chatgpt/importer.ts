/**
 * ChatGPT Import Pipeline
 * 
 * Main orchestrator for importing ChatGPT export data.
 */

import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
  ImportOptions,
  ImportProgress,
  ImportResult,
  ProcessedConversation,
  ExtractedInsights,
  LinearizedMessage,
} from './types';
import {
  parseExportZip,
  parseExportDirectory,
  processConversation,
  FilterOptions,
  ExtractedImage,
  ImageWithPrompt,
} from './parser';
import {
  extractInsightsFromPatterns,
  extractInsightsWithLLM,
  analyzeStyle,
  LLMClient,
} from './insights';

// ============================================
// DATABASE INTERFACE
// ============================================

export interface DatabaseClient {
  // Threads
  createThread(thread: ThreadInsert): Promise<string>;
  
  // Events
  createEvents(events: EventInsert[]): Promise<string[]>;
  
  // Memory
  queueMemory(memory: MemoryQueueInsert): Promise<string>;
  
  // Transaction helpers
  transaction<T>(fn: () => Promise<T>): Promise<T>;
}

export interface ThreadInsert {
  userId: string;
  source: 'chatgpt';
  sourceThreadId: string;
  subject: string;
  firstEventAt: Date;
  lastEventAt: Date;
  eventCount: number;
}

export interface EventInsert {
  userId: string;
  source: 'chatgpt';
  sourceId: string;
  timestamp: Date;
  text: string;
  threadId: string;
  parentId?: string;
  topicTags: string[];
  importance: number;
  metadata: Record<string, unknown>;
  embedding?: number[];
}

export interface MemoryQueueInsert {
  userId: string;
  memoryType: 'profile' | 'episodic';
  proposedData: Record<string, unknown>;
  sourceEventId?: string;
  reason: string;
}

// ============================================
// EMBEDDING INTERFACE
// ============================================

export interface EmbeddingClient {
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
}

// ============================================
// IMPORTER CLASS
// ============================================

export class ChatGPTImporter extends EventEmitter {
  private db: DatabaseClient;
  private embedder: EmbeddingClient;
  private llm?: LLMClient;
  private userId: string;
  
  constructor(params: {
    db: DatabaseClient;
    embedder: EmbeddingClient;
    llm?: LLMClient;
    userId: string;
  }) {
    super();
    this.db = params.db;
    this.embedder = params.embedder;
    this.llm = params.llm;
    this.userId = params.userId;
  }
  
  async import(
    sourcePath: string,
    options: ImportOptions = {}
  ): Promise<ImportResult> {
    const startTime = Date.now();
    const opts = {
      minMessages: options.minMessages ?? 2,
      since: options.since,
      skipEmbeddings: options.skipEmbeddings ?? false,
      dryRun: options.dryRun ?? false,
      batchSize: options.batchSize ?? 100,
    };
    
    const progress: ImportProgress = {
      stage: 'extracting',
      conversationsTotal: 0,
      conversationsProcessed: 0,
      conversationsSkipped: 0,
      eventsCreated: 0,
      memoriesQueued: 0,
      imagesExtracted: 0,
      errors: [],
      startedAt: new Date(),
    };
    
    this.emit('progress', progress);
    
    try {
      // Stage 1: Parse export
      progress.stage = 'parsing';
      this.emit('progress', progress);
      
      const isZip = sourcePath.endsWith('.zip');
      const parsed = isZip 
        ? await parseExportZip(sourcePath)
        : await parseExportDirectory(sourcePath);
      
      progress.conversationsTotal = parsed.conversations.length;
      this.emit('progress', progress);
      
      // Stage 1.5: Save images (if any)
      if (!options.skipImages && parsed.images && parsed.images.length > 0) {
        progress.stage = 'saving_images';
        this.emit('progress', progress);
        
        const imagesDir = options.imagesOutputDir || 
          path.join(process.cwd(), 'projects', 'chatgpt-wrapped', 'images');
        
        const savedCount = await this.saveImages(
          parsed.images, 
          parsed.imageManifest, 
          imagesDir
        );
        progress.imagesExtracted = savedCount;
        this.emit('progress', progress);
      }
      
      // Stage 2: Filter and process conversations
      progress.stage = 'filtering';
      this.emit('progress', progress);
      
      const filterOptions: FilterOptions = {
        minUserMessages: opts.minMessages,
        since: opts.since,
      };
      
      const processedConversations: ProcessedConversation[] = [];
      
      for (const conv of parsed.conversations) {
        const processed = processConversation(conv, filterOptions);
        if (processed) {
          processedConversations.push(processed);
        } else {
          progress.conversationsSkipped++;
        }
        progress.conversationsProcessed++;
        
        if (progress.conversationsProcessed % 50 === 0) {
          this.emit('progress', progress);
        }
      }
      
      console.log(`Filtered: ${processedConversations.length} conversations to import (${progress.conversationsSkipped} skipped)`);
      
      // Stage 3: Generate embeddings
      if (!opts.skipEmbeddings) {
        progress.stage = 'embedding';
        this.emit('progress', progress);
        
        await this.generateEmbeddings(processedConversations, opts.batchSize, progress);
      }
      
      // Stage 4: Extract insights
      progress.stage = 'extracting_insights';
      this.emit('progress', progress);
      
      const allInsights = await this.extractAllInsights(processedConversations, progress);
      
      // Stage 5: Analyze style
      const styleSignals = analyzeStyle(processedConversations);
      console.log('Style signals:', styleSignals);
      
      // Stage 6: Persist (if not dry run)
      if (!opts.dryRun) {
        progress.stage = 'persisting';
        this.emit('progress', progress);
        
        await this.persist(processedConversations, allInsights, progress);
      }
      
      // Complete
      progress.stage = 'complete';
      this.emit('progress', progress);
      
      // Build result
      const result: ImportResult = {
        success: true,
        conversationsImported: processedConversations.length,
        conversationsSkipped: progress.conversationsSkipped,
        eventsCreated: progress.eventsCreated,
        memoriesQueued: progress.memoriesQueued,
        imagesExtracted: progress.imagesExtracted,
        topicDistribution: this.calculateTopicDistribution(processedConversations),
        dateRange: this.calculateDateRange(processedConversations),
        errors: progress.errors,
        durationMs: Date.now() - startTime,
      };
      
      this.emit('complete', result);
      return result;
      
    } catch (error) {
      progress.stage = 'error';
      progress.errors.push(error instanceof Error ? error.message : String(error));
      this.emit('progress', progress);
      this.emit('error', error);
      
      return {
        success: false,
        conversationsImported: 0,
        conversationsSkipped: progress.conversationsSkipped,
        eventsCreated: progress.eventsCreated,
        memoriesQueued: progress.memoriesQueued,
        imagesExtracted: progress.imagesExtracted,
        topicDistribution: {},
        dateRange: { earliest: new Date(), latest: new Date() },
        errors: progress.errors,
        durationMs: Date.now() - startTime,
      };
    }
  }
  
  // ============================================
  // EMBEDDING GENERATION
  // ============================================
  
  private async generateEmbeddings(
    conversations: ProcessedConversation[],
    batchSize: number,
    progress: ImportProgress
  ): Promise<void> {
    // Collect all user messages to embed
    const messagesToEmbed: Array<{ convIndex: number; msgIndex: number; text: string }> = [];
    
    for (let i = 0; i < conversations.length; i++) {
      const conv = conversations[i];
      for (let j = 0; j < conv.messages.length; j++) {
        const msg = conv.messages[j];
        // Only embed user messages (assistant messages are for context)
        if (msg.role === 'user' && msg.text.length > 10) {
          messagesToEmbed.push({
            convIndex: i,
            msgIndex: j,
            text: this.prepareTextForEmbedding(msg.text),
          });
        }
      }
    }
    
    console.log(`Generating embeddings for ${messagesToEmbed.length} messages...`);
    
    // Process in batches
    for (let i = 0; i < messagesToEmbed.length; i += batchSize) {
      const batch = messagesToEmbed.slice(i, i + batchSize);
      const texts = batch.map(m => m.text);
      
      try {
        const embeddings = await this.embedder.embedBatch(texts);
        
        // Store embeddings back on messages
        for (let j = 0; j < batch.length; j++) {
          const { convIndex, msgIndex } = batch[j];
          (conversations[convIndex].messages[msgIndex] as any).embedding = embeddings[j];
        }
      } catch (error) {
        console.error(`Embedding batch ${i / batchSize} failed:`, error);
        progress.errors.push(`Embedding batch failed: ${error}`);
      }
      
      // Progress update
      if ((i / batchSize) % 10 === 0) {
        console.log(`Embedded ${Math.min(i + batchSize, messagesToEmbed.length)}/${messagesToEmbed.length} messages`);
        this.emit('progress', progress);
      }
      
      // Rate limiting
      await this.sleep(100);
    }
  }
  
  private prepareTextForEmbedding(text: string): string {
    // Truncate very long messages
    const maxLength = 8000;
    let prepared = text.slice(0, maxLength);
    
    // Remove excessive whitespace
    prepared = prepared.replace(/\s+/g, ' ').trim();
    
    return prepared;
  }
  
  // ============================================
  // INSIGHT EXTRACTION
  // ============================================
  
  private async extractAllInsights(
    conversations: ProcessedConversation[],
    progress: ImportProgress
  ): Promise<ExtractedInsights> {
    const allInsights: ExtractedInsights = {
      preferences: [],
      decisions: [],
      learnings: [],
    };
    
    // For high-value conversations, use LLM if available
    const highValueConvs = conversations
      .filter(c => c.userMessageCount >= 5 && c.topics.some(t => ['personal', 'career', 'planning'].includes(t)))
      .slice(0, 20); // Limit LLM calls
    
    for (const conv of conversations) {
      let insights: ExtractedInsights;
      
      if (this.llm && highValueConvs.includes(conv)) {
        insights = await extractInsightsWithLLM(conv, this.llm);
      } else {
        insights = extractInsightsFromPatterns(conv);
      }
      
      allInsights.preferences.push(...insights.preferences);
      allInsights.decisions.push(...insights.decisions);
      allInsights.learnings.push(...insights.learnings);
    }
    
    console.log(`Extracted: ${allInsights.preferences.length} preferences, ${allInsights.decisions.length} decisions, ${allInsights.learnings.length} learnings`);
    
    return allInsights;
  }
  
  // ============================================
  // PERSISTENCE
  // ============================================
  
  private async persist(
    conversations: ProcessedConversation[],
    insights: ExtractedInsights,
    progress: ImportProgress
  ): Promise<void> {
    console.log(`Persisting ${conversations.length} conversations...`);
    
    for (const conv of conversations) {
      try {
        await this.db.transaction(async () => {
          // Create thread
          const threadId = await this.db.createThread({
            userId: this.userId,
            source: 'chatgpt',
            sourceThreadId: conv.id,
            subject: conv.title,
            firstEventAt: conv.createdAt,
            lastEventAt: conv.updatedAt,
            eventCount: conv.messages.length,
          });
          
          // Create events for messages
          const events: EventInsert[] = conv.messages.map((msg, index) => ({
            userId: this.userId,
            source: 'chatgpt',
            sourceId: msg.id,
            timestamp: msg.timestamp || conv.createdAt,
            text: msg.text,
            threadId,
            parentId: undefined, // Could link to parent message if needed
            topicTags: index === 0 ? conv.topics : [], // Tags on first message
            importance: msg.role === 'user' ? 3 : 2,
            metadata: {
              role: msg.role,
              model: msg.model,
              hasCode: msg.hasCode,
              contentType: msg.contentType,
            },
            embedding: (msg as any).embedding,
          }));
          
          await this.db.createEvents(events);
          progress.eventsCreated += events.length;
        });
        
        progress.currentConversation = conv.title;
        this.emit('progress', progress);
        
      } catch (error) {
        console.error(`Failed to persist conversation "${conv.title}":`, error);
        progress.errors.push(`Failed: ${conv.title}`);
      }
    }
    
    // Queue memory candidates for review
    await this.queueMemories(insights, progress);
  }
  
  private async queueMemories(
    insights: ExtractedInsights,
    progress: ImportProgress
  ): Promise<void> {
    // Queue preferences
    for (const pref of insights.preferences.filter(p => p.confidence >= 0.7)) {
      try {
        await this.db.queueMemory({
          userId: this.userId,
          memoryType: 'profile',
          proposedData: {
            category: pref.category,
            key: pref.key,
            value: pref.value,
          },
          reason: `Extracted from ChatGPT conversation: "${pref.sourceText?.slice(0, 100)}"`,
        });
        progress.memoriesQueued++;
      } catch (error) {
        // Non-fatal, continue
      }
    }
    
    // Queue decisions and learnings
    for (const decision of insights.decisions.filter(d => d.confidence >= 0.7)) {
      try {
        await this.db.queueMemory({
          userId: this.userId,
          memoryType: 'episodic',
          proposedData: {
            type: 'decision',
            summary: decision.summary,
            reasoning: decision.reasoning,
            timestamp: decision.timestamp,
          },
          reason: 'Extracted from ChatGPT conversation',
        });
        progress.memoriesQueued++;
      } catch (error) {
        // Non-fatal
      }
    }
    
    for (const learning of insights.learnings.filter(l => l.confidence >= 0.7)) {
      try {
        await this.db.queueMemory({
          userId: this.userId,
          memoryType: 'episodic',
          proposedData: {
            type: 'learning',
            summary: learning.summary,
            context: learning.context,
            timestamp: learning.timestamp,
          },
          reason: 'Extracted from ChatGPT conversation',
        });
        progress.memoriesQueued++;
      } catch (error) {
        // Non-fatal
      }
    }
  }
  
  // ============================================
  // HELPERS
  // ============================================
  
  private calculateTopicDistribution(convs: ProcessedConversation[]): Record<string, number> {
    const dist: Record<string, number> = {};
    
    for (const conv of convs) {
      for (const topic of conv.topics) {
        dist[topic] = (dist[topic] || 0) + 1;
      }
    }
    
    return dist;
  }
  
  private calculateDateRange(convs: ProcessedConversation[]): { earliest: Date; latest: Date } {
    if (convs.length === 0) {
      return { earliest: new Date(), latest: new Date() };
    }
    
    const dates = convs.map(c => c.createdAt.getTime());
    return {
      earliest: new Date(Math.min(...dates)),
      latest: new Date(Math.max(...dates)),
    };
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // ============================================
  // IMAGE SAVING
  // ============================================
  
  private async saveImages(
    images: ExtractedImage[],
    manifest: ImageWithPrompt[],
    outputDir: string
  ): Promise<number> {
    // Create output directories for both types
    const dalleDir = path.join(outputDir, 'dalle');
    const uploadsDir = path.join(outputDir, 'uploads');
    await fs.mkdir(dalleDir, { recursive: true });
    await fs.mkdir(uploadsDir, { recursive: true });
    
    // Save each image to appropriate folder
    let savedCount = 0;
    for (const image of images) {
      try {
        const targetDir = image.source === 'generated' ? dalleDir : uploadsDir;
        const outputPath = path.join(targetDir, image.filename);
        await fs.writeFile(outputPath, image.data);
        savedCount++;
      } catch (error) {
        console.warn(`Failed to save image ${image.filename}:`, error);
      }
    }
    
    // Save the manifest as JSON with both types and pair relationships
    const manifestPath = path.join(outputDir, 'gallery-manifest.json');
    const manifestData = manifest.map((m, idx) => ({
      id: idx,
      filename: m.filename,
      source: m.source,
      imagePath: m.source === 'generated' 
        ? `/wrapped/images/dalle/${m.filename}`
        : `/wrapped/images/uploads/${m.filename}`,
      prompt: m.prompt,
      title: m.conversationTitle,
      conversationId: m.conversationId,
      timestamp: m.timestamp,
      // Image pair relationships (Input → Output transformations)
      relatedGeneratedImages: m.relatedGeneratedImages,  // For uploaded: what generated images did it inspire?
      sourceUploadedImage: m.sourceUploadedImage,        // For generated: what uploaded image was it based on?
    }));
    
    await fs.writeFile(manifestPath, JSON.stringify(manifestData, null, 2));
    
    const generatedCount = images.filter(i => i.source === 'generated').length;
    const uploadedCount = images.filter(i => i.source === 'uploaded').length;
    console.log(`Saved ${generatedCount} generated + ${uploadedCount} uploaded images to ${outputDir}`);
    console.log(`Saved image manifest to ${manifestPath}`);
    
    return savedCount;
  }
}

// ============================================
// CLI ENTRY POINT
// ============================================

export async function runImportCLI(args: string[]): Promise<void> {
  // Parse args
  const sourcePath = args[0];
  if (!sourcePath) {
    console.error('Usage: pnpm run import:chatgpt <path-to-export.zip> [options]');
    console.error('Options:');
    console.error('  --dry-run           Preview without persisting');
    console.error('  --skip-embeddings   Skip embedding generation');
    console.error('  --min-messages N    Min user messages (default: 2)');
    console.error('  --since YYYY-MM-DD  Only import after date');
    process.exit(1);
  }
  
  const options: ImportOptions = {
    dryRun: args.includes('--dry-run'),
    skipEmbeddings: args.includes('--skip-embeddings'),
  };
  
  const minMessagesIdx = args.indexOf('--min-messages');
  if (minMessagesIdx !== -1 && args[minMessagesIdx + 1]) {
    options.minMessages = parseInt(args[minMessagesIdx + 1], 10);
  }
  
  const sinceIdx = args.indexOf('--since');
  if (sinceIdx !== -1 && args[sinceIdx + 1]) {
    options.since = new Date(args[sinceIdx + 1]);
  }
  
  console.log('ChatGPT Import');
  console.log('==============');
  console.log(`Source: ${sourcePath}`);
  console.log(`Options: ${JSON.stringify(options)}`);
  console.log('');
  
  // In a real implementation, these would be injected
  // For now, we'll just parse and show stats
  const isZip = sourcePath.endsWith('.zip');
  const parsed = isZip 
    ? await parseExportZip(sourcePath)
    : await parseExportDirectory(sourcePath);
  
  console.log(`Found ${parsed.conversations.length} conversations`);
  console.log(`Found ${parsed.feedback.length} feedback items`);
  
  // Process and show stats
  const filterOptions: FilterOptions = {
    minUserMessages: options.minMessages ?? 2,
    since: options.since,
  };
  
  let imported = 0;
  let skipped = 0;
  const topics: Record<string, number> = {};
  
  for (const conv of parsed.conversations) {
    const processed = processConversation(conv, filterOptions);
    if (processed) {
      imported++;
      for (const topic of processed.topics) {
        topics[topic] = (topics[topic] || 0) + 1;
      }
    } else {
      skipped++;
    }
  }
  
  console.log('');
  console.log('Preview Results:');
  console.log(`  Would import: ${imported} conversations`);
  console.log(`  Would skip: ${skipped} conversations`);
  console.log('');
  console.log('Topic distribution:');
  for (const [topic, count] of Object.entries(topics).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${topic}: ${count}`);
  }
  
  if (options.dryRun) {
    console.log('');
    console.log('(Dry run - no data persisted)');
  }
}

