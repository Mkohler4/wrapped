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

  // The AI response — with markup for accents
  const AI_RESPONSE_PARTS = [
    { text: 'You code by day and write fiction by night. ' },
    { text: '73%', cls: 'ai-accent' },
    { text: ' of your creative writing happens after ' },
    { text: '10 PM', cls: 'ai-accent--warm' },
    { text: '. You\'re two different people.' },
  ];

  // Hourly ChatGPT activity (0–1), index 0 = 12 AM, peak at index 22 = 10 PM
  const USAGE_HOURS = [
    0.08, 0.04, 0.02, 0.01, 0.01, 0.02,  // 12AM–5AM
    0.06, 0.15, 0.30, 0.42, 0.45, 0.38,  // 6AM–11AM
    0.32, 0.35, 0.40, 0.38, 0.30, 0.25,  // 12PM–5PM
    0.35, 0.55, 0.72, 0.88, 1.00, 0.62,  // 6PM–11PM
  ];

  const TOTAL_MESSAGES = 20000;

  // Sample messages for featured bubbles (Phase 8)
  const SAMPLE_MESSAGES_USER = [
    'explain quantum computing',
    'write me a poem about rain',
    'debug this React hook',
    'plan a weekend trip to Tokyo',
    'how does photosynthesis work',
    'make this code faster',
    'translate this to Spanish',
    'summarize this article',
    'what should I cook tonight',
    'help me write a cover letter',
    'explain recursion like I\'m 5',
    'review my essay',
    'create a workout plan',
    'fix my CSS grid layout',
  ];

  const SAMPLE_MESSAGES_AI = [
    'Here\'s a step-by-step breakdown...',
    'Great question! Let me explain...',
    'I\'d recommend starting with...',
    'Here are 3 approaches you could try:',
    'Based on your description...',
    'The key difference is...',
    'Let me help you debug that.',
    'Here\'s an optimized version:',
    'Sure! Here\'s that poem...',
    'Consider these alternatives:',
  ];

  // Word frequency data for the word-bubble visualization (Phase 26)
  const WORD_FREQUENCY_DATA = [
    { word: 'code',         count: 3700, displayCount: '3.7k' },
    { word: 'explain',      count: 3000, displayCount: '3.0k' },
    { word: 'write',        count: 2800, displayCount: '2.8k' },
    { word: 'debug',        count: 2400, displayCount: '2.4k' },
    { word: 'function',     count: 2300, displayCount: '2.3k' },
    { word: 'help',         count: 2000, displayCount: '2.0k' },
    { word: 'create',       count: 1800, displayCount: '1.8k' },
    { word: 'plan',         count: 1700, displayCount: '1.7k' },
    { word: 'review',       count: 1500, displayCount: '1.5k' },
    { word: 'translate',    count: 1300, displayCount: '1.3k' },
    { word: 'fix',          count: 1200, displayCount: '1.2k' },
    { word: 'summarize',    count: 1000, displayCount: '1.0k' },
  ];

  // Topic color palette for the grouping animation (Phase 13/14)
  const TOPIC_COLORS = {
    coding:    { bg: 'rgba(192, 132, 252, 0.25)', text: '#c084fc', label: 'Coding' },
    writing:   { bg: 'rgba(251, 146, 60, 0.25)',  text: '#fb923c', label: 'Writing' },
    learning:  { bg: 'rgba(96, 165, 250, 0.25)',  text: '#60a5fa', label: 'Learning' },
    career:    { bg: 'rgba(52, 211, 153, 0.25)',   text: '#34d399', label: 'Career' },
    lifestyle: { bg: 'rgba(244, 114, 182, 0.25)', text: '#f472b6', label: 'Lifestyle' },
  };

  // Message counts per category
  const CATEGORY_MESSAGES = {
    coding:    847,
    writing:   412,
    learning:  634,
    career:    289,
    lifestyle: 523,
  };

  // Specific topics (drill-down from categories)
  const TOPIC_DETAILS = [
    { name: 'Real-time Systems', messages: 312, color: '#c084fc' },
    { name: 'Start-ups',         messages: 274, color: '#fb923c' },
    { name: 'Cooking',           messages: 198, color: '#34d399' },
    { name: 'Creative Writing',  messages: 156, color: '#60a5fa' },
    { name: 'Fitness & Health',  messages: 103, color: '#f472b6' },
  ];

  // Sidebar conversation list (Phase 13)
  const SIDEBAR_CONVERSATIONS = [
    { group: 'Today', items: [
      { title: 'Give me my 2025 ChatGPT Wrapped', active: true, topic: 'lifestyle' },
      { title: 'Debug this React hook', topic: 'coding' },
      { title: 'Fix my CSS grid layout', topic: 'coding' },
    ]},
    { group: 'Yesterday', items: [
      { title: 'Plan a weekend trip to Tokyo', topic: 'lifestyle' },
      { title: 'Write me a poem about rain', topic: 'writing' },
      { title: 'Explain quantum computing', topic: 'learning' },
    ]},
    { group: 'Previous 7 days', items: [
      { title: 'Help me write a cover letter', topic: 'career' },
      { title: 'Create a workout plan', topic: 'lifestyle' },
      { title: 'Summarize this article', topic: 'learning' },
      { title: 'Translate this to Spanish', topic: 'learning' },
      { title: 'What should I cook tonight', topic: 'lifestyle' },
    ]},
  ];

  // Growth insight data (Phase 17)
  const GROWTH_DATA = {
    prompt: 'Show me my growth in real-time systems',
    monthly: [
      { month: 'Jan', value: 40 },
      { month: 'Feb', value: 55 },
      { month: 'Mar', value: 72 },
      { month: 'Apr', value: 90 },
      { month: 'May', value: 108 },
      { month: 'Jun', value: 125 },
      { month: 'Jul', value: 148 },
      { month: 'Aug', value: 180 },
      { month: 'Sep', value: 178 },
      { month: 'Oct', value: 185 },
      { month: 'Nov', value: 190 },
      { month: 'Dec', value: 195 },
    ],
    message: [
      { text: 'You started with ' },
      { text: '40 conversations', cls: 'ai-accent' },
      { text: ' in January. By August you hit ' },
      { text: '180', cls: 'ai-accent--warm' },
      { text: '. You didn\'t just use ChatGPT more — you made it part of how you think. ' },
      { text: '4.5x growth', cls: 'ai-accent' },
      { text: ' in 8 months.' },
    ],
  };

  // Growth insight phase 2 — follow-up chart (Phase 19)
  const GROWTH_PHASE_2 = {
    type: 'bar',  // 'line' or 'bar'
    title: 'Real-Time Systems — Conversations by Topic',
    message: [
      { text: 'Your questions got ' },
      { text: 'progressively deeper', cls: 'ai-accent' },
      { text: '. Early on you asked setup questions — by Q3 you were designing ' },
      { text: 'distributed architectures', cls: 'ai-accent--warm' },
      { text: ' and debugging ' },
      { text: 'race conditions', cls: 'ai-accent' },
      { text: ' at scale.' },
    ],
    // Used when type === 'line'
    monthly: [
      { month: 'Jan', value: 10 },
      { month: 'Feb', value: 18 },
      { month: 'Mar', value: 32 },
      { month: 'Apr', value: 45 },
      { month: 'May', value: 58 },
      { month: 'Jun', value: 72 },
      { month: 'Jul', value: 95 },
      { month: 'Aug', value: 130 },
      { month: 'Sep', value: 142 },
      { month: 'Oct', value: 160 },
      { month: 'Nov', value: 175 },
      { month: 'Dec', value: 190 },
    ],
    // Used when type === 'bar'
    yLabel: 'conversations',
    categories: [
      { label: 'Architecture', value: 45 },
      { label: 'Pub/Sub', value: 38 },
      { label: 'WebSockets', value: 32 },
      { label: 'Debugging', value: 28 },
      { label: 'Scaling', value: 22 },
      { label: 'Security', value: 15 },
    ],
  };

  // AI message about most-used words — with accented stats (Phase 26)
  const WORDS_RESPONSE_PARTS = [
    { text: 'Here are your most used words of 2025. You said ' },
    { text: '"code"', cls: 'ai-accent' },
    { text: ' a staggering ' },
    { text: '3,700 times', cls: 'ai-accent' },
    { text: ' — that\'s roughly ' },
    { text: '10 times a day', cls: 'ai-accent--warm' },
    { text: '. Your vocabulary leaned heavily into ' },
    { text: 'technical problem-solving', cls: 'ai-accent' },
    { text: ', with ' },
    { text: '68%', cls: 'ai-accent--warm' },
    { text: ' of your top words being action verbs.' },
  ];

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

  // Award room placeholder stats (Phase 29)
  const AWARD_STATS = [
    { value: 'Jan 12, 2023', label: 'Member Since',          color: 'purple',  isDate: true },
    { value: 847,            label: 'Conversations',          color: 'blue'    },
    { value: 20000,          label: 'Messages Sent',          color: 'white'   },
    { value: 42, suffix: 'days',  label: 'Longest Streak',   color: 'emerald' },
    { value: 73, suffix: 'times', label: 'Active After Midnight', color: 'amber' },
    { value: 24,             label: 'Topics Explored',        color: 'purple'  },
    { value: 211,            label: 'Images Generated',       color: 'blue'    },
    { value: 243,            label: 'Days Active',            color: 'emerald' },
  ];

  return {
    MOBILE_MAX_WIDTH,
    PROMPT,
    CHAR_MS,
    SPACE_EXTRA,
    PAUSE_WORDS,
    AI_RESPONSE_PARTS,
    USAGE_HOURS,
    TOTAL_MESSAGES,
    SAMPLE_MESSAGES_USER,
    SAMPLE_MESSAGES_AI,
    WORD_FREQUENCY_DATA,
    WORDS_RESPONSE_PARTS,
    TOPIC_COLORS,
    CATEGORY_MESSAGES,
    TOPIC_DETAILS,
    SIDEBAR_CONVERSATIONS,
    GROWTH_DATA,
    GROWTH_PHASE_2,
    TIMINGS,
    AWARD_STATS,
  };
})();
