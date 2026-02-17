/* ============================================
   Shared configuration & data constants
   ============================================ */
window.__editorConfig = (() => {
  'use strict';

  // --- Responsive breakpoint ---
  // Skip the first zoom-in on viewports up to iPad Mini landscape (1133 CSS px).
  // 1180 gives a comfortable buffer above iPad Mini landscape.
  const MOBILE_MAX_WIDTH = 1180;

  // --- Typing config ---
  const PROMPT = 'Give me my 2025 ChatGPT Wrapped';
  const CHAR_MS = 44;
  const SPACE_EXTRA = 85;
  const PAUSE_WORDS = { '2025': 150 };

  // Populated by init() from data/wrapped-profile.json
  const AI_RESPONSE_PARTS = [];
  const USAGE_HOURS = [];
  const SAMPLE_MESSAGES_USER = [];
  const SAMPLE_MESSAGES_AI = [];

  // Populated by init() from data/wrapped-profile.json
  const WORD_FREQUENCY_DATA = [];

  // Populated by init() from data/wrapped-profile.json
  let TOPIC_COLORS = {};
  let CATEGORY_MESSAGES = {};
  const TOPIC_DETAILS = [];
  const SIDEBAR_CONVERSATIONS = [];

  // Populated by init() from data/wrapped-profile.json
  const GROWTH_DATA = {};
  const GROWTH_PHASE_2 = {};
  const HEATMAP_CONFIG = {};

  // Populated by init() from data/wrapped-profile.json
  const WORDS_RESPONSE_PARTS = [];
  const GENERATED_IMAGES = {};

  // ============================================
  // Animation Timings (Phases 1–11)
  // ============================================
  // Every hardcoded wait / duration lives here so
  // you can tune the overall feel in one place.
  // Times are in milliseconds unless noted.
  const TIMINGS = {
    // --- Master sequence gaps (editor.js) ---
    INITIAL_IDLE: 500,             // pause before anything starts
    GAP_AFTER_TYPE_PROMPT: 400,     // pause between typing and cursor move

    // --- Phase 1: Type prompt ---
    PHASE_1: {
      // CHAR_MS, SPACE_EXTRA, PAUSE_WORDS are separate constants above
    },

    // --- Phase 2: Move cursor to send button ---
    PHASE_2: {
      CURSOR_MOVE_MS: 600,          // CSS transition duration
      WAIT_AFTER_MOVE: 650,         // wait for transition to finish
    },

    // --- Phase 3: Click send ---
    PHASE_3: {
      PRESS_HOLD: 120,              // button pressed visual
      RELEASE_RIPPLE: 150,          // ripple animation
      CURSOR_FADE: 200,             // fake cursor fades out
    },

    // --- Phase 4: Send message (zoom out + bubble) ---
    PHASE_4: {
      ZOOM_OUT_WAIT: 400,           // wait for zoom-out CSS transition
      WELCOME_FADE_TRANSITION: 300, // CSS opacity transition ms
      WELCOME_FADE_WAIT: 300,       // wait for fade to finish
      BUBBLE_SETTLE: 50,            // tiny pause before bubble reveals
      BUBBLE_VISIBLE_HOLD: 200,     // hold after bubble appears
    },

    // --- Phase 5: Thinking dots ---
    PHASE_5: {
      NORMAL_THINKING: 250,        // calm bouncing dots
      INTENSIFY: 250,               // faster/brighter before response
    },

    // --- Phase 6: Stream AI response ---
    PHASE_6: {
      DOTS_FADE_OUT: 200,           // thinking dots opacity transition
      RESPONSE_SETTLE: 50,          // before response becomes visible
      RESPONSE_VISIBLE_WAIT: 200,   // after --visible class added
      WORD_BASE_MS: 55,             // base interval per word
      WORD_JITTER: 20,              // ±jitter range
      CURSOR_HIDE_HOLD: 200,        // pause before hiding stream cursor
    },

    // --- Phase 7: Highlight / wrap response ---
    PHASE_7: {
      INITIAL_HOLD: 300,            // let response sit before wrapping
      WRAP_SETTLE: 400,             // after --wrapped class
      GROW_SETTLE: 300,             // after --grown class
      FINAL_HOLD: 500,             // breathe before graph phase
    },

    // --- Phase 7n: Dot draws the activity graph ---
    PHASE_7N: {
      // ACT 1 — Setup
      TEXT_BREATHE: 300,            // let "You code by day…" sit
      HEADER_FOOTER_FADE: 500,      // CSS opacity transition (also used inline)
      ZOOM_LAND: 400,              // wait after zoom transform
      DOT_APPEAR: 300,              // dot breathing before awake

      // ACT 2 — Dot awakens
      DOT_AWAKE: 300,               // glow intensifies
      GRAPH_CONTAINER_SETTLE: 100,  // after graph wrap is visible
      DOT_DROP: 400,                // spring to first data point
      DOT_GROW: 200,                // overshoot scale
      TYPEWRITER_CHAR_MS: 45,       // per-character for "Creating image"
      TYPEWRITER_HOLD: 200,         // pause after text is done

      // ACT 3 — Drawing
      DRAW_PREP: 200,               // before rAF loop starts
      DRAW_DURATION: 2500,          // main graph-draw animation

      // ACT 4 — Settle + reveal
      LANDING_BOUNCE: 600,          // after draw finishes
      DOT_FADE: 500,                // dot → static marker
      LABELS_PRE_DELAY: 200,        // before title fades in
      TITLE_FADE_WAIT: 300,         // after title transition starts
      HOUR_LABEL_STAGGER: 80,       // stagger between each x-axis label
      CALLOUT_DELAY: 600,           // before peak callout appears
      COUNTER_PREP: 200,            // before peak count-up starts
      PEAK_COUNTER_DURATION: 1200,  // peak number count-up
      FINAL_HOLD: 2500,             // let user absorb the graph
      ZOOM_OUT_WAIT: 1000,          // wait for zoom-out transition
    },

    // --- Phase 8: Ghost bubble cascade ---
    PHASE_8: {
      ZOOM_OUT: 400,                // editor zoom-out wait
      TOTAL_BUBBLES: 200,           // how many bubbles to spawn
      FAST_BURST_DURATION: 4800,    // fast phase duration
      DRIFT_PX_PER_SEC: 80,         // slow drift speed (px/s)
    },

    // --- Phase 9: Compress + blur ---
    PHASE_9: {
      BLUR_SETTLE: 300,             // let blur transition start
      BACKDROP_SETTLE: 30,          // tiny reflow pause
      OVERLAP_HOLD: 350,            // let both transitions overlap
    },

    // --- Phase 10: Hero stat (20,000 messages) ---
    PHASE_10: {
      REVEAL_SETTLE: 50,            // after display appended
      ANIMATION_SETTLE: 250,        // let reveal animation start
      HERO_COUNTER_DURATION: 1800,  // 0 → 20,000 count-up
      LABEL_DELAY: 200,             // before "messages in 2025" shows
      LABEL_VISIBLE_HOLD: 500,      // after label is visible
      SPLIT_DELAY: 100,             // before you/ChatGPT split shows
      SPLIT_COUNTER_DURATION: 1200, // you + ChatGPT count-up
      FINAL_HOLD: 2500,             // absorb the stat
    },

    // --- Phase 10b: Morph 20,000 → 847 conversations ---
    PHASE_10B: {
      SPLIT_FADE_WAIT: 400,          // after split fades out
      COUNTDOWN_DURATION: 1200,      // 20,000 → 847 count-down
      LABEL_FADE_OUT: 300,           // old label fades
      LABEL_FADE_IN: 400,            // new label fades in
      GLOW_TRANSITION: 1000,         // glow color shift (CSS)
      FINAL_HOLD: 2500,              // absorb conversation count
    },

    // --- Phase 13: Open sidebar ---
    PHASE_13: {
      SIDEBAR_SLIDE_WAIT: 300,       // wait for sidebar slide-open
      ITEM_STAGGER: 40,              // stagger between each item entering
      FINAL_HOLD: 1200,              // let user read the sidebar
    },

    // --- Phase 14: Group conversations into topics ---
    PHASE_14: {
      // Step 1: Color-highlight sidebar items
      HIGHLIGHT_STAGGER: 70,         // stagger between each item highlight
      HIGHLIGHT_HOLD: 1000,          // hold after all items colored

      // Step 2: Clone + sidebar close
      SIDEBAR_CLOSE_WAIT: 550,       // wait for sidebar slide-close transition

      // Step 2c: Fly clones to columns
      CLONE_FLY_STAGGER: 120,        // stagger between each clone flying
      CLONE_FLY_SETTLE: 600,         // wait after last clone flight

      // Step 3: Column labels
      LABEL_STAGGER: 80,             // stagger between column labels
      GROUPED_HOLD: 1200,            // hold on grouped view

      // Step 6a: Merge clones into bars
      MERGE_SETTLE: 600,             // after clones compress
      MERGE_CLEANUP_WAIT: 200,       // after removing extra clones

      // Step 6b: Reposition bars
      REPOSITION_SETTLE: 700,        // after bars reach chart positions

      // Step 6c: Grow bars
      BAR_GROW_STAGGER: 300,         // stagger between bars growing
      BAR_GROW_SETTLE: 500,          // after last bar grows

      // Step 6d: Reveal labels
      LABEL_REVEAL_PRE: 50,          // before label classes added
      LABEL_REVEAL_POST: 150,        // after label animated in
      COUNT_UP_DURATION: 700,        // message count animation

      // Step 6e: Subline
      SUBLINE_PRE_DELAY: 300,        // before subline appears
      SUBLINE_SETTLE: 50,            // before subline visible class
      CATEGORY_HOLD: 2000,           // hold on category chart

      // Step 6f: Morph to specific topics
      LABELS_FADE_OUT: 350,          // old labels fade
      BARS_SHRINK: 500,              // bars shrink to thin lines
      BARS_REPOSITION: 550,          // bars reposition + recolor
      TOPIC_BAR_GROW_STAGGER: 300,   // stagger between topic bars growing
      TOPIC_BAR_GROW_SETTLE: 500,    // after last topic bar grows
      TOPIC_LABEL_PRE: 50,           // before topic label classes added
      TOPIC_LABEL_POST: 150,         // after topic label animated in
      TOPIC_SUBLINE_PRE: 300,        // before topic subline appears
      TOPIC_SUBLINE_SETTLE: 50,      // before topic subline visible class
      TOPIC_HOLD: 3000,              // hold on topic chart
    },

    // --- Phase 11: Transition stat → sidebar ---
    PHASE_11: {
      STAT_SLIDE_TRANSFORM: 2200,   // stat slides down (CSS transition)
      STAT_SLIDE_OPACITY: 2500,     // stat fades (CSS transition)
      BACKDROP_FADE: 2000,          // gradient overlay fade
      MESSAGES_SLIDE: 2500,         // messages slide down
      MESSAGES_FADE_DELAY: 1600,    // delay before messages start fading
      MESSAGES_FADE_DURATION: 2000, // messages opacity transition
      CURSOR_APPEAR_DELAY: 900,     // wait before cursor appears
      CURSOR_SETTLE: 120,           // let cursor register visually
      CURSOR_MOVE_DURATION: 1100,   // CSS transition for cursor travel
      CURSOR_MOVE_WAIT: 1200,       // wait for cursor to arrive
      CLICK_HOLD: 120,              // sidebar button press
      CLICK_RELEASE: 150,           // sidebar button release
      CURSOR_FADE: 200,             // fake cursor disappears
    },
  };

  // Populated by init() from data/wrapped-profile.json
  const AWARD_STATS = [];

  // Fetches wrapped-profile.json and patches the live arrays / config
  // object in-place so every module that already captured a reference
  // keeps working.
  async function init() {
    const resp = await fetch('data/wrapped-profile.json');
    const data = await resp.json();

    AI_RESPONSE_PARTS.push(...data.personalityInsight.parts);
    USAGE_HOURS.push(...data.hourlyActivity.usageByHour);
    SAMPLE_MESSAGES_USER.push(...data.sampleMessages.user);
    SAMPLE_MESSAGES_AI.push(...data.sampleMessages.ai);
    SIDEBAR_CONVERSATIONS.push(...data.recentConversations);
    TOPIC_DETAILS.push(...data.topTopics);
    Object.assign(TOPIC_COLORS, data.categoryColors);
    Object.assign(CATEGORY_MESSAGES, data.categoryMessageCounts);
    Object.assign(GROWTH_DATA, data.growthInsight);
    Object.assign(GROWTH_PHASE_2, data.growthDrilldown);
    Object.assign(HEATMAP_CONFIG, data.heatmap);
    WORD_FREQUENCY_DATA.push(...data.wordFrequency);
    WORDS_RESPONSE_PARTS.push(...data.wordsInsight.parts);
    Object.assign(GENERATED_IMAGES, data.generatedImages);

    // Award room: first entry is the "Member Since" date card,
    // then the numeric stat cards from the JSON.
    AWARD_STATS.push(
      { value: data.awardStats.memberSince, label: 'Member Since', color: 'purple', isDate: true },
      ...data.awardStats.stats
    );

    cfg.TOTAL_MESSAGES = data.stats.totalMessages;
    cfg.USER_MESSAGES = data.stats.userMessages;
    cfg.AI_MESSAGES = data.stats.aiMessages;
    cfg.CONVERSATIONS = data.stats.conversations;
    cfg.MEMBER_SINCE = data.awardStats.memberSince;
  }

  const cfg = {
    MOBILE_MAX_WIDTH,
    PROMPT,
    CHAR_MS,
    SPACE_EXTRA,
    PAUSE_WORDS,
    AI_RESPONSE_PARTS,
    USAGE_HOURS,
    TOTAL_MESSAGES: 0,
    USER_MESSAGES: 0,
    AI_MESSAGES: 0,
    CONVERSATIONS: 0,
    SAMPLE_MESSAGES_USER,
    SAMPLE_MESSAGES_AI,
    WORD_FREQUENCY_DATA,
    WORDS_RESPONSE_PARTS,
    GENERATED_IMAGES,
    TOPIC_COLORS,
    CATEGORY_MESSAGES,
    TOPIC_DETAILS,
    SIDEBAR_CONVERSATIONS,
    GROWTH_DATA,
    GROWTH_PHASE_2,
    HEATMAP_CONFIG,
    MEMBER_SINCE: '',
    TIMINGS,
    AWARD_STATS,
    init,
  };

  return cfg;
})();
