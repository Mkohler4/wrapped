# ChatGPT Wrapped — Task Index

> **Master checklist for tracking progress across all phases.**  
> **Last updated:** February 10, 2026

---

## Summary

| Metric | Value |
|--------|-------|
| **Total tasks** | 14 |
| **Total phases** | 6 (0–5) |
| **Estimated effort** | 8–10 days |
| **Calendar time (with parallelism)** | ~2 weeks |
| **Maximum parallel agents** | 6 (during Phase 1) |

---

## Task List

| Task ID | Name | Phase | Est. Effort | Dependencies | Parallel Group | Status |
|---------|------|-------|-------------|--------------|----------------|--------|
| **0** | [Interface Contracts](./phase-0/task-0-interface-contracts.md) | 0 | 0.5 day | None | Solo | Not Started |
| **1A** | [Temporal Analysis Detector](./phase-1/task-1a-temporal-detector.md) | 1 | 1 day | Task 0 | Phase 1 Detectors | Not Started |
| **1B** | [Behavioral Correlation Detector](./phase-1/task-1b-correlation-detector.md) | 1 | 1 day | Task 0 | Phase 1 Detectors | Not Started |
| **1C** | [Growth Signal Detector](./phase-1/task-1c-growth-detector.md) | 1 | 0.5 day | Task 0 | Phase 1 Detectors | Not Started |
| **1D** | [Life Event Detector](./phase-1/task-1d-life-event-detector.md) | 1 | 0.5 day | Task 0 (soft: Task 1A) | Phase 1 Detectors | Not Started |
| **1E** | [Benchmark Computation](./phase-1/task-1e-benchmark-computation.md) | 1 | 1 day | Task 0 | Phase 1 Detectors | Not Started |
| **1F** | [Expanded Semantic Probes](./phase-1/task-1f-semantic-probes.md) | 1 | 0.5 day | None | Phase 1 Detectors | Not Started |
| **2** | [Fact Engine](./phase-2/task-2-fact-engine.md) | 2 | 1 day | Tasks 0, 1A–1E | Solo | Not Started |
| **3A** | [LLM Narrative Prompt](./phase-3/task-3a-llm-narrative-prompt.md) | 3 | 0.5 day | Tasks 0, 2 | Phase 3 Narrative | Not Started |
| **3B** | [Template Fallback Engine](./phase-3/task-3b-template-fallback-engine.md) | 3 | 1 day | Tasks 0, 2 | Phase 3 Narrative | Not Started |
| **3C** | [Validation & Recovery Pipeline](./phase-3/task-3c-validation-recovery-pipeline.md) | 3 | 0.5 day | Tasks 0, 2 | Phase 3 Narrative | Not Started |
| **4A** | [Design System](./phase-4/task-4a-design-system.md) | 4 | 1 day | None | Phase 4 Presentation (can start early) | Not Started |
| **4B** | [Slide Implementation](./phase-4/task-4b-slide-implementation.md) | 4 | 2–3 days | Tasks 0, 4A, 3A/3B | Phase 4 Presentation | Not Started |
| **5A** | [Backend Integration](./phase-5/task-5a-backend-integration.md) | 5 | 1 day | Tasks 0–4B (all) | Phase 5 Integration | Not Started |
| **5B** | [End-to-End Testing](./phase-5/task-5b-end-to-end-testing.md) | 5 | 1 day | Task 5A | Phase 5 Integration | Not Started |

---

## Dependency Graph

```
Phase 0:  [Task 0: Interface Contracts]
              ↓
Phase 1:  [1A: Temporal] [1B: Correlations] [1C: Growth] [1D: Life Events] [1E: Benchmarks] [1F: Probes]
              ↓               ↓                  ↓             ↓                 ↓
Phase 2:  [Task 2: Fact Engine]  ←───────── all Phase 1 outputs
              ↓
Phase 3:  [3A: LLM Prompt] [3B: Templates] [3C: Validation]
              ↓                 ↓                ↓
Phase 4:  [4A: Design System*] ─→ [4B: Slide Implementation]
              ↓
Phase 5:  [5A: Backend Integration] ─→ [5B: End-to-End Testing]

* 4A can start as early as Phase 1 (no data dependency)
```

---

## Parallel Groups

### Group 1: Phase 1 Detectors (6 agents, Days 2–3)
All run simultaneously after Task 0 is complete.

