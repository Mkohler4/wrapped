// ============================================
// ChatGPT Wrapped - Main Application JavaScript
// ============================================

// ============================================
// STATE
// ============================================
let stats = null;
let aiInsights = null;
let discoveredThemes = [];
let imagePrompts = [];
let imageStats = { generated: 0, uploaded: 0, total: 0 };
let currentImageFilter = 'all';
let currentSlide = 0;
let totalSlides = 15;
let wrappedData = null; // Global store for stats/themes data

// Slide animation flags
let messagesSlideAnimated = false;
let topicsSlideAnimated = false;
let timeSlideAnimated = false;
let themesSlideAnimated = false;
let obsessionSlideAnimated = false;
let cosmicRevelationsAnimated = false;
let gallerySlideAnimated = false;
let heatmapSlideAnimated = false;
let verdictSlideAnimated = false;
let achievementsSlideAnimated = false;
let wordBubblesSlideAnimated = false;
let shareSlideAnimated = false;

// Slide data stores
let messagesSlideData = null;
let topicsSlideData = null;
let timeSlideData = null;
let themesSlideData = null;
let obsessionSlideData = null;
let cosmicRevelationsData = null;
let gallerySlideData = null;
let galleryCurrentPage = 0;
let galleryScrollTimeout = null;
let heatmapData = null;
let verdictSlideData = null;
let achievementsSlideData = null;
let storedTopWords = null;

// Evolution data
let currentEvolutionData = null;
let monthlyTrendData = null;

// Floating bubbles
const loadedEvidence = {}; // Cache loaded evidence
let floatingBubbleTimers = []; // Track spawned bubble timers

// Theme icons for themes slide
const themeIcons = {
  'Business & Entrepreneurship': '💼',
  'AI Image Generation': '🎨',
  'Career & Growth': '📈',
  'Learning & Education': '📚',
  'Creative Writing': '✍️',
  'Technical Architecture': '🏗️',
  'Personal Life': '💭',
  'Productivity & Organization': '⚡',
  'default': '💡'
};

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', function() {
  initFileHandling();
  initKeyboardNavigation();
  initModalHandlers();
});

function initFileHandling() {
  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');

  if (dropZone && fileInput) {
    dropZone.onclick = () => fileInput.click();

    dropZone.ondragover = (e) => {
      e.preventDefault();
      dropZone.classList.add('dragover');
    };

    dropZone.ondragleave = () => dropZone.classList.remove('dragover');

    dropZone.ondrop = (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
      clearError();
      const file = e.dataTransfer.files[0];
      if (file) {
        if (!file.name.endsWith('.zip') && !file.name.endsWith('.json')) {
          showError('Please upload a .zip or .json file');
          return;
        }
        processFile(file);
      }
    };

    fileInput.onchange = (e) => {
      clearError();
      const file = e.target.files[0];
      if (file) processFile(file);
    };
  }
}

function initKeyboardNavigation() {
  document.onkeydown = (e) => {
    if (e.key === 'ArrowRight' || e.key === ' ') nextSlide();
    if (e.key === 'ArrowLeft') prevSlide();
    if (e.key === 'Escape') closeEvidenceModal();
  };
}

function initModalHandlers() {
  // Close modal on escape is handled in keyboard navigation
}

// ============================================
// FILE HANDLING
// ============================================
async function processFile(file) {
  showScreen('processing');
  updateProgress(10, 'Reading file...');

  try {
    let data;
    
    if (file.name.endsWith('.zip')) {
      // Handle ZIP file
      updateProgress(20, 'Extracting ZIP...');
      const JSZip = await loadJSZip();
      const zip = await JSZip.loadAsync(file);
      const jsonFile = zip.file('conversations.json');
      if (!jsonFile) throw new Error('conversations.json not found in ZIP');
      const content = await jsonFile.async('string');
      data = JSON.parse(content);
    } else {
      // Handle JSON directly
      const content = await file.text();
      data = JSON.parse(content);
    }

    updateProgress(40, 'Analyzing conversations...');
    stats = analyzeConversations(data);
    
    updateProgress(80, 'Generating insights...');
    await new Promise(r => setTimeout(r, 500));
    
    updateProgress(100, 'Done!');
    await new Promise(r => setTimeout(r, 300));
    
    populateSlides(stats);
    showScreen('wrapped');
    
  } catch (err) {
    console.error(err);
    showError(err.message);
    showScreen('upload');
  }
}

function showError(message) {
  // Remove existing error
  const existing = document.querySelector('.error-message');
  if (existing) existing.remove();

  let hint = '';
  if (message.includes('conversations.json')) {
    hint = 'Make sure you\'re uploading the full ChatGPT export ZIP file, or extract the <code>conversations.json</code> file directly.';
  } else if (message.includes('JSON')) {
    hint = 'The file doesn\'t appear to be valid JSON. Try downloading a fresh export from ChatGPT.';
  } else {
    hint = 'Try downloading a fresh export from <a href="https://chat.openai.com/#settings/DataControls" target="_blank" style="color: var(--accent)">ChatGPT Settings → Data Controls → Export</a>.';
  }

  const errorEl = document.createElement('div');
  errorEl.className = 'error-message';
  errorEl.innerHTML = `
    <strong>❌ Error processing file</strong>
    <p>${message}</p>
    <p style="margin-top: 0.5rem">${hint}</p>
  `;
  
  const privacyNote = document.querySelector('.privacy-note');
  if (privacyNote) {
    privacyNote.before(errorEl);
  }
}

