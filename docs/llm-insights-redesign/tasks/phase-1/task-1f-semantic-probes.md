# Task 1F: Expanded Semantic Probes

> **Phase:** 1 — Data Signals  
> **Task ID:** 1F  
> **Estimated Effort:** 0.5 day  
> **Status:** Not Started

---

## Context Summary

You are working on **ChatGPT Wrapped** — a "Spotify Wrapped"-style experience that analyzes a user's ChatGPT data export and presents personalized insights as a 16-slide poster-style deck. The system classifies conversations into topics using **semantic probes** — short embedding texts that represent categories. The system matches conversation content against these probes to assign topic tags.

Currently the system has only **8 semantic probes**, which means many conversation topics fall through to a generic "uncategorized" bucket. This weakens every downstream insight that depends on topic data (trajectories, correlations, life events, topic diversity). This task expands coverage from 8 to 18+ themes.

---

## Goal

Expand the semantic probe array from 8 to 18+ themes by adding embedding texts for 10 new topic categories. Update the existing probe definitions file.

---

## Interface Contracts

This task does not consume or produce the standard detector interfaces. It modifies the existing semantic probe configuration that feeds the topic classification system.

### Existing Probe Shape (Expected)

```typescript
interface SemanticProbe {
  id: string;                   // "web-development", "data-science", etc.
  label: string;                // Human-readable label
  embeddingText: string;        // Text used for embedding similarity
}
```

The existing probes array lives in the codebase already. You are extending it, not replacing it.

---

## Detailed Requirements

### Existing Probes (Keep — Do Not Modify)

The current 8 probes cover (approximately):
1. Web Development / Frontend
2. Backend / API Development
3. Mobile Development
4. Machine Learning / AI
5. Creative Writing / Fiction
6. Academic / Research
7. Business / Strategy
8. General Programming / Coding

**Do not modify these.** Only add new probes.

### New Probes to Add (10 Categories)

| # | Probe ID | Label | Embedding Text |
|---|----------|-------|---------------|
| 9 | `devops-infrastructure` | DevOps & Infrastructure | "CI/CD pipelines, Docker containers, Kubernetes, cloud deployment, AWS, Azure, GCP, infrastructure as code, Terraform, monitoring" |
| 10 | `data-science-analytics` | Data Science & Analytics | "Data analysis, pandas, statistical modeling, visualization, Jupyter notebooks, SQL queries, data cleaning, matplotlib, data pipelines" |
| 11 | `ui-ux-design` | UI/UX Design | "User interface design, wireframes, accessibility, responsive layout, Figma, user experience, design systems, prototyping, color theory" |
| 12 | `finance-investing` | Finance & Investing | "Stock market, financial planning, budgeting, cryptocurrency, portfolio management, investment strategy, personal finance, tax planning" |
| 13 | `content-creation` | Content Creation | "Blog writing, social media content, YouTube scripts, newsletters, copywriting, content strategy, SEO writing, email marketing" |
| 14 | `language-learning` | Language Learning | "Learning Spanish, vocabulary practice, grammar correction, translation, language exchange, pronunciation, foreign language, Duolingo" |
| 15 | `gaming-gamedev` | Gaming & Game Dev | "Game mechanics, Unity, game design, RPG systems, multiplayer, Unreal Engine, game development, pixel art, game balancing" |
| 16 | `health-fitness` | Health & Fitness | "Workout routines, nutrition planning, mental health, meditation, diet plans, exercise programs, wellness, sleep optimization" |
| 17 | `marketing-growth` | Marketing & Growth | "SEO strategy, email campaigns, conversion optimization, analytics, social media marketing, growth hacking, A/B testing, funnel optimization" |
| 18 | `hardware-iot` | Hardware & IoT | "Arduino, Raspberry Pi, sensor data, embedded systems, electronics, circuit design, IoT protocols, microcontrollers, 3D printing" |

### Embedding Text Guidelines

Each embedding text should:
- Be **50–150 characters** of comma-separated keywords/phrases.
- Cover the **core concepts** that a user would discuss in this topic area.
- Include both **tools/technologies** and **activities** (e.g., "Docker containers" + "cloud deployment").
- Avoid overlap with existing probes where possible.

### Integration Notes

- Find the existing semantic probes array in the codebase and add the 10 new entries.
- Maintain the same structure and format as existing entries.
- If the existing probes use a different shape than `SemanticProbe` above, adapt the new entries to match whatever shape is already in use.

---

## File Ownership

| File | Action |
|------|--------|
| The existing semantic probes file (likely in `src/lib/` or `src/config/`) | **MODIFY** — Add 10 new probe entries to the existing array. |

**Do NOT** modify any other files. Do not change existing probe entries. Only append new ones.

**Note:** You will need to find the exact file location in the codebase. Look for an array of objects containing embedding texts or topic classification configuration. Common locations: `src/lib/analysis.ts`, `src/lib/topics.ts`, `src/config/probes.ts`, or similar.

---

## Edge Cases & Constraints

| Scenario | Expected Behavior |
|----------|-------------------|
| **Existing probes use a different interface shape** | Adapt the new entries to match whatever shape exists. The `SemanticProbe` interface above is indicative — match the real codebase. |
| **Some new topics overlap with existing ones** | Minor overlap is acceptable (e.g., "data-science" vs. "machine-learning"). The embedding similarity engine handles overlapping topics gracefully. |
| **Probe IDs conflict with existing IDs** | Use the exact IDs listed above. If any conflict exists, rename the new probe with a suffix (e.g., `data-science-analytics-v2`). |

---

## Acceptance Criteria

- [ ] Semantic probe array expanded from 8 to 18+ entries
- [ ] All 10 new probes added with appropriate embedding texts
- [ ] Existing 8 probes are unchanged
- [ ] New probe entries match the existing format/shape exactly
- [ ] No duplicate IDs
- [ ] Embedding texts are 50–150 characters and cover core concepts for each topic area
- [ ] File compiles without errors

---

## Dependencies

| Direction | Task | Relationship |
|-----------|------|-------------|
| **Depends on** | None (can start immediately) | This task only modifies configuration, not computation code |
| **Unblocks** | All Phase 1 detectors | Better topic classification improves all downstream insights, but detectors don't need to wait for this |
| **Soft dependency** | Task 1A (Temporal), Task 1D (Life Events) | These detectors produce better results with more topic coverage, but can run with the existing 8 probes |