| Agent | Task | File Ownership |
|-------|------|---------------|
| Agent 1 | 1A: Temporal Detector | `src/lib/detectors/temporal.ts` |
| Agent 2 | 1B: Correlation Detector | `src/lib/detectors/correlations.ts` |
| Agent 3 | 1C: Growth Detector | `src/lib/detectors/growth.ts` |
| Agent 4 | 1D: Life Event Detector | `src/lib/detectors/life-events.ts` |
| Agent 5 | 1E: Benchmark Computation | `src/lib/detectors/benchmarks.ts` |
| Agent 6 | 1F: Semantic Probes | Existing probes file (modify) |

### Group 2: Phase 3 Narrative (3 agents, Days 5–6)
All run simultaneously after Task 2 is complete.

| Agent | Task | File Ownership |
|-------|------|---------------|
| Agent 1 | 3A: LLM Narrative Prompt | `src/lib/narrative/llm-prompt.ts` |
| Agent 2 | 3B: Template Fallback Engine | `src/lib/narrative/templates.ts` |
| Agent 3 | 3C: Validation & Recovery | `src/lib/narrative/validation.ts` |

### Group 3: Phase 4A Design System (1 agent, Days 2–6)
Can run in parallel with Groups 1 and 2 (no data dependency).

| Agent | Task | File Ownership |
|-------|------|---------------|
| Agent 1 | 4A: Design System | `src/styles/wrapped-design-system.*`, `src/lib/design-system.ts` |

### Group 4: Phase 5 Integration (2 agents, Days 9–10)
Run after all previous phases.

| Agent | Task | File Ownership |
|-------|------|---------------|
| Agent 1 | 5A: Backend Integration | `src/lib/generate-insights-v3.ts`, existing endpoint files |
| Agent 2 | 5B: End-to-End Testing | `src/__tests__/e2e/` |

---

## Review Gates

| Gate | When | What Gets Reviewed | Blocks |
|------|------|-------------------|--------|
| **Gate 0** | After Task 0 | Interface contracts approved | Phase 1 |
| **Gate 1** | After Phase 1 | All detectors produce correct output, shapes match contracts | Phase 2 |
| **Gate 2** | After Phase 2 | Fact Engine produces ranked, correct output for test profiles | Phase 3 |
| **Gate 3** | After Phase 3 | Full narrative pipeline produces valid WrappedInsightsV3 | Phase 4B, Phase 5 |
| **Gate 4** | After Phase 4 | All 16 slides render, pass squint test, mobile portrait correct | Phase 5 |
| **Gate 5 (Final)** | After Phase 5 | End-to-end sign-off for all 3 user profiles | Ship |

---

## Timeline

```
Week 1:
  Day 1:    [Task 0: Interfaces]
  Day 2-3:  [1A] [1B] [1C] [1D] [1E] [1F]  +  [4A: Design System starts]
  Day 4:    [Task 2: Fact Engine]            +  [4A continues]

Week 2:
  Day 5-6:  [3A] [3B] [3C]                  +  [4A finishes]
  Day 7-8:  [4B: Slide Implementation]
  Day 9-10: [5A: Integration] [5B: Testing]
```

---

## File Ownership Summary

No two tasks edit the same file. This prevents merge conflicts during parallel execution.

| File | Owner Task |
|------|-----------|
| `src/lib/types/insights.ts` | Task 0 |
| `src/lib/detectors/temporal.ts` | Task 1A |
| `src/lib/detectors/correlations.ts` | Task 1B |
| `src/lib/detectors/growth.ts` | Task 1C |
| `src/lib/detectors/life-events.ts` | Task 1D |
| `src/lib/detectors/benchmarks.ts` | Task 1E |
| Existing semantic probes file | Task 1F |
| `src/lib/insight-facts.ts` | Task 2 |
| `src/lib/narrative/llm-prompt.ts` | Task 3A |
| `src/lib/narrative/templates.ts` | Task 3B |
| `src/lib/narrative/validation.ts` | Task 3C |
| `src/styles/wrapped-design-system.*` | Task 4A |
| `src/lib/design-system.ts` | Task 4A |
| `src/components/slides/*` | Task 4B |
| `src/lib/generate-insights-v3.ts` | Task 5A |
| Existing endpoint files (behind feature flag) | Task 5A |
| `src/__tests__/e2e/*` | Task 5B |