function clearError() {
  const existing = document.querySelector('.error-message');
  if (existing) existing.remove();
}

// ============================================
// ANALYSIS
// ============================================
// TODO: Replace this with shared module from src/lib/chatgpt-stats.ts
// Existing code to reuse:
//   - src/ingest/chatgpt/parser.ts (ZIP/JSON parsing)
//   - src/scripts/generate-profile-page.ts (topic classification)
//   - src/ingest/chatgpt/insights.ts (style analysis)
// This is a PROTOTYPE - real impl should import existing code
function analyzeConversations(data) {
  const conversations = Array.isArray(data) ? data : [];
  
  let totalMessages = 0;
  let userMessages = 0;
  const topicCounts = {};
  const hourCounts = new Array(24).fill(0);
  let longestConvo = { title: '', count: 0 };
  let codeBlocks = 0;
  let images = 0;

  for (const convo of conversations) {
    const messages = convo.mapping ? Object.values(convo.mapping) : [];
    let convoMsgCount = 0;

    for (const node of messages) {
      if (!node.message) continue;
      
      const msg = node.message;
      const role = msg.author?.role;
      const text = msg.content?.parts?.join('') || '';

      totalMessages++;
      if (role === 'user') {
        userMessages++;
        convoMsgCount++;
        
        // Count code blocks
        if (text.includes('```')) codeBlocks++;
        
        // Check for images
        if (msg.content?.content_type === 'image_asset_pointer') images++;
      }

      // Hour of day
      if (msg.create_time) {
        const hour = new Date(msg.create_time * 1000).getHours();
        hourCounts[hour]++;
      }
    }

    // Topic classification (simple)
    const title = (convo.title || '').toLowerCase();
    let topic = 'general';
    if (title.match(/code|function|api|bug|error|typescript|javascript|python|react/i)) topic = 'coding';
    else if (title.match(/write|email|blog|article|copy/i)) topic = 'writing';
    else if (title.match(/learn|explain|how|what|why/i)) topic = 'learning';
    else if (title.match(/plan|strategy|roadmap|todo/i)) topic = 'planning';
    
    topicCounts[topic] = (topicCounts[topic] || 0) + 1;

    // Longest conversation
    if (convoMsgCount > longestConvo.count) {
      longestConvo = { title: convo.title || 'Untitled', count: convoMsgCount };
    }
  }

  // Sort topics
  const sortedTopics = Object.entries(topicCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Peak hour
  const peakHour = hourCounts.indexOf(Math.max(...hourCounts));

  return {
    totalConversations: conversations.length,
    totalMessages,
    userMessages,
    topics: sortedTopics,
    peakHour,
    hourCounts,
    longestConvo,
    codeBlocks,
    images,
  };
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Animate a number counting up from 0 to target
 */
function animateCountUp(element, target, duration = 2000) {
  const start = 0;
  const startTime = performance.now();
  
  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Easing function (ease-out cubic)
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.floor(start + (target - start) * eased);
    
    element.textContent = current.toLocaleString();
    
    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      element.textContent = target.toLocaleString();
    }
  }
  
  requestAnimationFrame(update);
}

