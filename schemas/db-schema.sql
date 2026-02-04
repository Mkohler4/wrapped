-- Personal Operator Assistant — Database Schema
-- PostgreSQL with pgvector extension

-- ============================================
-- EXTENSIONS
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For fuzzy text search

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE event_source AS ENUM (
  'email',
  'slack', 
  'calendar',
  'document',
  'note',
  'manual',
  'chatgpt'  -- Imported ChatGPT conversation history
);

CREATE TYPE permission_level AS ENUM (
  'full',
  'summary_only',
  'metadata_only',
  'private'
);

CREATE TYPE memory_type AS ENUM (
  'preference',
  'person',
  'default',
  'rule'
);

CREATE TYPE memory_source AS ENUM (
  'explicit',
  'inferred',
  'observed'
);

CREATE TYPE episodic_type AS ENUM (
  'decision',
  'learning',
  'commitment',
  'reflection'
);

CREATE TYPE queue_status AS ENUM (
  'pending',
  'approved',
  'rejected',
  'expired'
);

-- ============================================
-- CORE TABLES
-- ============================================

-- Users (for multi-user support later, but start with single user)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  timezone VARCHAR(50) DEFAULT 'UTC',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Connected integrations
CREATE TABLE sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  source_type event_source NOT NULL,
  name VARCHAR(255) NOT NULL,
  config JSONB DEFAULT '{}',           -- Source-specific config
  credentials_encrypted BYTEA,          -- Encrypted OAuth tokens
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  sync_cursor TEXT,                     -- Pagination cursor for incremental sync
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Known people
CREATE TABLE people (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  slack_id VARCHAR(50),
  role VARCHAR(255),
  relationship VARCHAR(255),
  notes TEXT,
  importance INTEGER DEFAULT 3 CHECK (importance >= 1 AND importance <= 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, email)
);

CREATE INDEX idx_people_user ON people(user_id);
CREATE INDEX idx_people_email ON people(email);
CREATE INDEX idx_people_name ON people USING gin(name gin_trgm_ops);

-- ============================================
-- EVENTS (Core Content)
-- ============================================

CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  source event_source NOT NULL,
  source_id VARCHAR(255),              -- ID in source system
  
  -- Timing
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  indexed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Content
  text TEXT NOT NULL,
  summary TEXT,
  
  -- Relationships
  thread_id UUID,
  parent_id UUID REFERENCES events(id) ON DELETE SET NULL,
  
  -- Classification
  topic_tags TEXT[] DEFAULT '{}',
  importance INTEGER DEFAULT 3 CHECK (importance >= 1 AND importance <= 5),
  action_required BOOLEAN DEFAULT false,
  
  -- Privacy
  permissions permission_level DEFAULT 'full',
  is_sensitive BOOLEAN DEFAULT false,
  
  -- Embedding (pgvector)
  embedding vector(1536),
  
  -- Source-specific data (JSONB for flexibility)
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for events
CREATE INDEX idx_events_user ON events(user_id);
CREATE INDEX idx_events_source ON events(source);
CREATE INDEX idx_events_timestamp ON events(timestamp DESC);
CREATE INDEX idx_events_thread ON events(thread_id);
CREATE INDEX idx_events_tags ON events USING gin(topic_tags);
CREATE INDEX idx_events_text_search ON events USING gin(to_tsvector('english', text));
CREATE INDEX idx_events_embedding ON events USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Event-Person relationship
CREATE TABLE event_people (
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  person_id UUID REFERENCES people(id) ON DELETE CASCADE,
  role VARCHAR(50),                    -- 'sender', 'recipient', 'cc', 'mentioned'
  PRIMARY KEY (event_id, person_id, role)
);

-- Threads (grouping for conversations)
CREATE TABLE threads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  source event_source NOT NULL,
  source_thread_id VARCHAR(255),       -- Original thread ID from source
  subject VARCHAR(500),
  first_event_at TIMESTAMP WITH TIME ZONE,
  last_event_at TIMESTAMP WITH TIME ZONE,
  event_count INTEGER DEFAULT 0,
  participants UUID[] DEFAULT '{}',    -- Person IDs
  is_resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_threads_user ON threads(user_id);
