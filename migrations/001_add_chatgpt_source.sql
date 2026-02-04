-- Migration: Add ChatGPT as an event source
-- This allows importing ChatGPT conversation history as the first data source

-- Add 'chatgpt' to event_source enum
-- Note: PostgreSQL requires ALTER TYPE for enum modifications
ALTER TYPE event_source ADD VALUE IF NOT EXISTS 'chatgpt';

-- Add index for efficient ChatGPT conversation queries
CREATE INDEX IF NOT EXISTS idx_events_chatgpt_source 
  ON events(thread_id, timestamp) 
  WHERE source = 'chatgpt';

-- Add comment for documentation
COMMENT ON TYPE event_source IS 'Sources of life events. chatgpt = imported ChatGPT conversation history';

