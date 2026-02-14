/* ============================================
   Shared configuration & data constants
   ============================================ */
window.__editorConfig = (() => {
  'use strict';

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
    AWARD_STATS,
  };
})();