CREATE INDEX idx_threads_source ON threads(source);
CREATE INDEX idx_threads_last_event ON threads(last_event_at DESC);

-- ============================================
-- MEMORY TABLES
-- ============================================

-- Profile Memory (preferences, people info, defaults)
CREATE TABLE profile_memory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  category memory_type NOT NULL,
  key VARCHAR(255) NOT NULL,
  value TEXT NOT NULL,
  confidence DECIMAL(3,2) DEFAULT 1.0 CHECK (confidence >= 0 AND confidence <= 1),
  source memory_source DEFAULT 'explicit',
  embedding vector(1536),
  use_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, category, key)
);

CREATE INDEX idx_profile_memory_user ON profile_memory(user_id);
CREATE INDEX idx_profile_memory_category ON profile_memory(category);
CREATE INDEX idx_profile_memory_embedding ON profile_memory USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 50);

-- Episodic Memory (decisions, learnings, commitments)
CREATE TABLE episodic_memory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type episodic_type NOT NULL,
  summary TEXT NOT NULL,
  context TEXT,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  source_refs UUID[] DEFAULT '{}',     -- Event IDs this relates to
  tags TEXT[] DEFAULT '{}',
  importance INTEGER DEFAULT 3 CHECK (importance >= 1 AND importance <= 5),
  revisit_date DATE,
  embedding vector(1536),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_episodic_memory_user ON episodic_memory(user_id);
CREATE INDEX idx_episodic_memory_type ON episodic_memory(type);
CREATE INDEX idx_episodic_memory_timestamp ON episodic_memory(timestamp DESC);
CREATE INDEX idx_episodic_memory_tags ON episodic_memory USING gin(tags);
CREATE INDEX idx_episodic_memory_embedding ON episodic_memory USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 50);

-- Memory approval queue
CREATE TABLE memory_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  memory_type VARCHAR(50) NOT NULL,    -- 'profile' or 'episodic'
  proposed_data JSONB NOT NULL,
  source_event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  reason TEXT,                         -- Why system is suggesting this
  status queue_status DEFAULT 'pending',
  reviewed_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_memory_queue_user_status ON memory_queue(user_id, status);
CREATE INDEX idx_memory_queue_expires ON memory_queue(expires_at);

-- ============================================
-- STYLE TABLES
-- ============================================