function formatHour(h) {
  if (h === 0) return '12am';
  if (h === 12) return '12pm';
  return h > 12 ? `${h - 12}pm` : `${h}am`;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function truncateText(text, maxLength) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

// ============================================
// SLIDES POPULATION (Main orchestrator)
// Individual slide functions are in js/slides/*.js
// ============================================

function populateSlides(s) {
  // Store globally for later access (floating bubbles, etc.)
  wrappedData = s;
  
  // Slide 1 - Conversations with enhanced visuals
  populateConversationsSlide(s);
  
  // Slide 2 - Messages with breakdown and trend
  populateMessagesSlide(s);
  
  // Slide 3 - Topics (redesigned)
  populateTopicsSlide(s);

  // Slide 4 - DNA Identity (Behavioral Fingerprint)
  populateDNAIdentity(s, aiInsights);

  // Slide 5 - Roast Chamber (Obsession Exposed) - NO FALLBACKS
  populateRoastChamber(s, aiInsights);

  // Slide 7 - When You Think (Temporal Activity Patterns) - NO FALLBACKS
  const enhanced = s.enhanced || {};
  const nightScore = enhanced.nightOwlScore || 0; // Used in fun facts
  populateTimeSlide(s);
  
  // Render Word Frequency Bubbles (D4)
  if (s.topWords && s.topWords.length > 0) {
    renderWordBubbles(s.topWords);
  }

  // Slide 8 - Evolution Timeline
  // This is now handled by renderEvolutionChart() and updateEvolutionUI() 
  // which are called after the evolution data is fetched
  const oldTopics = enhanced.topicsOld || [];
  const recentTopics = enhanced.topicsRecent || [];
  
  // Render the monthly trend chart if data is available
  if (enhanced.monthlyTrend && enhanced.monthlyTrend.length > 0) {
    renderEvolutionChart(enhanced.monthlyTrend);
  }
  
  // Update topic boxes with new format
  const oldTopicsEl = document.getElementById('oldTopics');
  const recentTopicsEl = document.getElementById('recentTopics');
  if (oldTopicsEl) {
    oldTopicsEl.innerHTML = oldTopics.length > 0 
      ? oldTopics.slice(0, 4).map(t => `<span class="era-topic">${t.topic}</span>`).join('') 
      : '<span class="era-topic" style="opacity: 0.5">No data</span>';
  }
  if (recentTopicsEl) {
    recentTopicsEl.innerHTML = recentTopics.length > 0
      ? recentTopics.slice(0, 4).map(t => `<span class="era-topic">${t.topic}</span>`).join('')
      : '<span class="era-topic" style="opacity: 0.5">No data</span>';
  }
  
  // Set initial headline based on trend
  const trendPct = enhanced.trendDirection || 0;
  const trendEmoji = trendPct > 20 ? '📈' : trendPct > 0 ? '↗️' : trendPct > -20 ? '↘️' : '📉';
  const trendWord = trendPct > 20 ? 'Power User Rising' : 
                    trendPct > 0 ? 'Steady Growth' :
                    trendPct > -20 ? 'Taking a Break' : 'Detoxing';
  
  const iconEl = document.getElementById('evolutionIcon');
  const titleEl = document.getElementById('evolutionTitle');
  const subtitleEl = document.getElementById('evolutionSubtitle');
  
  if (iconEl) iconEl.textContent = trendEmoji;
  if (titleEl) titleEl.textContent = trendWord;
  if (subtitleEl) {
    subtitleEl.textContent = aiInsights?.trendInsight || 
      (trendPct > 20 ? 'Your ChatGPT usage is accelerating. AI power user incoming!' :
       trendPct > 0 ? 'Steady as she goes. Consistent AI companion vibes.' :
       trendPct > -20 ? 'Taking some healthy breaks from AI.' : 'Trying to break free? Good luck with that.');
  }

  // Slide 9 - Discovered Themes (Redesigned)
  populateThemesSlide();

  // Slide 10 - AI Image Gallery
  renderImageGallery();

  // Slide 12 - AI Hidden Insights
  const hiddenThemeEl = document.getElementById('hiddenTheme');
  const questionStyleEl = document.getElementById('questionStyle');
  if (aiInsights?.hiddenTheme) {
    if (hiddenThemeEl) hiddenThemeEl.textContent = `"${aiInsights.hiddenTheme}"`;
  } else {
    if (hiddenThemeEl) hiddenThemeEl.textContent = 'Your conversations reveal unique patterns...';
  }
  if (aiInsights?.questionStyle) {
    if (questionStyleEl) questionStyleEl.textContent = aiInsights.questionStyle;
  } else {
    if (questionStyleEl) questionStyleEl.textContent = 'You ask thoughtful, detailed questions.';
  }

  // Slide 13 - Cosmic Revelations (Fun Facts)
  populateCosmicRevelations(s, aiInsights, nightScore, enhanced);

  // Slide 15 - Roast + Compliment (populate data, animation triggered when visible)
  populateVerdictSlide(s, aiInsights);
  
  // Slide 16 - Achievement Badges
  renderAchievements(s, aiInsights);

  // Slide 18 - Share (final slide with summary)
  populateShareSlide(s);

  // Create dots
  const dots = document.getElementById('dots');
  if (dots) {
    dots.innerHTML = Array(totalSlides).fill(0).map((_, i) => 
      `<div class="dot ${i === 0 ? 'active' : ''}"></div>`
    ).join('');
  }
}

// Stub for renderImageGallery (implemented in slide-10-gallery.js)
function renderImageGallery() {
  populateGallerySlide();
}

// ============================================
// FLOATING EVIDENCE BUBBLES
// ============================================

// Spawn floating bubbles at random positions on screen
async function spawnFloatingBubbles(themeKeys, slideElement) {
  const container = document.getElementById('floatingBubblesContainer');
  clearFloatingBubbles();
  
  // Get all evidence for the themes
  const allEvidence = [];
  for (const themeKey of themeKeys) {
    if (!loadedEvidence[themeKey]) {
      try {
        const response = await fetch(`/api/wrapped/evidence/${themeKey}?limit=8`);
        if (response.ok) {
          const data = await response.json();
          loadedEvidence[themeKey] = data.evidence;
        }
      } catch (e) {
        console.log('Could not load evidence for', themeKey);
      }
    }
    if (loadedEvidence[themeKey]) {
      allEvidence.push(...loadedEvidence[themeKey].map(e => ({ ...e, themeKey })));
    }
  }
  
  if (allEvidence.length === 0) return;
  
  // Shuffle and pick up to 6 messages
  const shuffled = allEvidence.sort(() => Math.random() - 0.5).slice(0, 6);
  
  // Define safe zones (edges of screen, avoiding center content)
  const positions = [
    { top: '10%', left: '40px' },
    { top: '15%', right: '40px' },
    { top: '45%', left: '40px' },
    { top: '50%', right: '40px' },
    { bottom: '25%', left: '40px' },
    { bottom: '20%', right: '40px' },
  ];
  
  const colorClasses = ['bubble-teal', 'bubble-purple', 'bubble-pink'];
  
  // Spawn bubbles with staggered delays
  shuffled.forEach((evidence, idx) => {
    const timer = setTimeout(() => {
      const bubble = document.createElement('div');
      bubble.className = `floating-bubble floating ${colorClasses[idx % colorClasses.length]}`;
      
      // Position
      const pos = positions[idx % positions.length];
      Object.keys(pos).forEach(key => {
        bubble.style[key] = pos[key];
      });
      
      // Truncate text
      const truncated = evidence.preview.length > 120 
        ? evidence.preview.slice(0, 117) + '...' 
        : evidence.preview;
      
      bubble.innerHTML = `
        <div class="floating-bubble-text">${escapeHtml(truncated)}</div>
        <div class="floating-bubble-meta">
          <span class="floating-bubble-date">${evidence.conversationTitle || ''}</span>
        </div>
      `;
      
      // Click to see full evidence
      bubble.onclick = () => openEvidenceModal(evidence.themeKey);
      bubble.style.cursor = 'pointer';
      
      container.appendChild(bubble);
    }, 300 + (idx * 400)); // Stagger by 400ms each
    
    floatingBubbleTimers.push(timer);
  });
}

// Clear all floating bubbles
function clearFloatingBubbles() {
  // Clear pending timers
  floatingBubbleTimers.forEach(t => clearTimeout(t));
  floatingBubbleTimers = [];
  
  // Fade out existing bubbles
  const container = document.getElementById('floatingBubblesContainer');
  if (!container) return;
  
  const bubbles = container.querySelectorAll('.floating-bubble');
  bubbles.forEach(b => {
    b.classList.remove('floating');
    b.classList.add('fade-out');
  });
  
  // Remove after animation
  setTimeout(() => {
    container.innerHTML = '';
  }, 400);
}

// Legacy toggle for dropdown (keeping for backwards compatibility)
async function toggleThemeEvidence(idx, themeKey) {
  const container = document.getElementById(`evidence-${idx}`);
  const card = document.getElementById(`theme-${idx}`);
  const arrow = card.querySelector('.evidence-arrow');
  
  // Toggle visibility
  if (container.classList.contains('show')) {
    container.classList.remove('show');
    card.classList.remove('expanded');
    arrow.textContent = '▼';
    return;
  }
  
  // Show container
  container.classList.add('show');
  card.classList.add('expanded');
  arrow.textContent = '▲';
  
  // Load evidence if not already loaded
  if (!loadedEvidence[themeKey]) {
    container.innerHTML = '<div class="sub-text" style="padding: 1rem;">Loading evidence...</div>';
    
    try {
      const response = await fetch(`/api/wrapped/evidence/${themeKey}?limit=5`);
      if (response.ok) {
        const data = await response.json();
        loadedEvidence[themeKey] = data.evidence;
      } else {
        throw new Error('Failed to load');
      }
    } catch (e) {
      container.innerHTML = '<div class="sub-text" style="padding: 1rem; color: #f5576c;">Could not load evidence</div>';
      return;
    }
  }
  
  // Render chat bubbles
  const evidence = loadedEvidence[themeKey];
  if (evidence && evidence.length > 0) {
    container.innerHTML = evidence.slice(0, 5).map(e => `
      <div class="chat-bubble">
        <div class="bubble-text">${escapeHtml(e.preview)}</div>
        <div class="bubble-meta">
          <span>${e.conversationTitle}</span>
          <span class="bubble-similarity">${e.similarity}% match</span>
        </div>
      </div>
    `).join('') + `
      <div class="see-evidence" onclick="openEvidenceModal('${themeKey}')" style="justify-content: center; margin-top: 0.5rem;">
        See all ${evidence.length}+ messages →
      </div>
    `;
  } else {
    container.innerHTML = '<div class="sub-text" style="padding: 1rem;">No evidence found</div>';
  }
}

async function openEvidenceModal(themeKey) {
  const modal = document.getElementById('evidenceModal');
  const title = document.getElementById('evidenceModalTitle');
  const subtitle = document.getElementById('evidenceModalSubtitle');
  const list = document.getElementById('evidenceList');
  
  // Find theme name
  const themeNames = {
    'business': 'Business & Entrepreneurship',
    'images': 'AI Image Generation',
    'career': 'Career & Growth',
    'learning': 'Learning & Education',
    'writing': 'Creative Writing',
    'architecture': 'Technical Architecture',
    'personal': 'Personal Life',
    'productivity': 'Productivity & Organization',
  };
  
  if (title) title.textContent = `💬 ${themeNames[themeKey] || themeKey}`;
  if (subtitle) subtitle.textContent = 'Your actual messages that match this theme';
  if (list) list.innerHTML = '<div class="sub-text">Loading all evidence...</div>';
  
  if (modal) modal.classList.add('show');
  document.body.style.overflow = 'hidden';
  
  // Fetch more evidence
  try {
    const response = await fetch(`/api/wrapped/evidence/${themeKey}?limit=20`);
    if (response.ok) {
      const data = await response.json();
      
      if (list) {
        list.innerHTML = data.evidence.map(e => `
          <div class="evidence-item">
            <div class="evidence-item-text">${escapeHtml(e.message)}</div>
            <div class="evidence-item-meta">
              <span>📁 ${e.conversationTitle}</span>
              <span class="bubble-similarity">${e.similarity}% match</span>
            </div>
          </div>
        `).join('');
      }
    }
  } catch (e) {
    if (list) list.innerHTML = '<div class="sub-text" style="color: #f5576c;">Failed to load evidence</div>';
  }
}

function closeEvidenceModal() {
  const modal = document.getElementById('evidenceModal');
  if (modal) modal.classList.remove('show');
  document.body.style.overflow = '';
}

// ============================================
// IMAGE PROMPT MODAL
// ============================================
function showImagePrompt(id) {
  const img = imagePrompts.find(i => i.id == id);
  if (!img) return;
  
  const title = document.getElementById('evidenceModalTitle');
  const subtitle = document.getElementById('evidenceModalSubtitle');
  const list = document.getElementById('evidenceList');
  const modal = document.getElementById('evidenceModal');
  
  // Show full image and prompt in modal
  const isUploaded = img.source === 'uploaded';
  if (title) title.textContent = isUploaded ? '📤 Uploaded Image' : '🖼️ AI Generated Image';
  if (subtitle) subtitle.textContent = img.conversationTitle;
  
  if (list) {
    list.innerHTML = `
      <div class="evidence-item" style="border-left-color: ${img.gradientColors[0]}; padding: 0;">
        ${img.hasRealImage && img.imagePath ? `
          <div style="margin-bottom: 1rem; border-radius: 12px; overflow: hidden; box-shadow: 0 8px 32px rgba(0,0,0,0.3);">
            <img 
              src="${img.imagePath}" 
              alt="AI Generated Image" 
              style="width: 100%; max-height: 400px; object-fit: contain; display: block; background: #111;"
              onerror="this.parentElement.innerHTML='<div style=\\'background: linear-gradient(135deg, ${img.gradientColors[0]}, ${img.gradientColors[1]}); height: 200px; display: flex; align-items: center; justify-content: center;\\'><span style=\\'font-size: 3rem; opacity: 0.5;\\'>🎨</span></div>'"
            />
          </div>
        ` : `
          <div style="background: linear-gradient(135deg, ${img.gradientColors[0]}, ${img.gradientColors[1]}); height: 200px; border-radius: 12px; margin-bottom: 1rem; display: flex; align-items: center; justify-content: center;">
            <span style="font-size: 3rem; opacity: 0.5;">🎨</span>
          </div>
        `}
        <div style="padding: 1rem;">
          <div class="evidence-item-label" style="color: #888; font-size: 0.75rem; margin-bottom: 0.5rem;">${img.source === 'uploaded' ? 'CONTEXT' : 'YOUR PROMPT'}</div>
          <div class="evidence-item-text" style="font-size: 1rem; line-height: 1.6; color: #e0e0e0;">${escapeHtml(img.prompt)}</div>
          <div class="evidence-item-meta" style="margin-top: 1rem; display: flex; gap: 1rem;">
            <span style="background: rgba(255,255,255,0.1); padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.8rem;">${img.imageType}</span>
            ${img.timestamp ? `<span style="color: #888; font-size: 0.8rem;">${new Date(img.timestamp).toLocaleDateString()}</span>` : ''}
          </div>
        </div>
      </div>
    `;
  }
  
  if (modal) modal.classList.add('show');
  document.body.style.overflow = 'hidden';
}

// ============================================
// NAVIGATION
// ============================================
function showSlide(n) {
  currentSlide = n;
  
  document.querySelectorAll('.slide').forEach((s, i) => {
    s.classList.toggle('active', i === n);
  });
  
  document.querySelectorAll('.dot').forEach((d, i) => {
    d.classList.toggle('active', i === n);
  });

  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  if (prevBtn) prevBtn.style.visibility = n === 0 ? 'hidden' : 'visible';
  if (nextBtn) nextBtn.textContent = n === totalSlides - 1 ? 'Done ✓' : 'Next →';
  
  // Trigger slide-specific animations
  if (n === 1) {
    // Messages slide - trigger animations
    setTimeout(() => animateMessagesSlide(), 300);
  } else if (n === 2) {
    // Topics slide - trigger animations
    setTimeout(() => animateTopicsSlide(), 300);
  } else if (n === 4) {
    // Obsession slide (slide-05 file, index 4) - trigger typewriter
    setTimeout(() => animateObsessionSlide(), 300);
  } else if (n === 5) {
    // Time slide (slide-07 file, index 5) - trigger animations
    setTimeout(() => animateTimeSlide(), 300);
  } else if (n === 9) {
    // Cosmic Revelations slide (slide-13 file, index 9) - trigger card flip animations
    setTimeout(() => animateCosmicRevelations(), 300);
  } else if (n === 7) {
    // Themes slide (slide-09 file, index 7) - trigger animations
    setTimeout(() => animateThemesSlide(), 300);
  } else if (n === 8) {
    // Gallery slide (slide-10 file, index 8) - trigger animations
    setTimeout(() => animateGallerySlide(), 300);
  } else if (n === 10) {
    // Heatmap slide (slide-14 file, index 10) - trigger animations
    setTimeout(() => animateHeatmapSlide(), 300);
  } else if (n === 11) {
    // Verdict slide (slide-15 file, index 11) - trigger animations
    setTimeout(() => animateVerdictSlide(), 300);
  } else if (n === 12) {
    // Achievements slide (slide-16 file, index 12) - trigger animations
    setTimeout(() => animateAchievementsSlide(), 300);
  } else if (n === 13) {
    // Word Bubbles slide (slide-17 file, index 13) - trigger animations
    setTimeout(() => animateWordBubblesSlide(), 300);
  } else if (n === 14) {
    // Share slide (slide-18 file, index 14) - trigger animations
    setTimeout(() => animateShareSlide(), 300);
  }
  
  // Trigger floating bubbles on theme slides (Discovered Themes)
  // Clear bubbles when leaving theme slides
  if (n === 7 && discoveredThemes.length > 0) { // Slide index 7 (0-indexed) = Discovered Themes
    // Get all theme keys from the data
    const themeKeyMap = {
      'Business & Entrepreneurship': 'business',
      'AI Image Generation': 'images', 
      'Career & Growth': 'career',
      'Learning & Education': 'learning',
      'Creative Writing': 'writing',
      'Technical Architecture': 'architecture',
      'Personal Life': 'personal',
      'Productivity & Organization': 'productivity',
    };
    const themeKeys = discoveredThemes.map(t => 
      themeKeyMap[t.name] || t.name.toLowerCase().split(' ')[0]
    );
    console.log('Spawning floating bubbles for themes:', themeKeys);
    if (themeKeys.length > 0) {
      spawnFloatingBubbles(themeKeys, document.getElementById('slide9'));
    }
  } else {
    clearFloatingBubbles();
  }
}

function nextSlide() {
  if (currentSlide < totalSlides - 1) {
    showSlide(currentSlide + 1);
  }
}

function prevSlide() {
  if (currentSlide > 0) {
    showSlide(currentSlide - 1);
  }
}

// ============================================
// SCREENS
// ============================================
function showScreen(name) {
  const uploadScreen = document.getElementById('uploadScreen');
  const processingScreen = document.getElementById('processingScreen');
  const wrappedScreen = document.getElementById('wrappedScreen');
  
  if (uploadScreen) uploadScreen.style.display = name === 'upload' ? 'flex' : 'none';
  if (processingScreen) processingScreen.style.display = name === 'processing' ? 'flex' : 'none';
  if (wrappedScreen) wrappedScreen.style.display = name === 'wrapped' ? 'block' : 'none';
}

function updateProgress(pct, label) {
  const progressFill = document.getElementById('progressFill');
  const progressLabel = document.getElementById('progressLabel');
  if (progressFill) progressFill.style.width = pct + '%';
  if (progressLabel) progressLabel.textContent = label;
}

function restart() {
  currentSlide = 0;
  
  // Reset all slide animation flags
  messagesSlideAnimated = false;
  topicsSlideAnimated = false;
  timeSlideAnimated = false;
  themesSlideAnimated = false;
  obsessionSlideAnimated = false;
  cosmicRevelationsAnimated = false;
  gallerySlideAnimated = false;
  heatmapSlideAnimated = false;
  verdictSlideAnimated = false;
  achievementsSlideAnimated = false;
  wordBubblesSlideAnimated = false;
  shareSlideAnimated = false;
  
  showSlide(0);
  showScreen('upload');
}

// ============================================
// SHARE
// ============================================
function shareTwitter() {
  const text = `I had ${stats?.totalConversations || 0} conversations with ChatGPT! #ChatGPTWrapped`;
  window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
}

function downloadImage() {
  alert('Image download coming soon!');
}

// ============================================
// SPARKLINE RENDERER
// ============================================
function renderSparkline(monthlyData, containerId = 'messagesSparkline') {
  if (!monthlyData || monthlyData.length < 2) {
    console.log('Sparkline: insufficient data');
    return;
  }
  
  const container = document.getElementById(containerId);
  if (!container) return;
  
  // Get the last 12 months or all data if less
  const data = monthlyData.slice(-12);
  const counts = data.map(d => d.count);
  
  const width = 120;
  const height = 40;
  const padding = 4;
  
  const maxVal = Math.max(...counts, 1);
  const minVal = Math.min(...counts);
  const range = maxVal - minVal || 1;
  
  // Generate points
  const points = counts.map((val, i) => {
    const x = padding + (i / (counts.length - 1)) * (width - 2 * padding);
    const y = height - padding - ((val - minVal) / range) * (height - 2 * padding);
    return { x, y, val };
  });
  
  // Create line path
  const linePath = points.map((p, i) => 
    (i === 0 ? 'M' : 'L') + ` ${p.x.toFixed(1)} ${p.y.toFixed(1)}`
  ).join(' ');
  
  // Create area path (close to bottom)
  const areaPath = linePath + 
    ` L ${points[points.length - 1].x.toFixed(1)} ${height - padding}` +
    ` L ${padding} ${height - padding} Z`;
  
  // Update SVG elements
  const lineEl = container.querySelector('#sparklineLine, .sparkline-line');
  const areaEl = container.querySelector('#sparklineArea, .sparkline-area');
  const dotEl = container.querySelector('#sparklineDot, .sparkline-dot');
  const trendEl = container.querySelector('#sparklineTrend, .sparkline-trend');
  
  if (lineEl) lineEl.setAttribute('d', linePath);
  if (areaEl) areaEl.setAttribute('d', areaPath);
  
  // Position dot at the end
  if (dotEl && points.length > 0) {
    const lastPoint = points[points.length - 1];
    dotEl.setAttribute('cx', lastPoint.x);
    dotEl.setAttribute('cy', lastPoint.y);
    dotEl.style.display = 'block';
  }
  
  // Calculate trend
  if (trendEl && counts.length >= 2) {
    const firstHalf = counts.slice(0, Math.floor(counts.length / 2));
    const secondHalf = counts.slice(Math.floor(counts.length / 2));
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    
    const percentChange = firstAvg > 0 ? Math.round(((secondAvg - firstAvg) / firstAvg) * 100) : 0;
    
    trendEl.className = 'sparkline-trend ' + (percentChange > 5 ? 'up' : percentChange < -5 ? 'down' : 'neutral');
    trendEl.textContent = percentChange > 0 ? `↑ ${percentChange}%` : percentChange < 0 ? `↓ ${Math.abs(percentChange)}%` : '→ Steady';
  }
}

// ============================================
// LOAD MY DATA (from API or fallback to embedded)
// ============================================
async function loadMyData() {
  clearError();
  showScreen('processing');
  updateProgress(10, 'Loading your stats...');

  try {
    let dbStats;

    // Fetch from API (required - no hardcoded fallback)
    try {
      updateProgress(20, 'Fetching from database...');
      const response = await fetch('/api/wrapped/stats');
      if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
      }
      dbStats = await response.json();
      console.log('✓ Loaded stats from API');
    } catch (e) {
      throw new Error(`Failed to load stats from API. Make sure server is running on http://localhost:3001\n${e.message}`);
    }

    await new Promise(r => setTimeout(r, 200));
    updateProgress(50, 'Processing...');
    
    // Convert DB stats format to UI stats format
    stats = {
      totalConversations: dbStats.totalConversations,
      totalMessages: dbStats.totalMessages,
      userMessages: dbStats.totalUserMessages,
      topics: dbStats.topTopics.map(t => [t.topic, t.count]),
      peakHour: dbStats.peakHour,
      byHour: dbStats.byHour, // For time wheel
      hourCounts: dbStats.byHour,
      longestConvo: dbStats.longestConversation ? {
        title: dbStats.longestConversation.title,
        count: dbStats.longestConversation.messageCount
      } : { title: 'N/A', count: 0 },
      codeBlocks: dbStats.codeBlocksShared,
      images: dbStats.imagesUploaded,
      // Extra stats from DB
      streaks: dbStats.streaks,
      topWords: dbStats.topWords,
      peakDay: dbStats.peakDay,
      firstDate: dbStats.firstConversationDate,
      lastDate: dbStats.lastConversationDate,
      // Phase B: Enhanced stats
      enhanced: dbStats.enhanced || {},
    };

    // Fetch AI insights (only when on server)
    try {
      updateProgress(70, '🤖 AI is analyzing your conversations via embeddings...');
      const insightsResponse = await fetch('/api/wrapped/insights');
      if (insightsResponse.ok) {
        const data = await insightsResponse.json();
        aiInsights = data.insights;
        discoveredThemes = data.discoveredThemes || [];
        console.log('✓ AI insights generated:', aiInsights);
        console.log('✓ Discovered themes:', discoveredThemes);
      }
    } catch (e) {
      console.log('AI insights not available:', e);
    }

    // Fetch image prompts (both generated and uploaded)
    try {
      updateProgress(85, '🖼️ Loading your AI art gallery...');
      const imagesResponse = await fetch('/api/wrapped/images');
      if (imagesResponse.ok) {
        const data = await imagesResponse.json();
        imagePrompts = data.images || [];
        imageStats = data.stats || { generated: 0, uploaded: 0, total: imagePrompts.length };
        console.log('✓ Image prompts loaded:', imagePrompts.length, 'stats:', imageStats);
      }
    } catch (e) {
      console.log('Image prompts not available:', e);
    }

    // Fetch evolution comparison data (D3.5)
    try {
      updateProgress(94, '📈 Analyzing your evolution...');
      currentEvolutionData = await fetchEvolutionData(2); // Default: 2 periods
      if (currentEvolutionData) {
        console.log('✓ Evolution data loaded:', currentEvolutionData.periods.length, 'periods');
      }
    } catch (e) {
      console.log('Evolution data not available:', e);
    }

    // Fetch heatmap data (D4)
    try {
      updateProgress(97, '📊 Building your activity map...');
      heatmapData = await fetchHeatmapData();
      if (heatmapData) {
        console.log('✓ Heatmap data loaded:', heatmapData.stats.activeDays, 'active days');
      }
    } catch (e) {
      console.log('Heatmap data not available:', e);
    }

    await new Promise(r => setTimeout(r, 200));
    updateProgress(100, 'Done!');

    await new Promise(r => setTimeout(r, 300));
    populateSlides(stats);
    
    // Apply evolution data to UI after populateSlides
    if (currentEvolutionData) {
      updateEvolutionUI(currentEvolutionData);
    }
    
    // Render the evolution chart with REAL monthly trend data from stats
    // This provides accurate data without random variance
    if (stats?.enhanced?.monthlyTrend && stats.enhanced.monthlyTrend.length > 0) {
      console.log('✓ Rendering evolution chart with real monthly data:', stats.enhanced.monthlyTrend.length, 'months');
      renderEvolutionChart(stats.enhanced.monthlyTrend);
      updateEvolutionHeadline(stats.enhanced.monthlyTrend);
    }
    
    // Render heatmap
    if (heatmapData) {
      renderHeatmap(heatmapData);
    }
    showScreen('wrapped');
    
    // Preload evidence for floating bubbles (background, non-blocking)
    preloadEvidenceData();

  } catch (err) {
    console.error(err);
    showError(err.message);
    showScreen('upload');
  }
}

