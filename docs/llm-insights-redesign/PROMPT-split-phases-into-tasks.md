# Prompt: Split Phases Into Task Files

> **Purpose:** Hand this prompt to a new AI agent. It will read all project context, then break each phase from `phases.md` into individual task files that can be assigned to parallel agents.

---

## Instructions

You are working on a project called **ChatGPT Wrapped** — a "Spotify Wrapped"-style experience that analyzes a user's ChatGPT export and presents personalized insights as a swipeable, poster-style slide deck.

The project has a complete design doc, requirements doc, product outline, and a phases/execution plan. Your job is to **read all four documents**, then **break each phase into individual task files** that can be handed to separate AI agents for parallel execution.

### Step 1: Read These Documents (In This Order)

1. `docs/llm-insights-redesign/OUTLINE.md` — The end product. What the user sees. 16 slides, pattern-first, poster-style. Read this first to understand the goal.
2. `docs/llm-insights-redesign/design-doc.md` — The full technical design. Data architecture, the 5 insight categories, the fact engine, LLM narrative writer, output schema, validation/recovery. This is the deepest document.
3. `docs/llm-insights-redesign/requirements.md` — Functional requirements, data requirements, privacy/safety, UX requirements, acceptance tests. The spec.
4. `docs/llm-insights-redesign/phases.md` — The execution plan. 6 phases, parallel workstreams, interface contracts, review gates, timeline. **This is what you are breaking into tasks.**

Read all four completely before writing anything. You need the full picture.

### Step 2: Create Task Files

For each phase in `phases.md`, create a task directory and individual task files:

```
docs/llm-insights-redesign/tasks/
  phase-0/
    task-0-interface-contracts.md
  phase-1/
    task-1a-temporal-detector.md
    task-1b-correlation-detector.md
    task-1c-growth-detector.md
    task-1d-life-event-detector.md
    task-1e-benchmark-computation.md
    task-1f-semantic-probes.md
  phase-2/
    task-2-fact-engine.md
  phase-3/
    task-3a-llm-narrative-prompt.md
    task-3b-template-fallback-engine.md
    task-3c-validation-recovery-pipeline.md
  phase-4/
    task-4a-design-system.md
    task-4b-slide-implementation.md
  phase-5/
    task-5a-backend-integration.md
    task-5b-end-to-end-testing.md
```

### Step 3: What Each Task File Must Contain

Every task file is a **self-contained prompt** that can be handed to a fresh AI agent with no other context. The agent reading this file should be able to do the work without asking questions. Each task file must include:

1. **Context Summary** — A 3-5 sentence overview of the project and where this task fits. The agent doesn't have the other docs, so give it enough context to understand the big picture.

2. **Goal** — One sentence: what does this task produce?

3. **Interface Contracts** — The exact TypeScript interfaces this task reads from and writes to. Copy the relevant interfaces from `phases.md` Phase 0 — don't just reference them. The agent needs them inline.

4. **Detailed Requirements** — Everything the agent needs to know to implement this task. Pull from:
   - The relevant section of `design-doc.md` (the insight category, SQL queries, computation logic, code examples)
   - The relevant section of `requirements.md` (functional requirements, constraints, edge cases)
   - The relevant section of `phases.md` (agent scope, what's in/out)

5. **File Ownership** — Exactly which files this agent creates or modifies. Be specific (e.g., `src/lib/detectors/temporal.ts`). Remind the agent: do NOT edit files owned by other tasks.

6. **Edge Cases & Constraints** — What happens with empty data? Minimum thresholds? Privacy constraints? Banned topics? Pull these from the design doc and requirements.

7. **Acceptance Criteria** — A checklist of things that must be true when this task is done. Be specific enough that another agent could verify the work.

8. **Dependencies** — What must be complete before this task starts? What does this task unblock?

### Step 4: Quality Standards for Task Files

- **Self-contained.** An agent reading only this task file should be able to do the work. Don't say "see the design doc" — include the relevant details inline.
- **Specific.** Don't say "implement the detector." Say "implement a `detectCorrelations()` function that takes `ConversationRecord[]` and returns `BehavioralCorrelation[]` sorted by strength descending."
- **Include code examples.** The design doc has SQL queries, TypeScript interfaces, and computation logic for every detector. Copy the relevant ones into the task file.
- **Include the constraints.** Every task has constraints (minimum sample sizes, banned topics, no invented numbers, etc.). Make them explicit.
- **Don't over-specify implementation.** Give the agent the interfaces, the requirements, the examples, and the acceptance criteria. Let it make implementation decisions within those bounds.

### Step 5: Create a Task Index

After creating all task files, create a `docs/llm-insights-redesign/tasks/INDEX.md` that lists every task with:
- Task ID and name
- Phase
- Dependencies (which tasks must complete first)
- Parallel group (which tasks can run simultaneously)
- Estimated effort
- Status (all start as "Not Started")

This index is the master checklist for tracking progress.

---

## Important Notes

- The `phases.md` document already has the workstream breakdown, interface contracts, and agent scope for every task. Your job is to **expand** each workstream into a complete, self-contained task file with all the implementation detail pulled from the design doc and requirements.
- Pay close attention to the **prompting strategy** section in `phases.md` — it defines which files each agent owns. Carry this into the task files.
- The **review gates** in `phases.md` define what gets checked between phases. The acceptance criteria in each task file should align with the relevant review gate.
- Some tasks reference SQL queries and TypeScript code from the design doc. **Include these in the task files.** The agent implementing the task needs them.