-- Style profile (parameters and rules)
CREATE TABLE style_profile (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  
  -- Length preferences
  default_length VARCHAR(20) DEFAULT 'short',
  length_by_context JSONB DEFAULT '{}',
  
  -- Structure preferences
  format_preference VARCHAR(20) DEFAULT 'mixed',
  use_headers BOOLEAN DEFAULT false,
  use_numbered_lists BOOLEAN DEFAULT false,
  paragraph_length VARCHAR(20) DEFAULT 'short',
  
  -- Tone parameters (1-5 scale)
  formality INTEGER DEFAULT 3 CHECK (formality >= 1 AND formality <= 5),
  warmth INTEGER DEFAULT 3 CHECK (warmth >= 1 AND warmth <= 5),
  humor INTEGER DEFAULT 2 CHECK (humor >= 1 AND humor <= 5),
  technical_depth INTEGER DEFAULT 3 CHECK (technical_depth >= 1 AND technical_depth <= 5),
  
  -- Vocabulary
  banned_words TEXT[] DEFAULT '{}',
  preferred_words JSONB DEFAULT '{}',  -- {"old_word": "new_word"}
  signature TEXT,
  greeting TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Style exemplars (good outputs to learn from)
CREATE TABLE style_exemplars (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  context VARCHAR(50),                 -- 'email_reply', 'slack_message', etc.
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  source VARCHAR(50),                  -- 'user_provided', 'highly_rated_draft'
  embedding vector(1536),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_style_exemplars_user ON style_exemplars(user_id);
CREATE INDEX idx_style_exemplars_context ON style_exemplars(context);

-- Edit signals (learning from user edits)
CREATE TABLE edit_signals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  original_text TEXT NOT NULL,
  edited_text TEXT NOT NULL,
  diff_type VARCHAR(50),               -- 'shorten', 'lengthen', 'rephrase', etc.
  patterns_detected TEXT[] DEFAULT '{}',
  context VARCHAR(50),                 -- What type of content was edited
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_edit_signals_user ON edit_signals(user_id);
CREATE INDEX idx_edit_signals_created ON edit_signals(created_at DESC);

-- ============================================
-- CONVERSATIONS (Chat History)
-- ============================================

CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255),
  is_private BOOLEAN DEFAULT false,    -- Private mode = not stored
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_conversations_user ON conversations(user_id);
CREATE INDEX idx_conversations_updated ON conversations(updated_at DESC);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL,           -- 'user', 'assistant', 'system'
  content TEXT NOT NULL,
  
  -- For assistant messages
  sources_used UUID[] DEFAULT '{}',    -- Event IDs used as context
  memories_used UUID[] DEFAULT '{}',   -- Memory IDs used
  
  -- Feedback
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  feedback TEXT,
  was_edited BOOLEAN DEFAULT false,
  edited_content TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_created ON messages(created_at);

-- ============================================
-- BACKGROUND JOBS
-- ============================================

CREATE TABLE digests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  digest_type VARCHAR(50) NOT NULL,    -- 'daily', 'weekly'
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  content JSONB NOT NULL,              -- Structured digest content
  delivered_at TIMESTAMP WITH TIME ZONE,
  delivery_method VARCHAR(50),         -- 'email', 'push', 'in_app'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_digests_user ON digests(user_id);
CREATE INDEX idx_digests_period ON digests(period_end DESC);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  notification_type VARCHAR(50) NOT NULL, -- 'important_sender', 'urgent', 'deadline', 'mention'
  title VARCHAR(255) NOT NULL,
  body TEXT,
  is_read BOOLEAN DEFAULT false,
  delivered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_unread ON notifications(user_id) WHERE NOT is_read;

-- ============================================
-- AUDIT & PRIVACY
-- ============================================

CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL,        -- 'event_deleted', 'memory_approved', etc.
  target_type VARCHAR(50),
  target_id UUID,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_audit_log_created ON audit_log(created_at DESC);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_sources_updated_at BEFORE UPDATE ON sources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_people_updated_at BEFORE UPDATE ON people
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_threads_updated_at BEFORE UPDATE ON threads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_profile_memory_updated_at BEFORE UPDATE ON profile_memory
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_episodic_memory_updated_at BEFORE UPDATE ON episodic_memory
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_style_profile_updated_at BEFORE UPDATE ON style_profile
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Full-text search function
CREATE OR REPLACE FUNCTION search_events(
  p_user_id UUID,
  p_query TEXT,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  source event_source,
  "text" TEXT,
  "timestamp" TIMESTAMP WITH TIME ZONE,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.source,
    e.text,
    e.timestamp,
    ts_rank(to_tsvector('english', e.text), plainto_tsquery('english', p_query)) as rank
  FROM events e
  WHERE e.user_id = p_user_id
    AND e.is_sensitive = false
    AND e.permissions != 'private'
    AND to_tsvector('english', e.text) @@ plainto_tsquery('english', p_query)
  ORDER BY rank DESC, e.timestamp DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Vector similarity search function
CREATE OR REPLACE FUNCTION search_events_semantic(
  p_user_id UUID,
  p_embedding vector(1536),
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  source event_source,
  "text" TEXT,
  "timestamp" TIMESTAMP WITH TIME ZONE,
  similarity REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.source,
    e.text,
    e.timestamp,
    1 - (e.embedding <=> p_embedding) as similarity
  FROM events e
  WHERE e.user_id = p_user_id
    AND e.is_sensitive = false
    AND e.permissions != 'private'
    AND e.embedding IS NOT NULL
  ORDER BY e.embedding <=> p_embedding
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;
