-- Personal Operator Assistant — Task Understanding Schema
-- Migration: 002_task_understanding.sql
-- Date: February 2, 2026
-- Description: Neural task understanding with natural language processing

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE task_status AS ENUM (
  'pending',     -- Task created, not started
  'active',      -- Currently being worked on
  'completed',   -- Successfully finished
  'abandoned'    -- Dropped or cancelled
);

CREATE TYPE task_update_type AS ENUM (
  'created',     -- Task was created
  'progress',    -- Progress update
  'completed',   -- Task completed
  'blocked',     -- Blocked/stuck
  'edited',      -- Title/description changed
  'priority',    -- Priority changed
  'unblocked'    -- Resumed from blocked
);

CREATE TYPE utterance_intent AS ENUM (
  'starting',    -- Beginning a new task
  'progress',    -- Reporting progress
  'completed',   -- Finished a task
  'blocked',     -- Stuck on something
  'query',       -- Asking about tasks
  'not_task'     -- Not task-related
);

-- ============================================
-- TASKS TABLE
-- ============================================

CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Task content
  title VARCHAR(500) NOT NULL,
  description TEXT,
  
  -- Status
  status task_status DEFAULT 'pending',
  priority INTEGER DEFAULT 3 CHECK (priority >= 1 AND priority <= 5),
  
  -- Classification
  tags TEXT[] DEFAULT '{}',
  
  -- Timing
  due_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Embedding for fuzzy matching
  embedding vector(1536),
  
  -- Hierarchy (for subtasks)
  parent_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  
  -- Source context
  metadata JSONB DEFAULT '{}',
  
  -- Archived to episodic memory?
  archived_to_memory_id UUID REFERENCES episodic_memory(id) ON DELETE SET NULL
);

-- Indexes for tasks
CREATE INDEX idx_tasks_user ON tasks(user_id);
CREATE INDEX idx_tasks_status ON tasks(user_id, status);
CREATE INDEX idx_tasks_created ON tasks(created_at DESC);
CREATE INDEX idx_tasks_due ON tasks(due_at) WHERE due_at IS NOT NULL;
CREATE INDEX idx_tasks_tags ON tasks USING gin(tags);
CREATE INDEX idx_tasks_parent ON tasks(parent_task_id) WHERE parent_task_id IS NOT NULL;

-- Vector index for semantic task matching
CREATE INDEX idx_tasks_embedding ON tasks USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 50);

-- Full-text search on title and description
CREATE INDEX idx_tasks_text_search ON tasks 
  USING gin(to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '')));

-- ============================================
-- TASK SESSIONS
-- ============================================

CREATE TABLE task_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Current focus
  active_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  
  -- Recent context (last 10 utterance texts for LLM context)
  recent_utterances TEXT[] DEFAULT '{}',
  
  -- Session state
  context JSONB DEFAULT '{}',
  
  -- Timing
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_task_sessions_user ON task_sessions(user_id);
CREATE INDEX idx_task_sessions_activity ON task_sessions(last_activity_at DESC);

-- ============================================
-- UTTERANCES
-- ============================================

CREATE TABLE utterances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES task_sessions(id) ON DELETE SET NULL,
  
  -- Original input
  raw_text TEXT NOT NULL,
  normalized_text TEXT,
  
  -- Intent classification
  intent utterance_intent NOT NULL,
  intent_confidence DECIMAL(4,3) DEFAULT 1.0 CHECK (intent_confidence >= 0 AND intent_confidence <= 1),
  
  -- Task matching
  matched_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  match_confidence DECIMAL(4,3) CHECK (match_confidence >= 0 AND match_confidence <= 1),
  
  -- Embedding for the utterance
  embedding vector(1536),
  
  -- Learning from corrections
  was_corrected BOOLEAN DEFAULT false,
  corrected_to_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  
  -- Full LLM analysis result
  llm_analysis JSONB DEFAULT '{}',
  
  -- Voice metadata (if from speech)
  voice_metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for utterances
CREATE INDEX idx_utterances_user ON utterances(user_id);
CREATE INDEX idx_utterances_session ON utterances(session_id);
CREATE INDEX idx_utterances_task ON utterances(matched_task_id) WHERE matched_task_id IS NOT NULL;
CREATE INDEX idx_utterances_created ON utterances(created_at DESC);
CREATE INDEX idx_utterances_corrected ON utterances(user_id) WHERE was_corrected = true;