// Preload evidence data in background for faster floating bubbles
async function preloadEvidenceData() {
  if (!discoveredThemes || discoveredThemes.length === 0) return;
  
  const themeKeyMap = {
    'Business & Entrepreneurship': 'business',
    'AI Image Generation': 'images', 
    'Career & Growth': 'career',
    'Learning & Education': 'learning',
    'Creative Writing': 'writing',
    'Technical Architecture': 'architecture',
    'Personal Life': 'personal',
    'Productivity & Organization': 'productivity',
  };
  
  const themeKeys = discoveredThemes.map(t => 
    themeKeyMap[t.name] || t.name.toLowerCase().split(' ')[0]
  );
  
  // Preload first 3 themes (most likely to be shown)
  for (const key of themeKeys.slice(0, 3)) {
    if (!loadedEvidence[key]) {
      try {
        const response = await fetch(`/api/wrapped/evidence/${key}?limit=8`);
        if (response.ok) {
          const data = await response.json();
          loadedEvidence[key] = data.evidence;
        }
      } catch (e) {
        // Silently fail - not critical
      }
    }
  }
}

// ============================================
// SAMPLE DATA FOR DEMO
// ============================================
async function loadSampleData() {
  clearError();
  showScreen('processing');
  updateProgress(10, 'Generating sample data...');
  
  await new Promise(r => setTimeout(r, 300));
  updateProgress(30, 'Creating conversations...');
  
  // Generate realistic sample data
  const sampleConversations = generateSampleConversations();
  
  await new Promise(r => setTimeout(r, 300));
  updateProgress(60, 'Analyzing patterns...');
  
  stats = analyzeConversations(sampleConversations);
  
  await new Promise(r => setTimeout(r, 300));
  updateProgress(90, 'Generating insights...');
  
  await new Promise(r => setTimeout(r, 200));
  updateProgress(100, 'Done!');
  
  await new Promise(r => setTimeout(r, 300));
  populateSlides(stats);
  showScreen('wrapped');
}

