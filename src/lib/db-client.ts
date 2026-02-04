/**
 * Database Client Implementation
 * 
 * Implements the DatabaseClient interface for the ChatGPT importer.
 */

import { v4 as uuidv4 } from 'uuid';
import { query, transaction as dbTransaction } from './db';
import type { 
  DatabaseClient, 
  ThreadInsert, 
  EventInsert, 
  MemoryQueueInsert 
} from '../ingest/chatgpt/importer';

export function createDatabaseClient(): DatabaseClient {
  return {
    async createThread(thread: ThreadInsert): Promise<string> {
      const id = uuidv4();
      
      await query(`
        INSERT INTO threads (id, user_id, source, source_thread_id, subject, first_event_at, last_event_at, event_count)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        id,
        thread.userId,
        thread.source,
        thread.sourceThreadId,
        thread.subject,
        thread.firstEventAt,
        thread.lastEventAt,
        thread.eventCount,
      ]);
      
      return id;
    },
    
    async createEvents(events: EventInsert[]): Promise<string[]> {
      const ids: string[] = [];
      
      for (const event of events) {
        const id = uuidv4();
        ids.push(id);
        
        // Format embedding as pgvector array string
        const embeddingStr = event.embedding 
          ? `[${event.embedding.join(',')}]` 
          : null;
        
        await query(`
          INSERT INTO events (
            id, user_id, source, source_id, timestamp, text, 
            thread_id, parent_id, topic_tags, importance, metadata, embedding
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::vector)
        `, [
          id,
          event.userId,
          event.source,
          event.sourceId,
          event.timestamp,
          event.text,
          event.threadId,
          event.parentId || null,
          event.topicTags,
          event.importance,
          JSON.stringify(event.metadata),
          embeddingStr,
        ]);
      }
      
      return ids;
    },
    
    async queueMemory(memory: MemoryQueueInsert): Promise<string> {
      const id = uuidv4();
      
      await query(`
        INSERT INTO memory_queue (id, user_id, memory_type, proposed_data, source_event_id, reason, status)
        VALUES ($1, $2, $3, $4, $5, $6, 'pending')
      `, [
        id,
        memory.userId,
        memory.memoryType,
        JSON.stringify(memory.proposedData),
        memory.sourceEventId || null,
        memory.reason,
      ]);
      
      return id;
    },
    
    async transaction<T>(fn: () => Promise<T>): Promise<T> {
      return dbTransaction(async () => {
        return fn();
      });
    },
  };
}

