/* ============================================
   Editor — Full Intro Sequence
   ============================================
   1. Cursor blinks (idle)
   2. Text types, editor zooms on first char
   3. Fake mouse cursor moves to send button
   4. Click animation
   5. Zoom out, message → bubble (right side)
   6. Thinking dots appear (left side)
   7. AI response streams in word by word (left side)
   ============================================ */

(() => {
  'use strict';

  // --- DOM ---
  const editor      = document.getElementById('editor');
  const editorMain  = document.querySelector('.editor__main');
  const inputWrap   = document.getElementById('input-wrap');
  const inputText   = document.getElementById('input-text');
  const cursor      = document.getElementById('cursor');
  const placeholder = document.getElementById('placeholder');
  const sendBtn     = document.getElementById('send-btn');
  const fakeCursor  = document.getElementById('fake-cursor');

  // --- Config ---
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

  // --- Helpers ---
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  const jitter = (base, range = 12) => base + (Math.random() * range * 2 - range);

  let hasZoomed = false;
  let chatMessages = null; // container created during send

  // ============================================
  // Phase 1: Type into input
  // ============================================
  async function typePrompt() {
    let typed = '';
    for (let i = 0; i < PROMPT.length; i++) {
      const ch = PROMPT[i];
      typed += ch;
      inputText.textContent = typed;

      if (i === 0 && !hasZoomed) {
        hasZoomed = true;
        placeholder.classList.add('editor__placeholder--hidden');
        editor.classList.add('editor--zoomed');
        inputWrap.classList.add('editor__input-wrap--expanded');
        sendBtn.classList.add('editor__send-btn--active');
      }

      let delay = jitter(CHAR_MS);
      if (ch === ' ') delay += SPACE_EXTRA;

      for (const [word, pause] of Object.entries(PAUSE_WORDS)) {
        if (typed.endsWith(word) && (i + 1 >= PROMPT.length || PROMPT[i + 1] === ' ')) {
          delay += pause;
        }
      }
      await wait(delay);
    }
  }

  // ============================================
  // Phase 2: Fake cursor → send button
  // ============================================
  async function moveCursorToSend() {
    cursor.classList.add('editor__cursor--hidden');

    const btnRect = sendBtn.getBoundingClientRect();
    const textRect = inputText.getBoundingClientRect();

    fakeCursor.style.left = `${textRect.right + 10}px`;
    fakeCursor.style.top = `${textRect.top + textRect.height / 2}px`;
    fakeCursor.style.transition = 'none';
    fakeCursor.classList.add('fake-cursor--visible');
    fakeCursor.offsetHeight;

    fakeCursor.style.transition = 'left 0.6s cubic-bezier(0.4, 0, 0.15, 1), top 0.6s cubic-bezier(0.4, 0, 0.15, 1)';
    fakeCursor.style.left = `${btnRect.left + btnRect.width / 2 - 3}px`;
    fakeCursor.style.top = `${btnRect.top + btnRect.height / 2 - 3}px`;

    await wait(650);
  }

  // ============================================
  // Phase 3: Click send button
  // ============================================
  async function clickSend() {
    sendBtn.classList.add('editor__send-btn--pressed');
    await wait(120);

    sendBtn.classList.remove('editor__send-btn--pressed');
    sendBtn.classList.add('editor__send-btn--released', 'editor__send-btn--ripple');
    sendBtn.style.position = 'relative';
    await wait(150);

    fakeCursor.classList.remove('fake-cursor--visible');
    await wait(200);

    sendBtn.classList.remove('editor__send-btn--ripple', 'editor__send-btn--released');
  }

  // ============================================
  // Phase 4: Zoom out + user message bubble
  // ============================================
  async function sendMessage() {
    const messageText = inputText.textContent;

    // Clear input
    inputText.textContent = '';
    placeholder.classList.remove('editor__placeholder--hidden');
    sendBtn.classList.remove('editor__send-btn--active');
    inputWrap.classList.remove('editor__input-wrap--expanded');

    // Zoom out
    editor.classList.remove('editor--zoomed');
    await wait(400);

    // Hide welcome
    const welcome = document.querySelector('.editor__welcome');
    welcome.style.transition = 'opacity 0.3s ease';
    welcome.style.opacity = '0';
    await wait(300);
    welcome.style.display = 'none';

    // Set up the chat messages container
    editorMain.style.justifyContent = 'flex-start';
    editorMain.style.alignItems = 'stretch';

    chatMessages = document.createElement('div');
    chatMessages.className = 'chat-messages';
    editorMain.appendChild(chatMessages);

    // Add user bubble
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble';
    bubble.textContent = messageText;
    chatMessages.appendChild(bubble);

    await wait(50);
    bubble.classList.add('chat-bubble--visible');
    await wait(500);
  }

  // ============================================
  // Phase 5: Thinking dots (left side)
  // ============================================
  async function showThinkingDots() {
    const thinking = document.createElement('div');
    thinking.className = 'chat-thinking';
    for (let i = 0; i < 3; i++) {
      const dot = document.createElement('span');
      dot.className = 'chat-thinking__dot';
      thinking.appendChild(dot);
    }
    chatMessages.appendChild(thinking);

    // Normal thinking
    await wait(1500);

    // Intensify
    thinking.classList.add('chat-thinking--intense');
    await wait(600);

    return thinking;
  }

  // ============================================
  // Phase 6: AI response streams in word-by-word
  // ============================================
  async function streamAIResponse(thinkingDots) {
    // Remove thinking dots
    thinkingDots.style.transition = 'opacity 0.2s ease';
    thinkingDots.style.opacity = '0';
    await wait(200);
    thinkingDots.remove();

    // Create the response element
    const response = document.createElement('div');
    response.className = 'chat-ai-response';

    const textContainer = document.createElement('span');
    response.appendChild(textContainer);

    const streamCursor = document.createElement('span');
    streamCursor.className = 'chat-ai-response__cursor';
    response.appendChild(streamCursor);

    chatMessages.appendChild(response);

    await wait(50);
    response.classList.add('chat-ai-response--visible');
    await wait(200);

    // Stream each part word-by-word
    for (const part of AI_RESPONSE_PARTS) {
      const words = part.text.split(/(\s+)/);

      for (const word of words) {
        if (!word) continue;

        if (part.cls) {
          const span = document.createElement('span');
          span.className = part.cls;
          span.textContent = word;
          textContainer.appendChild(span);
        } else {
          textContainer.appendChild(document.createTextNode(word));
        }

        if (word.trim()) {
          await wait(jitter(55, 20));
        }
      }
    }

    // Done streaming — hide cursor
    await wait(400);
    streamCursor.classList.add('chat-ai-response__cursor--hidden');

    return response;
  }

  // ============================================
  // Phase 7: Wrap in bubble → grow → zoom in
  // ============================================
  async function highlightResponse(response) {
    await wait(800);

    response.classList.add('chat-ai-response--wrapped');
    await wait(700);
    response.classList.add('chat-ai-response--grown');
    await wait(500);
    editor.classList.add('editor--zoomed-response');
    await wait(1000); // Hold for a moment before cascade
  }

  // ============================================
  // Phase 8: Ghost bubbles cascade (colorful)
  // ============================================

  // Sample messages for featured bubbles
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

  // Asymmetric easing: slow ramp-up, fast cruise, quick ease-out.
  // Returns a value in [0, 1] for input t in [0, 1].
  function cascadeEasing(t) {
    // Phase boundaries (in time)
    const rampEnd = 0.38;   // 38% of duration: slow ease-in
    const decelStart = 0.88; // last 12% of duration: quick ease-out

    if (t <= rampEnd) {
      // Slow ease-in (cubic)
      const p = t / rampEnd;
      const eased = p * p * p;
      return eased * 0.2; // covers 0–20% of scroll distance
    } else if (t <= decelStart) {
      // Linear cruise (fast, constant speed)
      const p = (t - rampEnd) / (decelStart - rampEnd);
      return 0.2 + p * 0.7; // covers 20–90% of scroll distance
    } else {
      // Quick ease-out (cubic)
      const p = (t - decelStart) / (1 - decelStart);
      const eased = 1 - Math.pow(1 - p, 3);
      return 0.9 + eased * 0.1; // covers 90–100% of scroll distance
    }
  }

  async function cascadeMessages() {
    // Zoom back out so we can see the cascade filling
    editor.classList.remove('editor--zoomed-response');
    await wait(400);

    // Reduce gap so ghosts pack tighter
    chatMessages.style.gap = '6px';

    // Promote to GPU layer early so blur compositing doesn't stutter later
    chatMessages.style.willChange = 'filter, opacity';

    // --- Bubble creation + scroll in a single rAF loop ---
    // Easing maps time → progress (0-1). Progress maps to a target bubble
    // count. Each frame we create any missing bubbles (with their pop-in
    // animation) and scroll to the bottom once. During cruise the loop
    // creates several bubbles per frame; during ramp/decel fewer or none.
    const totalBubbles = 150;
    const duration = 5200;
    let bubbleCount = 0;
    let userMsgIdx = 0;
    let aiMsgIdx = 0;
    let footerHidden = false;
    let blurStarted = false;

    function createBubble() {
      const ghost = document.createElement('div');
      const isUser = Math.random() > 0.4;
      const sideClass = isUser ? 'ghost-bubble--user' : 'ghost-bubble--ai';
      const isFeatured = Math.random() < 0.15;

      if (isFeatured) {
        ghost.className = `ghost-bubble ${sideClass} ghost-bubble--featured`;
        if (isUser) {
          ghost.textContent = SAMPLE_MESSAGES_USER[userMsgIdx % SAMPLE_MESSAGES_USER.length];
          userMsgIdx++;
        } else {
          ghost.textContent = SAMPLE_MESSAGES_AI[aiMsgIdx % SAMPLE_MESSAGES_AI.length];
          aiMsgIdx++;
        }
        ghost.style.height = `${20 + Math.random() * 6}px`;
        ghost.style.width = `${45 + Math.random() * 40}%`;
        ghost.style.opacity = `${0.45 + Math.random() * 0.25}`;
      } else {
        ghost.className = `ghost-bubble ${sideClass}`;
        ghost.style.width = `${30 + Math.random() * 55}%`;
        ghost.style.height = `${12 + Math.random() * 6}px`;
        ghost.style.opacity = `${0.25 + Math.random() * 0.35}`;
      }

      chatMessages.appendChild(ghost);
      bubbleCount++;
    }

    await new Promise(resolve => {
      const startTime = performance.now();

      function tick(now) {
        const elapsed = now - startTime;
        const t = Math.min(elapsed / duration, 1);
        const eased = cascadeEasing(t);

        // How many bubbles should exist at this point in time
        const targetCount = Math.min(totalBubbles, Math.ceil(eased * totalBubbles));

        // Create any missing bubbles (they animate in via CSS ghostAppear)
        while (bubbleCount < targetCount) {
          createBubble();
        }

        // Scroll to bottom (one read-write per frame — clean)
        editorMain.scrollTop = editorMain.scrollHeight;

        // Hide footer at ~35% progress
        if (!footerHidden && eased > 0.35) {
          footerHidden = true;
          const footer = document.querySelector('.editor__footer');
          footer.classList.add('editor__footer--hidden');
        }

        // Start blur at ~90% progress (during the quick decel)
        if (!blurStarted && eased > 0.9) {
          blurStarted = true;
          chatMessages.classList.add('chat-messages--blurred');
        }

        if (t < 1) {
          requestAnimationFrame(tick);
        } else {
          resolve();
        }
      }

      requestAnimationFrame(tick);
    });
  }

  // ============================================
  // Phase 9: Soften into backdrop, fade chrome
  // ============================================
  async function compressAndBlur() {
    // Blur was already applied during the cascade's decel phase.
    // chatMessages stays in normal flow — no layout changes here.

    await wait(400);

    // Add the gradient overlay so stat text will be readable
    const backdrop = document.createElement('div');
    backdrop.className = 'stat-backdrop';
    editorMain.appendChild(backdrop);

    // Fade in the overlay
    await wait(50);
    backdrop.classList.add('stat-backdrop--visible');
    await wait(350);
  }

  // ============================================
  // Phase 10: Hero stat — 20,000 messages
  // ============================================
  function formatNumber(n) {
    return n.toLocaleString('en-US');
  }

  function animateCounter(el, target, duration = 1500, from = 0) {
    return new Promise(resolve => {
      const startTime = performance.now();
      const range = target - from;
      function tick(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Ease-out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        const value = Math.round(from + eased * range);
        el.textContent = formatNumber(value);
        if (progress < 1) {
          requestAnimationFrame(tick);
        } else {
          el.textContent = formatNumber(target);
          resolve();
        }
      }
      requestAnimationFrame(tick);
    });
  }

  async function showHeroStat() {
    // chatMessages stays as the colorful backdrop (absolutely positioned)
    // stat display will also be absolutely centered on top

    // Build the stat display (sits on top via z-index)
    const statDisplay = document.createElement('div');
    statDisplay.className = 'stat-display';

    // Ambient glow behind the number
    const glow = document.createElement('div');
    glow.className = 'stat-hero__glow';

    // Hero number
    const heroNum = document.createElement('div');
    heroNum.className = 'stat-hero__number';
    heroNum.textContent = '0';

    // Label
    const heroLabel = document.createElement('div');
    heroLabel.className = 'stat-hero__label';
    heroLabel.textContent = 'messages in 2025';

    // Split
    const split = document.createElement('div');
    split.className = 'stat-split';

    // You
    const youItem = document.createElement('div');
    youItem.className = 'stat-split__item';
    const youNum = document.createElement('div');
    youNum.className = 'stat-split__number stat-split__number--user';
    youNum.textContent = '0';
    const youLabel = document.createElement('div');
    youLabel.className = 'stat-split__label';
    youLabel.textContent = 'You';
    youItem.appendChild(youNum);
    youItem.appendChild(youLabel);

    // Dot
    const dot = document.createElement('div');
    dot.className = 'stat-split__dot';

    // ChatGPT
    const aiItem = document.createElement('div');
    aiItem.className = 'stat-split__item';
    const aiNum = document.createElement('div');
    aiNum.className = 'stat-split__number stat-split__number--ai';
    aiNum.textContent = '0';
    const aiLabel = document.createElement('div');
    aiLabel.className = 'stat-split__label';
    aiLabel.textContent = 'ChatGPT';
    aiItem.appendChild(aiNum);
    aiItem.appendChild(aiLabel);

    split.appendChild(youItem);
    split.appendChild(dot);
    split.appendChild(aiItem);

    statDisplay.appendChild(glow);
    statDisplay.appendChild(heroNum);
    statDisplay.appendChild(heroLabel);
    statDisplay.appendChild(split);
    editorMain.appendChild(statDisplay);

    // Reveal the stat display + glow
    await wait(100);
    statDisplay.classList.add('stat-display--visible');
    glow.classList.add('stat-hero__glow--visible');

    // Now that the gradient overlay + stat fully cover the bubbles,
    // silently switch chatMessages to absolute backdrop mode for
    // the later transition animations. No visual change — it's hidden.
    chatMessages.classList.add('chat-messages--backdrop');
    chatMessages.classList.add('chat-messages--drifting');

    // Count up hero number
    await animateCounter(heroNum, 20000, 1800);

    // Show the label
    await wait(200);
    heroLabel.classList.add('stat-hero__label--visible');
    await wait(500);

    // Show the split and count both
    split.classList.add('stat-split--visible');
    await wait(100);
    await Promise.all([
      animateCounter(youNum, 8000, 1200),
      animateCounter(aiNum, 12000, 1200),
    ]);

    // Hold for a moment before transitioning
    await wait(2500);
  }

  // ============================================
  // Phase 10b: Morph stat → conversations count
  // The hero number counts down from 20,000 to 847,
  // the label cross-fades, split stats fade out.
  // ============================================
  async function morphToConversations() {
    const heroNum   = document.querySelector('.stat-hero__number');
    const heroLabel = document.querySelector('.stat-hero__label');
    const split     = document.querySelector('.stat-split');
    const glow      = document.querySelector('.stat-hero__glow');

    if (!heroNum || !heroLabel) return;

    // --- Step 1: Fade out the You / ChatGPT split ---
    // Remove the animation class so inline styles take effect,
    // then pin current values before transitioning.
    if (split) {
      split.classList.remove('stat-split--visible');
      split.style.opacity = '1';
      split.style.transform = 'translateY(0)';
      split.offsetHeight; // reflow

      split.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
      split.style.opacity = '0';
      split.style.transform = 'translateY(8px)';
    }
    await wait(400);

    // --- Step 2: Count down hero number  20,000 → 847 ---
    // Use a faster ease-in so the big digits spin quickly, then
    // settle on the smaller number.
    await animateCounter(heroNum, 847, 1200, 20000);

    // --- Step 3: Cross-fade the label ---
    // Remove animation class so we can control opacity with inline styles
    heroLabel.classList.remove('stat-hero__label--visible');
    heroLabel.style.opacity = '1';
    heroLabel.offsetHeight; // reflow

    heroLabel.style.transition = 'opacity 0.3s ease';
    heroLabel.style.opacity = '0';
    await wait(300);

    // Swap text and fade in
    heroLabel.textContent = 'conversations in 2025';
    heroLabel.style.transition = 'opacity 0.4s ease';
    heroLabel.style.opacity = '1';
    await wait(400);

    // --- Step 4: Subtle glow color shift (optional flourish) ---
    if (glow) {
      glow.style.transition = 'background 1s ease';
      glow.style.background = `radial-gradient(
        ellipse at center,
        rgba(96, 165, 250, 0.22) 0%,
        rgba(192, 132, 252, 0.14) 40%,
        transparent 70%
      )`;
    }

    // Hold on the conversations number
    await wait(2500);
  }

  // ============================================
  // Phase 11+12: Transition from stat → sidebar
  // Scroll-up effect (content slides down as if
  // being left behind), cursor moves to sidebar
  // button — all in one fluid motion.
  // ============================================
  async function transitionToSidebar() {
    const statDisplay = document.querySelector('.stat-display');
    const glow = document.querySelector('.stat-hero__glow');
    const backdrop = document.querySelector('.stat-backdrop');
    const sidebarBtn = document.querySelector('.editor__sidebar-btn');

    // --- Step 1: Begin the "scroll up" by sliding content downward ---
    // The stat and backdrop messages drift downward as if the viewport
    // is panning up, leaving them behind.

    // Kill the glow
    if (glow) {
      glow.classList.remove('stat-hero__glow--visible');
    }

    // Stat: remove the reveal animation so inline styles take effect,
    // pin the current visual state, then slide it down
    if (statDisplay) {
      statDisplay.classList.remove('stat-display--visible');
      statDisplay.style.opacity = '1';
      statDisplay.style.transform = 'translate(-50%, -50%) scale(1)';
      statDisplay.offsetHeight; // reflow — lock the starting position

      statDisplay.style.transition =
        'transform 2.2s cubic-bezier(0.4, 0, 0.2, 1), opacity 2.5s ease';
      statDisplay.style.transform = 'translate(-50%, 80%) scale(0.92)';
      statDisplay.style.opacity = '0';
    }

    // Backdrop gradient overlay fades slowly
    if (backdrop) {
      backdrop.style.transition = 'opacity 2s ease';
      backdrop.style.opacity = '0';
    }

    // Messages: stop the drift animation, pin position, slide down.
    // The opacity fade is DELAYED so the bubbles stay visible while
    // the stat slides away and the cursor begins moving.
    if (chatMessages) {
      chatMessages.classList.remove('chat-messages--drifting');
      chatMessages.style.transform = 'translateX(-50%) translateY(0)';
      chatMessages.offsetHeight; // reflow

      // Slide down immediately (parallax "left behind" effect)
      chatMessages.style.transition =
        'transform 2.5s cubic-bezier(0.4, 0, 0.2, 1)';
      chatMessages.style.transform = 'translateX(-50%) translateY(70%)';

      // Delay the fade — start it 1.6s later, over 2s
      setTimeout(() => {
        if (chatMessages) {
          chatMessages.style.transition =
            'transform 2.5s cubic-bezier(0.4, 0, 0.2, 1), opacity 2s ease';
          chatMessages.style.opacity = '0';
        }
      }, 1600);
    }

    // --- Step 2: After scroll-up is clearly visible, bring in the cursor ---
    await wait(900);

    // Cursor appears from center area
    fakeCursor.style.transition = 'none';
    fakeCursor.style.left = `${window.innerWidth * 0.45}px`;
    fakeCursor.style.top = `${window.innerHeight * 0.4}px`;
    fakeCursor.classList.add('fake-cursor--visible');
    fakeCursor.offsetHeight; // reflow

    await wait(120); // brief moment so cursor registers visually

    // Animate cursor toward the sidebar button (top-left)
    const btnRect = sidebarBtn.getBoundingClientRect();
    fakeCursor.style.transition =
      'left 1.1s cubic-bezier(0.4, 0, 0.15, 1), top 1.1s cubic-bezier(0.4, 0, 0.15, 1)';
    fakeCursor.style.left = `${btnRect.left + btnRect.width / 2 - 3}px`;
    fakeCursor.style.top  = `${btnRect.top  + btnRect.height / 2 - 3}px`;

    await wait(1200); // wait for cursor to arrive

    // --- Step 3: Click the sidebar button ---
    sidebarBtn.style.transition = 'transform 0.1s ease, background 0.1s ease';
    sidebarBtn.style.transform = 'scale(0.85)';
    sidebarBtn.style.background = 'rgba(255, 255, 255, 0.1)';
    await wait(120);

    // Release
    sidebarBtn.style.transform = 'scale(1)';
    sidebarBtn.style.background = 'transparent';
    await wait(150);

    // Hide cursor
    fakeCursor.classList.remove('fake-cursor--visible');
    await wait(200);

    // --- Step 4: Deferred cleanup ---
    // Don't rip elements out immediately — let them finish fading
    // while the sidebar begins opening.
    if (statDisplay) statDisplay.remove();
    if (backdrop) backdrop.remove();
    // chatMessages stays in the DOM and is cleaned up after sidebar opens
  }

  // ============================================
  // Phase 13: Open sidebar with conversation list
  // ============================================

  // Topic color palette for the grouping animation
  const TOPIC_COLORS = {
    coding:    { bg: 'rgba(192, 132, 252, 0.25)', text: '#c084fc', label: 'Coding' },
    writing:   { bg: 'rgba(251, 146, 60, 0.25)',  text: '#fb923c', label: 'Writing' },
    learning:  { bg: 'rgba(96, 165, 250, 0.25)',  text: '#60a5fa', label: 'Learning' },
    career:    { bg: 'rgba(52, 211, 153, 0.25)',   text: '#34d399', label: 'Career' },
    lifestyle: { bg: 'rgba(244, 114, 182, 0.25)', text: '#f472b6', label: 'Lifestyle' },
  };

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

  async function openSidebar() {
    const sidebar = document.getElementById('sidebar');
    const sidebarList = document.getElementById('sidebar-list');

    // Build the conversation list — store topic data on each item
    const allItems = [];
    for (const group of SIDEBAR_CONVERSATIONS) {
      const groupLabel = document.createElement('div');
      groupLabel.className = 'sidebar__group';
      groupLabel.textContent = group.group;
      sidebarList.appendChild(groupLabel);

      for (const conv of group.items) {
        const item = document.createElement('div');
        item.className = 'sidebar__item';
        if (conv.active) item.classList.add('sidebar__item--active');
        item.textContent = conv.title;
        item.dataset.topic = conv.topic;
        sidebarList.appendChild(item);
        allItems.push(item);
      }
    }

    // Slide the sidebar open
    sidebar.classList.add('editor__sidebar--open');
    editor.classList.add('editor--sidebar-open');
    await wait(300);

    // Stagger the conversation items in
    for (let i = 0; i < allItems.length; i++) {
      allItems[i].classList.add('sidebar__item--entering');
      await wait(40);
    }

    // Clean up the old backdrop messages now that the sidebar is the focus
    if (chatMessages) {
      chatMessages.remove();
      chatMessages = null;
    }

    // Hold so user can read the sidebar
    await wait(1200);

    return allItems;
  }

  // ============================================
  // Phase 14: Group conversations into topics
  // Sidebar stays visible; clones are "pulled out"
  // one-by-one like dealing cards, then organized
  // by topic. Sidebar closes afterward.
  // ============================================
  async function groupConversations(sidebarItems) {
    const sidebar = document.getElementById('sidebar');
    const allClones = [];       // { clone, topic }
    const allLabels = [];       // topic column label elements

    // --- Step 1: Color-highlight sidebar items by topic ---
    for (let i = 0; i < sidebarItems.length; i++) {
      const item = sidebarItems[i];
      const topic = item.dataset.topic;
      const color = TOPIC_COLORS[topic];
      if (color) {
        item.style.transition = 'border-left 0.25s ease, background 0.25s ease';
        item.style.borderLeft = `3px solid ${color.text}`;
        item.style.background = color.bg;
      }
      await wait(70);
    }

    // Hold so user can see the color grouping
    await wait(1000);

    // --- Pre-compute topic layout ---
    const topicCounts = {};
    for (const item of sidebarItems) {
      const t = item.dataset.topic;
      topicCounts[t] = (topicCounts[t] || 0) + 1;
    }
    const rankedTopics = Object.entries(topicCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([topic], i) => ({ topic, rank: i + 1 }));

    // Compute target columns inside the main area (sidebar still open)
    const mainRect = editorMain.getBoundingClientRect();
    const colPad = 10;
    const usableWidth = mainRect.width - colPad * 2;
    const colWidth = usableWidth / rankedTopics.length;
    const topicTargets = {};
    rankedTopics.forEach((t, i) => {
      topicTargets[t.topic] = {
        centerX: mainRect.left + colPad + colWidth * i + colWidth / 2,
        startY: mainRect.top + 50,   // leave room for column label
        nextSlot: 0,
      };
    });

    // --- Step 2: Pull out clones one-by-one ---
    for (let i = 0; i < sidebarItems.length; i++) {
      const item = sidebarItems[i];
      const topic = item.dataset.topic;
      const color = TOPIC_COLORS[topic];
      const rect = item.getBoundingClientRect();

      // Create floating clone
      const clone = document.createElement('div');
      clone.className = 'topic-clone';
      clone.textContent = item.textContent;
      clone.style.position = 'fixed';
      clone.style.left = `${rect.left}px`;
      clone.style.top = `${rect.top}px`;
      clone.style.width = `${rect.width}px`;
      clone.style.height = `${rect.height}px`;
      if (color) {
        clone.style.borderLeft = `3px solid ${color.text}`;
        clone.style.background = color.bg;
        clone.style.color = 'rgba(255, 255, 255, 0.85)';
      }
      document.body.appendChild(clone);

      // Collapse the original sidebar item out — looks physically extracted
      item.style.transition = 'opacity 0.25s ease, height 0.25s ease 0.05s, padding 0.25s ease 0.05s, margin 0.25s ease 0.05s';
      item.style.opacity = '0';
      item.style.height = '0';
      item.style.padding = '0';
      item.style.margin = '0';
      item.style.overflow = 'hidden';

      // Force reflow so the clone starts at its sidebar position
      clone.offsetHeight;

      // Fly clone to its target column in the main area
      const target = topicTargets[topic];
      const targetX = target.centerX - (colWidth - 16) / 2;
      const targetY = target.startY + 24 + target.nextSlot * 30;
      target.nextSlot++;

      clone.style.transition = 'left 0.7s cubic-bezier(0.4, 0, 0.15, 1), top 0.7s cubic-bezier(0.4, 0, 0.15, 1), width 0.7s ease, height 0.7s ease';
      clone.style.left = `${targetX}px`;
      clone.style.top = `${targetY}px`;
      clone.style.width = `${colWidth - 16}px`;
      clone.style.height = '24px';

      allClones.push({ clone, topic });

      // Stagger — like dealing cards
      await wait(120);
    }

    // Wait for the last clone's flight to finish
    await wait(600);

    // --- Step 3: Topic column labels ---
    for (const rt of rankedTopics) {
      const color = TOPIC_COLORS[rt.topic];
      const target = topicTargets[rt.topic];
      const lbl = document.createElement('div');
      lbl.className = 'topic-column-label';
      lbl.textContent = color.label;
      lbl.style.position = 'fixed';
      lbl.style.left = `${target.centerX - (colWidth - 16) / 2}px`;
      lbl.style.top = `${target.startY}px`;
      lbl.style.width = `${colWidth - 16}px`;
      lbl.style.color = color.text;
      document.body.appendChild(lbl);
      allLabels.push(lbl);

      // Stagger label appearances
      await wait(80);
      lbl.classList.add('topic-column-label--visible');
    }

    // Hold so user can read the grouped view
    await wait(1200);

    // --- Step 4: Close the sidebar ---
    sidebar.classList.remove('editor__sidebar--open');
    editor.classList.remove('editor--sidebar-open');
    await wait(600);

    // --- Step 5: Re-center clones after sidebar closes ---
    const newMainRect = editorMain.getBoundingClientRect();
    const newUsable = newMainRect.width - colPad * 2;
    const newColWidth = newUsable / rankedTopics.length;

    // Recalculate target positions for full-width layout
    const newTargets = {};
    rankedTopics.forEach((t, i) => {
      newTargets[t.topic] = {
        centerX: newMainRect.left + colPad + newColWidth * i + newColWidth / 2,
        startY: newMainRect.top + 50,
        nextSlot: 0,
      };
    });

    // Slide clones and labels to new centered positions
    for (const { clone, topic } of allClones) {
      const nt = newTargets[topic];
      const nx = nt.centerX - (newColWidth - 16) / 2;
      const ny = nt.startY + 24 + nt.nextSlot * 30;
      nt.nextSlot++;

      clone.style.transition = 'left 0.5s cubic-bezier(0.4, 0, 0.15, 1), top 0.5s ease, width 0.5s ease';
      clone.style.left = `${nx}px`;
      clone.style.top = `${ny}px`;
      clone.style.width = `${newColWidth - 16}px`;
    }
    // Slide labels too
    rankedTopics.forEach((rt, i) => {
      const nt = newTargets[rt.topic];
      const lbl = allLabels[i];
      lbl.style.transition = 'left 0.5s cubic-bezier(0.4, 0, 0.15, 1), width 0.5s ease';
      lbl.style.left = `${nt.centerX - (newColWidth - 16) / 2}px`;
      lbl.style.width = `${newColWidth - 16}px`;
    });

    await wait(600);

    // --- Step 6a: Merge clones into one bar per topic ---
    // For each topic, collapse all its clones to the same Y position,
    // shrink height, and hide text — so they overlap into one thick bar.
    const maxCount = Math.max(...Object.values(topicCounts));

    // Group clones by topic
    const clonesByTopic = {};
    for (const { clone, topic } of allClones) {
      if (!clonesByTopic[topic]) clonesByTopic[topic] = [];
      clonesByTopic[topic].push(clone);
    }

    // Fade out column labels simultaneously
    for (const lbl of allLabels) {
      lbl.style.transition = 'opacity 0.4s ease';
      lbl.style.opacity = '0';
    }

    // For each topic, compress all clones to the first clone's position
    for (const rt of rankedTopics) {
      const clones = clonesByTopic[rt.topic];
      if (!clones || clones.length === 0) continue;
      const color = TOPIC_COLORS[rt.topic];

      // Target: first clone's left/top position
      const firstRect = clones[0].getBoundingClientRect();
      const mergeY = firstRect.top;
      const mergeX = firstRect.left;
      const mergeW = parseFloat(clones[0].style.width);

      for (const c of clones) {
        c.style.transition = 'top 0.5s cubic-bezier(0.4, 0, 0.15, 1), height 0.5s ease, font-size 0.3s ease, padding 0.3s ease, border-radius 0.3s ease, background 0.3s ease, border-left 0.3s ease';
        c.style.top = `${mergeY}px`;
        c.style.height = '8px';
        c.style.fontSize = '0px';
        c.style.padding = '0';
        c.style.overflow = 'hidden';
        c.style.borderRadius = '4px';
        c.style.borderLeft = 'none';
        c.style.background = color ? color.text : 'rgba(255,255,255,0.2)';
      }
    }

    await wait(600);

    // Remove all but one clone per topic (keep the first as the "bar")
    const topicBars = []; // { bar (DOM element), topic, rank }
    for (const rt of rankedTopics) {
      const clones = clonesByTopic[rt.topic];
      if (!clones) continue;
      const bar = clones[0];
      // Remove extra clones
      for (let j = 1; j < clones.length; j++) {
        clones[j].remove();
      }
      topicBars.push({ bar, topic: rt.topic, rank: rt.rank });
    }

    // Clean up labels
    for (const lbl of allLabels) lbl.remove();

    await wait(200);

    // --- Step 6b: Reposition bars into centered vertical chart ---
    const chartRect = editorMain.getBoundingClientRect();
    const chartLeft = chartRect.left + chartRect.width * 0.15; // 15% left margin
    const chartMaxWidth = chartRect.width * 0.7;               // bars use up to 70%
    const barHeight = 36;
    const barGap = 56;   // gap between bar rows (room for labels)
    const totalChartHeight = topicBars.length * barHeight + (topicBars.length - 1) * barGap;
    const chartTopY = chartRect.top + (chartRect.height - totalChartHeight) / 2;

    // Move each bar to its chart row, but start at 0 width
    for (let i = 0; i < topicBars.length; i++) {
      const { bar } = topicBars[i];
      const rowY = chartTopY + i * (barHeight + barGap);

      bar.style.transition = 'left 0.6s cubic-bezier(0.4, 0, 0.15, 1), top 0.6s cubic-bezier(0.4, 0, 0.15, 1), width 0.6s ease, height 0.6s ease, border-radius 0.4s ease';
      bar.style.left = `${chartLeft}px`;
      bar.style.top = `${rowY}px`;
      bar.style.width = '4px'; // starts as a thin line
      bar.style.height = `${barHeight}px`;
      bar.style.borderRadius = '8px';
      bar.style.opacity = '1';
    }

    await wait(700);

    // --- Step 6c: Grow bars proportionally (staggered) ---
    for (let i = 0; i < topicBars.length; i++) {
      const { bar, topic } = topicBars[i];
      const count = topicCounts[topic];
      const barWidth = (count / maxCount) * chartMaxWidth;

      bar.style.transition = 'width 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)'; // overshoot easing
      bar.style.width = `${barWidth}px`;

      await wait(300);
    }

    // Wait for the last bar to finish growing
    await wait(500);

    // --- Step 6d: Reveal labels beside each bar ---
    // Create label elements for each bar row
    const barLabelEls = [];
    for (let i = 0; i < topicBars.length; i++) {
      const { bar, topic, rank } = topicBars[i];
      const color = TOPIC_COLORS[topic];
      const count = topicCounts[topic];
      const rowY = chartTopY + i * (barHeight + barGap);

      // Rank label — sits above the bar
      const rankEl = document.createElement('div');
      rankEl.className = 'topic-bar__rank';
      rankEl.textContent = `#${rank}`;
      rankEl.style.position = 'fixed';
      rankEl.style.left = `${chartLeft}px`;
      rankEl.style.top = `${rowY - 20}px`;
      document.body.appendChild(rankEl);
      barLabelEls.push(rankEl);

      // Topic name — right of the bar
      const barRight = parseFloat(bar.style.left) + parseFloat(bar.style.width);
      const nameEl = document.createElement('div');
      nameEl.className = 'topic-bar__name';
      nameEl.textContent = color.label;
      nameEl.style.position = 'fixed';
      nameEl.style.left = `${barRight + 14}px`;
      nameEl.style.top = `${rowY}px`;
      nameEl.style.lineHeight = `${barHeight}px`;
      nameEl.style.color = color.text;
      document.body.appendChild(nameEl);
      barLabelEls.push(nameEl);

      // Count badge — next to topic name
      const countEl = document.createElement('div');
      countEl.className = 'topic-bar__count';
      countEl.textContent = count;
      countEl.style.position = 'fixed';
      countEl.style.left = `${barRight + 14 + color.label.length * 14 + 12}px`;
      countEl.style.top = `${rowY + (barHeight - 22) / 2}px`;
      document.body.appendChild(countEl);
      barLabelEls.push(countEl);

      // Stagger the label reveal
      await wait(50);
      rankEl.classList.add('topic-bar__rank--visible');
      nameEl.classList.add('topic-bar__name--visible');
      countEl.classList.add('topic-bar__count--visible');

      await wait(150);
    }

    // --- Step 6e: Subline ---
    await wait(300);
    const subline = document.createElement('div');
    subline.className = 'topic-bar__subline';
    const sublineY = chartTopY + topicBars.length * (barHeight + barGap) + 10;
    subline.textContent = 'Your most talked-about topics in 2025';
    subline.style.position = 'fixed';
    subline.style.left = `${chartRect.left}px`;
    subline.style.width = `${chartRect.width}px`;
    subline.style.top = `${sublineY}px`;
    document.body.appendChild(subline);
    barLabelEls.push(subline);
    await wait(50);
    subline.classList.add('topic-bar__subline--visible');

    // Hold on the bar chart
    await wait(3000);

    // Return references for the next phase to collapse
    return { topicBars, barLabelEls, topicCounts, chartRect: editorMain.getBoundingClientRect() };
  }

  // ============================================
  // Growth insight data
  // ============================================
  const GROWTH_DATA = {
    prompt: 'Show me my Growth',
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

  // ============================================
  // Phase 15: Collapse bar chart
  // ============================================
  async function collapseBarChart(chartData) {
    const { topicBars, barLabelEls } = chartData;

    // Fade out all labels (rank, name, count, subline)
    for (const el of barLabelEls) {
      el.style.transition = 'opacity 0.3s ease';
      el.style.opacity = '0';
    }
    await wait(300);

    // Shrink all bars to nothing
    for (const { bar } of topicBars) {
      bar.style.transition = 'width 0.5s cubic-bezier(0.4, 0, 0.15, 1), height 0.5s ease, opacity 0.5s ease';
      bar.style.width = '0px';
      bar.style.height = '0px';
      bar.style.opacity = '0';
    }
    await wait(500);

    // Clean up DOM
    for (const el of barLabelEls) el.remove();
    for (const { bar } of topicBars) bar.remove();

    await wait(200);
  }

  // ============================================
  // Phase 16a: Cursor travels to input field
  // ============================================
  async function cursorToInput() {
    // Restore the footer (hidden during cascade in Phase 8)
    const footer = document.querySelector('.editor__footer');
    if (footer && footer.classList.contains('editor__footer--hidden')) {
      footer.classList.remove('editor__footer--hidden');
      footer.style.opacity = '0';
      footer.offsetHeight;
      footer.style.transition = 'opacity 0.4s ease';
      footer.style.opacity = '1';
      await wait(300);
      footer.style.transition = '';
      footer.style.opacity = '';
    }

    const mainRect = editorMain.getBoundingClientRect();
    const inputRect = inputWrap.getBoundingClientRect();

    // Show fake cursor near chart center (mid-screen)
    fakeCursor.style.transition = 'none';
    fakeCursor.style.left = `${mainRect.left + mainRect.width / 2}px`;
    fakeCursor.style.top = `${mainRect.top + mainRect.height / 2}px`;
    fakeCursor.classList.add('fake-cursor--visible');
    fakeCursor.offsetHeight; // reflow

    await wait(100);

    // Travel down to the input field
    fakeCursor.style.transition = 'left 0.6s cubic-bezier(0.4, 0, 0.15, 1), top 0.6s cubic-bezier(0.4, 0, 0.15, 1)';
    fakeCursor.style.left = `${inputRect.left + inputRect.width / 2}px`;
    fakeCursor.style.top = `${inputRect.top + inputRect.height / 2}px`;
    await wait(650);

    // Click effect on input field
    inputWrap.style.transition = 'border-color 0.15s ease';
    inputWrap.style.borderColor = 'rgba(255, 255, 255, 0.25)';
    await wait(150);
    inputWrap.style.borderColor = '';

    // Fade cursor out as text cursor takes over
    fakeCursor.classList.remove('fake-cursor--visible');
    await wait(100);

    // Zoom in on input
    placeholder.classList.add('editor__placeholder--hidden');
    editor.classList.add('editor--zoomed');
    inputWrap.classList.add('editor__input-wrap--expanded');
    sendBtn.classList.add('editor__send-btn--active');
    cursor.classList.remove('editor__cursor--hidden');
    await wait(400);
  }

  // ============================================
  // Phase 16b: Type prompt (parameterized)
  // ============================================
  async function typeNewPrompt(text) {
    let typed = '';
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      typed += ch;
      inputText.textContent = typed;

      let delay = jitter(CHAR_MS);
      if (ch === ' ') delay += SPACE_EXTRA;
      await wait(delay);
    }
  }

  // ============================================
  // Phase 16b (cont): Send new message
  // Lighter version — no welcome hide, reuses
  // existing chat container or creates a new one
  // ============================================
  async function sendNewMessage() {
    const messageText = inputText.textContent;

    // Clear input
    inputText.textContent = '';
    placeholder.classList.remove('editor__placeholder--hidden');
    sendBtn.classList.remove('editor__send-btn--active');
    inputWrap.classList.remove('editor__input-wrap--expanded');
    cursor.classList.add('editor__cursor--hidden');

    // Zoom out
    editor.classList.remove('editor--zoomed');
    await wait(400);

    // Ensure we have a chat messages container
    if (!chatMessages) {
      editorMain.style.justifyContent = 'flex-start';
      editorMain.style.alignItems = 'stretch';
      chatMessages = document.createElement('div');
      chatMessages.className = 'chat-messages';
      editorMain.appendChild(chatMessages);
    }

    // Add user bubble
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble';
    bubble.textContent = messageText;
    chatMessages.appendChild(bubble);

    await wait(50);
    bubble.classList.add('chat-bubble--visible');
    await wait(500);
  }

  // ============================================
  // Phase 17: Growth insight — AI message streams
  // in, iOS-style graph draws, then zoom.
  //
  // Flow: thinking dots → AI message bubble (stays
  // visible) → graph container fades in → line
  // draws with gradient fill → labels appear →
  // zoom (user bubble disappears).
  // ============================================
  async function showGrowthInsight(data) {
    const monthly = data.monthly;
    const maxValue = Math.max(...monthly.map(d => d.value));

    // --- Step 1: Thinking dots ---
    const thinkingContainer = document.createElement('div');
    thinkingContainer.className = 'chat-thinking';
    for (let i = 0; i < 3; i++) {
      const dot = document.createElement('span');
      dot.className = 'chat-thinking__dot';
      thinkingContainer.appendChild(dot);
    }
    chatMessages.appendChild(thinkingContainer);
    await wait(800);
    thinkingContainer.classList.add('chat-thinking--intense');
    await wait(400);

    // Fade out thinking dots
    thinkingContainer.style.transition = 'opacity 0.2s ease';
    thinkingContainer.style.opacity = '0';
    await wait(200);
    thinkingContainer.remove();

    // --- Step 2: AI message as a separate chat-ai-response bubble ---
    const aiResponse = document.createElement('div');
    aiResponse.className = 'chat-ai-response';
    chatMessages.appendChild(aiResponse);

    const textContainer = document.createElement('span');
    aiResponse.appendChild(textContainer);

    const streamCursor = document.createElement('span');
    streamCursor.className = 'chat-ai-response__cursor';
    aiResponse.appendChild(streamCursor);

    // Fade in the AI response bubble
    aiResponse.offsetHeight;
    aiResponse.classList.add('chat-ai-response--visible');
    await wait(350);

    // Stream the message text word-by-word
    for (const part of data.message) {
      const words = part.text.split(/(\s+)/);
      for (const word of words) {
        if (!word) continue;
        if (part.cls) {
          const span = document.createElement('span');
          span.className = part.cls;
          span.textContent = word;
          textContainer.appendChild(span);
        } else {
          textContainer.appendChild(document.createTextNode(word));
        }
        if (word.trim()) {
          await wait(jitter(45, 15));
        }
      }
    }

    await wait(300);
    streamCursor.classList.add('chat-ai-response__cursor--hidden');
    await wait(200);

    // Wrap the AI message in a bubble (background + padding animate in)
    aiResponse.classList.add('chat-ai-response--wrapped');
    await wait(500);

    // --- Step 3: Graph container fades in below (separate element) ---
    const graphWrap = document.createElement('div');
    graphWrap.className = 'insight-bubble insight-bubble--centered';
    graphWrap.style.opacity = '0';
    chatMessages.appendChild(graphWrap);

    const graphContainer = document.createElement('div');
    graphContainer.className = 'insight-graph';
    graphWrap.appendChild(graphContainer);

    graphWrap.offsetHeight;
    graphWrap.style.transition = 'opacity 0.4s ease';
    graphWrap.style.opacity = '1';
    await wait(450);

    // --- Step 4: Build the graph (SVG + labels) inside graphContainer ---
    const containerW = graphContainer.clientWidth;
    const containerH = graphContainer.clientHeight;

    // Chart area padding
    const padTop = 38;
    const padBottom = 28;
    const padLeft = 38;
    const padRight = 15;
    const chartW = containerW - padLeft - padRight;
    const chartH = containerH - padTop - padBottom;
    const chartBottom = padTop + chartH;

    // Graph title
    const titleEl = document.createElement('div');
    titleEl.className = 'line-graph__title';
    titleEl.textContent = 'Monthly Conversations';
    graphContainer.appendChild(titleEl);

    // Compute data positions (container-relative pixel coordinates)
    const stepX = chartW / (monthly.length - 1);
    const positions = monthly.map((d, i) => ({
      x: padLeft + i * stepX,
      y: padTop + chartH - (d.value / maxValue) * chartH,
      value: d.value,
      month: d.month,
    }));

    // --- SVG overlay (fills the graph container) ---
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.classList.add('line-graph');
    svg.style.position = 'absolute';
    svg.style.left = '0';
    svg.style.top = '0';
    svg.setAttribute('width', containerW);
    svg.setAttribute('height', containerH);
    svg.style.pointerEvents = 'none';

    // Gradient definition for area fill
    const defs = document.createElementNS(svgNS, 'defs');
    const gradient = document.createElementNS(svgNS, 'linearGradient');
    gradient.setAttribute('id', 'areaGrad');
    gradient.setAttribute('x1', '0');
    gradient.setAttribute('y1', '0');
    gradient.setAttribute('x2', '0');
    gradient.setAttribute('y2', '1');

    const stop1 = document.createElementNS(svgNS, 'stop');
    stop1.setAttribute('offset', '0%');
    stop1.setAttribute('stop-color', 'rgba(16, 185, 129, 0.25)');
    const stop2 = document.createElementNS(svgNS, 'stop');
    stop2.setAttribute('offset', '100%');
    stop2.setAttribute('stop-color', 'rgba(16, 185, 129, 0.02)');

    gradient.appendChild(stop1);
    gradient.appendChild(stop2);
    defs.appendChild(gradient);
    svg.appendChild(defs);

    // Subtle horizontal gridlines
    const gridValues = [50, 100, 150];
    for (const val of gridValues) {
      const gy = padTop + chartH - (val / maxValue) * chartH;
      const gridLine = document.createElementNS(svgNS, 'line');
      gridLine.setAttribute('x1', padLeft);
      gridLine.setAttribute('y1', gy);
      gridLine.setAttribute('x2', padLeft + chartW);
      gridLine.setAttribute('y2', gy);
      gridLine.setAttribute('stroke', 'rgba(255, 255, 255, 0.06)');
      gridLine.setAttribute('stroke-width', '1');
      svg.appendChild(gridLine);
    }

    // Build the Catmull-Rom spline curve
    const svgPoints = positions.map(p => ({ x: p.x, y: p.y }));

    let d = `M ${svgPoints[0].x} ${svgPoints[0].y}`;
    for (let i = 0; i < svgPoints.length - 1; i++) {
      const p0 = svgPoints[Math.max(i - 1, 0)];
      const p1 = svgPoints[i];
      const p2 = svgPoints[i + 1];
      const p3 = svgPoints[Math.min(i + 2, svgPoints.length - 1)];

      const tension = 0.3;
      const cp1x = p1.x + (p2.x - p0.x) * tension;
      const cp1y = p1.y + (p2.y - p0.y) * tension;
      const cp2x = p2.x - (p3.x - p1.x) * tension;
      const cp2y = p2.y - (p3.y - p1.y) * tension;

      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }

    // Area fill path (same curve, closed down to chart bottom)
    const lastPt = svgPoints[svgPoints.length - 1];
    const firstPt = svgPoints[0];
    const areaD = d + ` L ${lastPt.x} ${chartBottom} L ${firstPt.x} ${chartBottom} Z`;

    const areaPath = document.createElementNS(svgNS, 'path');
    areaPath.classList.add('line-graph__area');
    areaPath.setAttribute('d', areaD);
    areaPath.setAttribute('fill', 'url(#areaGrad)');
    areaPath.setAttribute('stroke', 'none');
    areaPath.style.opacity = '0';
    svg.appendChild(areaPath);

    // Line path (on top of area fill)
    const linePath = document.createElementNS(svgNS, 'path');
    linePath.classList.add('line-graph__path');
    linePath.setAttribute('d', d);
    linePath.setAttribute('fill', 'none');
    linePath.setAttribute('stroke', '#10b981');
    linePath.setAttribute('stroke-width', '5');
    linePath.setAttribute('stroke-linecap', 'round');
    linePath.setAttribute('stroke-linejoin', 'round');
    svg.appendChild(linePath);

    graphContainer.appendChild(svg);

    // Y-axis reference labels
    for (const val of gridValues) {
      const gy = padTop + chartH - (val / maxValue) * chartH;
      const yLabel = document.createElement('div');
      yLabel.className = 'line-graph__y-label';
      yLabel.textContent = val;
      yLabel.style.position = 'absolute';
      yLabel.style.left = '6px';
      yLabel.style.top = `${gy}px`;
      yLabel.style.transform = 'translateY(-50%)';
      graphContainer.appendChild(yLabel);
    }

    // Month labels along X-axis (all 12)
    const monthAbbrevs = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
    const monthLabelEls = [];
    for (let i = 0; i < monthly.length; i++) {
      const pos = positions[i];
      const mLabel = document.createElement('div');
      mLabel.className = 'line-graph__month-label';
      mLabel.textContent = monthAbbrevs[i];
      mLabel.style.position = 'absolute';
      mLabel.style.left = `${pos.x}px`;
      mLabel.style.top = `${chartBottom + 6}px`;
      mLabel.style.transform = 'translateX(-50%)';
      mLabel.style.opacity = '0';
      graphContainer.appendChild(mLabel);
      monthLabelEls.push(mLabel);
    }

    // Key value callouts (Jan, Aug, Dec)
    const calloutIndices = [0, 7, 11];
    const calloutEls = [];
    for (const idx of calloutIndices) {
      const pos = positions[idx];
      const callout = document.createElement('div');
      callout.className = 'line-graph__callout';
      callout.textContent = pos.value;
      callout.style.position = 'absolute';
      callout.style.left = `${pos.x}px`;
      callout.style.top = `${pos.y - 20}px`;
      callout.style.transform = 'translateX(-50%)';
      callout.style.opacity = '0';
      graphContainer.appendChild(callout);
      calloutEls.push(callout);
    }

    // --- Step 5: Animate line draw ---
    const pathLength = linePath.getTotalLength();
    linePath.style.strokeDasharray = pathLength;
    linePath.style.strokeDashoffset = pathLength;

    // Force reflow — offsetHeight doesn't work on SVG elements
    svg.getBoundingClientRect();

    linePath.style.transition = 'stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.15, 1)';
    linePath.style.strokeDashoffset = '0';

    // Area fill fades in shortly after line starts drawing
    setTimeout(() => {
      areaPath.style.transition = 'opacity 1.2s ease';
      areaPath.style.opacity = '1';
    }, 300);

    await wait(1700);

    // --- Step 6: Labels and callouts fade in ---
    // Month labels (staggered)
    for (let i = 0; i < monthLabelEls.length; i++) {
      setTimeout(() => {
        monthLabelEls[i].style.transition = 'opacity 0.3s ease';
        monthLabelEls[i].style.opacity = '1';
      }, i * 30);
    }

    await wait(400);

    // Value callouts
    for (const el of calloutEls) {
      el.style.transition = 'opacity 0.35s ease';
      el.style.opacity = '1';
      await wait(120);
    }

    // Hold briefly to take it in
    await wait(1000);

    // --- Step 7: Zoom — user's bubble disappears, graph fills screen ---
    // Find the user's "Show me my growth" bubble (last .chat-bubble)
    const userBubbles = chatMessages.querySelectorAll('.chat-bubble');
    const userBubble = userBubbles.length ? userBubbles[userBubbles.length - 1] : null;

    // Scroll so the AI message + graph combo is centered in the viewport.
    // The AI message sits above the graph and should remain visible as context.
    const editorMainEl = document.querySelector('.editor__main');
    if (editorMainEl) {
      const msgTop = aiResponse.offsetTop;
      const graphBottom = graphWrap.offsetTop + graphWrap.offsetHeight;
      const comboH = graphBottom - msgTop;
      const viewH = editorMainEl.clientHeight;
      const scrollTarget = msgTop - (viewH - comboH) / 2;
      editorMainEl.scrollTo({ top: Math.max(0, scrollTarget), behavior: 'smooth' });
      await wait(400);
    }

    // Fade out header, footer, and user's bubble simultaneously
    const header = document.querySelector('.editor__header');
    const footer = document.querySelector('.editor__footer');
    if (header) {
      header.style.transition = 'opacity 0.5s ease';
      header.style.opacity = '0';
    }
    if (footer) {
      footer.style.transition = 'opacity 0.5s ease';
      footer.style.opacity = '0';
    }
    if (userBubble) {
      userBubble.style.transition = 'opacity 0.5s ease, max-height 0.6s ease, padding 0.5s ease, margin 0.5s ease';
      userBubble.style.opacity = '0';
      setTimeout(() => {
        userBubble.style.maxHeight = '0';
        userBubble.style.overflow = 'hidden';
        userBubble.style.padding = '0';
        userBubble.style.margin = '0';
      }, 300);
    }

    // Apply zoom and vertically center the content
    editor.classList.add('editor--zoomed-insight');

    // After the user bubble collapses, the remaining content (AI msg + graph)
    // needs to be pushed down to the vertical center of the main area.
    // We do this by calculating the right margin-top on chat-messages.
    if (editorMainEl) {
      editorMainEl.style.overflow = 'hidden';
      editorMainEl.scrollTop = 0;
    }
    await wait(500);

    // Measure and center: push chat-messages down so its content is centered
    if (editorMainEl && chatMessages) {
      const mainH = editorMainEl.clientHeight;
      const contentH = chatMessages.scrollHeight;
      const offset = Math.max(0, (mainH - contentH) / 2);
      chatMessages.style.transition = 'margin-top 0.5s cubic-bezier(0.4, 0, 0.15, 1)';
      chatMessages.style.marginTop = `${offset}px`;
    }
    await wait(600);

    // Hold — let user take in the full zoomed picture
    await wait(4000);

    return { svg, graphWrap };
  }

  // ============================================
  // Master sequence
  // ============================================
  async function run() {
    await wait(1500);                           // Idle
    await typePrompt();                         // Type
    await wait(400);                            // Pause
    await moveCursorToSend();                   // Cursor → send
    await clickSend();                          // Click
    await sendMessage();                        // Zoom out + bubble
    const dots = await showThinkingDots();      // Thinking dots
    const resp = await streamAIResponse(dots);  // AI streams response
    await highlightResponse(resp);              // Wrap → grow → zoom
    await cascadeMessages();                    // Ghost bubbles cascade
    await compressAndBlur();                    // Blur + compress
    await showHeroStat();                       // Hero stat: 20,000
    await morphToConversations();               // 20,000 → 847 conversations
    await transitionToSidebar();                // Scroll up, cursor → sidebar
    const sidebarItems = await openSidebar();   // Sidebar slides in
    const chartData = await groupConversations(sidebarItems); // Group into topics

    // --- Growth insight loop ---
    await collapseBarChart(chartData);          // Phase 15: bars collapse
    await cursorToInput();                      // Phase 16a: cursor → input
    await typeNewPrompt(GROWTH_DATA.prompt);    // Phase 16b: type prompt
    await wait(200);
    await moveCursorToSend();                   // Cursor → send
    await clickSend();                          // Click send
    await sendNewMessage();                     // Zoom out + bubble
    await showGrowthInsight(GROWTH_DATA);       // Phase 17-18: message → graph → zoom
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }

  window.__editor = { run };
})();