function generateSampleConversations() {
  const topics = [
    { title: 'Debug React useEffect infinite loop', topic: 'coding' },
    { title: 'Explain async/await in JavaScript', topic: 'coding' },
    { title: 'Write email to client about delay', topic: 'writing' },
    { title: 'Python list comprehension examples', topic: 'coding' },
    { title: 'How does HTTP caching work?', topic: 'learning' },
    { title: 'Blog post about AI trends', topic: 'writing' },
    { title: 'Fix TypeScript type error', topic: 'coding' },
    { title: 'Product roadmap planning', topic: 'planning' },
    { title: 'API design best practices', topic: 'coding' },
    { title: 'Write LinkedIn post', topic: 'writing' },
    { title: 'Compare React vs Vue', topic: 'learning' },
    { title: 'Database schema design', topic: 'coding' },
    { title: 'Project timeline estimation', topic: 'planning' },
    { title: 'CSS flexbox vs grid', topic: 'learning' },
    { title: 'Code review feedback', topic: 'writing' },
  ];

  const conversations = [];
  const now = Date.now() / 1000;
  const yearAgo = now - (365 * 24 * 60 * 60);

  // Generate 847 sample conversations
  for (let i = 0; i < 847; i++) {
    const topic = topics[Math.floor(Math.random() * topics.length)];
    const timestamp = yearAgo + Math.random() * (now - yearAgo);
    const messageCount = Math.floor(Math.random() * 20) + 2;
    
    // Create mapping structure like real ChatGPT export
    const mapping = {};
    let hasCode = topic.topic === 'coding' && Math.random() > 0.3;
    
    for (let j = 0; j < messageCount; j++) {
      const msgId = `msg-${i}-${j}`;
      const isUser = j % 2 === 0;
      const msgTime = timestamp + (j * 60);
      
      mapping[msgId] = {
        id: msgId,
        message: {
          id: msgId,
          author: { role: isUser ? 'user' : 'assistant' },
          content: {
            content_type: 'text',
            parts: [isUser && hasCode && j === 0 ? '```javascript\nconst x = 1;\n```' : 'Sample message text']
          },
          create_time: msgTime
        },
        parent: j > 0 ? `msg-${i}-${j-1}` : null,
        children: j < messageCount - 1 ? [`msg-${i}-${j+1}`] : []
      };
    }

    conversations.push({
      title: topic.title + (i > 15 ? ` #${i}` : ''),
      create_time: timestamp,
      mapping,
      current_node: `msg-${i}-${messageCount - 1}`
    });
  }

  return conversations;
}