-- Vector index for utterance similarity (useful for learning patterns)
CREATE INDEX idx_utterances_embedding ON utterances USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 50);

-- ============================================
-- TASK UPDATES
-- ============================================

CREATE TABLE task_updates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  utterance_id UUID REFERENCES utterances(id) ON DELETE SET NULL,
  
  -- Update details
  update_type task_update_type NOT NULL,
  notes TEXT,
  
  -- What changed (for edit tracking)
  changes JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_task_updates_task ON task_updates(task_id);
CREATE INDEX idx_task_updates_created ON task_updates(created_at DESC);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Search tasks by semantic similarity
CREATE OR REPLACE FUNCTION search_tasks_semantic(
  p_user_id UUID,
  p_embedding vector(1536),
  p_limit INTEGER DEFAULT 5,
  p_status task_status DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  title VARCHAR(500),
  status task_status,
  similarity REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.title,
    t.status,
    1 - (t.embedding <=> p_embedding) as similarity
  FROM tasks t
  WHERE t.user_id = p_user_id
    AND t.embedding IS NOT NULL
    AND (p_status IS NULL OR t.status = p_status)
  ORDER BY t.embedding <=> p_embedding
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Get recent tasks for context
CREATE OR REPLACE FUNCTION get_recent_tasks(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  title VARCHAR(500),
  status task_status,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.title,
    t.status,
    t.updated_at
  FROM tasks t
  WHERE t.user_id = p_user_id
    AND t.status IN ('pending', 'active')
  ORDER BY t.updated_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Get or create session (sessions expire after 4 hours of inactivity)
CREATE OR REPLACE FUNCTION get_or_create_session(
  p_user_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_session_id UUID;
BEGIN
  -- Try to find active session (last activity within 4 hours)
  SELECT id INTO v_session_id
  FROM task_sessions
  WHERE user_id = p_user_id
    AND last_activity_at > NOW() - INTERVAL '4 hours'
  ORDER BY last_activity_at DESC
  LIMIT 1;
  
  -- If no active session, create new one
  IF v_session_id IS NULL THEN
    INSERT INTO task_sessions (user_id)
    VALUES (p_user_id)
    RETURNING id INTO v_session_id;
  END IF;
  
  RETURN v_session_id;
END;
$$ LANGUAGE plpgsql;

-- Update session activity and add utterance to recent list
CREATE OR REPLACE FUNCTION update_session_activity(
  p_session_id UUID,
  p_utterance TEXT,
  p_active_task_id UUID DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE task_sessions SET
    last_activity_at = NOW(),
    active_task_id = COALESCE(p_active_task_id, active_task_id),
    -- Keep last 10 utterances
    recent_utterances = (
      SELECT ARRAY(
        SELECT unnest
        FROM unnest(ARRAY[p_utterance] || recent_utterances) WITH ORDINALITY
        LIMIT 10
      )
    )
  WHERE id = p_session_id;
END;
$$ LANGUAGE plpgsql;

-- Get session context for LLM
CREATE OR REPLACE FUNCTION get_session_context(
  p_session_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'sessionId', s.id,
    'startedAt', s.started_at,
    'lastActivityAt', s.last_activity_at,
    'activeTask', CASE 
      WHEN t.id IS NOT NULL THEN jsonb_build_object(
        'id', t.id,
        'title', t.title,
        'status', t.status
      )
      ELSE NULL
    END,
    'recentUtterances', s.recent_utterances,
    'context', s.context
  )
  INTO v_result
  FROM task_sessions s
  LEFT JOIN tasks t ON s.active_task_id = t.id
  WHERE s.id = p_session_id;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS
-- ============================================

-- Update tasks.updated_at on changes
CREATE TRIGGER update_tasks_updated_at 
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-set completed_at when status changes to completed
CREATE OR REPLACE FUNCTION set_task_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    NEW.completed_at = NOW();
  ELSIF NEW.status != 'completed' AND OLD.status = 'completed' THEN
    NEW.completed_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_task_completed_at_trigger
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION set_task_completed_at();

-- ============================================
-- SAMPLE DATA (for testing)
-- ============================================

-- Note: Uncomment to seed test data
/*
INSERT INTO tasks (user_id, title, description, status, priority, tags)
SELECT 
  u.id,
  'Sample Task: Write documentation',
  'Create comprehensive docs for the new feature',
  'pending',
  3,
  ARRAY['writing', 'documentation']
FROM users u
LIMIT 1;
*/