// ============================================
// LOAD JSZip
// ============================================
async function loadJSZip() {
  if (window.JSZip) return window.JSZip;
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
    script.onload = () => resolve(window.JSZip);
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

// Make functions globally available for onclick handlers
window.loadMyData = loadMyData;
window.loadSampleData = loadSampleData;
window.filterImages = filterImages;
window.scrollGallery = scrollGallery;
window.setGalleryFilter = setGalleryFilter;
window.scrollGalleryGrid = scrollGalleryGrid;
window.showImagePrompt = showImagePrompt;
window.openEvidenceModal = openEvidenceModal;
window.closeEvidenceModal = closeEvidenceModal;
window.changeEvolutionPeriod = changeEvolutionPeriod;
window.renderEvolutionChart = renderEvolutionChart;
window.animateCountUp = animateCountUp;
window.nextSlide = nextSlide;
window.prevSlide = prevSlide;
window.restart = restart;
window.shareTwitter = shareTwitter;
window.downloadImage = downloadImage;
window.showHeatmapTooltip = showHeatmapTooltip;
window.hideHeatmapTooltip = hideHeatmapTooltip;

/* ============================================
   COLOR THEME DOCUMENTATION
   ============================================
   
   Primary Colors:
   - Accent Green: #10a37f (ChatGPT brand, success, positive metrics)
   - Purple: #667eea (secondary accent, variety)
   - Pink/Coral: #f5576c (highlights, negative metrics, peak moments)
   
   Gradients:
   - gradient-1: #10a37f → #1a7f64 (primary green)
   - gradient-2: #667eea → #764ba2 (purple)
   - gradient-3: #f093fb → #f5576c (pink)
   
   Usage Guidelines:
   - Use green (accent) as the PRIMARY color for most slides
   - Use purple sparingly for variety/secondary elements
   - Use pink for highlights, peaks, and attention-grabbing elements
   - Maintain dark bg (#0f0f0f) and card (#1a1a1a) consistency
   - Text: white (#ffffff) for primary, #888888 for muted
   
   ============================================ */
