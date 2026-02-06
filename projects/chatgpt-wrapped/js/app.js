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
let heatmapData = null; // Global store for heatmap/activity map data
let heatmapSlideAnimated = false; // Track if heatmap slide has been animated

// Slide animation flags
let messagesSlideAnimated = false;
let topicsSlideAnimated = false;
let timeSlideAnimated = false;
let themesSlideAnimated = false;
let obsessionSlideAnimated = false;
let cosmicRevelationsAnimated = false;
let gallerySlideAnimated = false;
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

function syncDebugGlobals() {
  if (typeof window === 'undefined') return;
  window.stats = stats;
  window.aiInsights = aiInsights;
  window.discoveredThemes = discoveredThemes;
  window.imagePrompts = imagePrompts;
  window.imageStats = imageStats;
  window.heatmapData = heatmapData;
}

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
    const isDebugToggle = (e.ctrlKey || e.metaKey) && e.altKey && (e.key === 'D' || e.key === 'd');
    if (isDebugToggle && typeof window.toggleDebugPanel === 'function') {
      e.preventDefault();
      window.toggleDebugPanel();
      return;
    }
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
    syncDebugGlobals();
    
    updateProgress(60, 'Extracting themes...');
    // Generate enhanced data for evolution slides
    stats.enhanced = generateEnhancedAnalysis(data);
    syncDebugGlobals();
    
    // Generate semantic themes
    discoveredThemes = generateDiscoveredThemes(stats, data);
    syncDebugGlobals();
    
    updateProgress(75, 'Extracting vocabulary...');
    // Extract top words
    stats.topWords = extractTopWords(data);
    syncDebugGlobals();
    
    updateProgress(80, 'Mapping activity...');
    // Generate heatmap data
    heatmapData = generateHeatmapData(data);
    syncDebugGlobals();
    
    updateProgress(85, 'Generating insights...');
    // Generate AI insights from the data
    aiInsights = generateDataInsights(stats, data);
    syncDebugGlobals();
    await new Promise(r => setTimeout(r, 500));
    
    updateProgress(100, 'Done!');
    await new Promise(r => setTimeout(r, 300));
    
    populateSlides(stats);
    showScreen('wrapped');
    syncDebugGlobals();
    
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

/**
 * Slide 9: Discovered Themes - AI Semantic Clusters
 * NO FALLBACKS - requires real discoveredThemes data
 */
function populateThemesSlide() {
  const themeHero = document.getElementById('themeHero');
  const themesCluster = document.getElementById('themesCluster');
  const orbsBg = document.getElementById('themesOrbsBg');
  
  // Generate background orbs
  if (orbsBg) {
    orbsBg.innerHTML = '';
    for (let i = 0; i < 4; i++) {
      const orb = document.createElement('div');
      orb.className = 'themes-orb';
      orbsBg.appendChild(orb);
    }
  }
  
  // Check for data
  if (!discoveredThemes || discoveredThemes.length === 0) {
    // Show no data message
    if (themeHero) themeHero.style.display = 'none';
    if (themesCluster) {
      themesCluster.innerHTML = `
        <div class="themes-no-data">
          <div class="themes-no-data-icon">🔍</div>
          <div class="themes-no-data-text">No semantic themes discovered yet</div>
        </div>
      `;
    }
    return;
  }
  
  // Theme key mapping for evidence modal
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
  
  // Get hero theme (first/dominant)
  const heroTheme = discoveredThemes[0];
  const heroIcon = themeIcons[heroTheme.name] || themeIcons['default'];
  const heroKey = themeKeyMap[heroTheme.name] || heroTheme.name.toLowerCase().split(' ')[0];
  
  // Populate hero
  const heroIconEl = document.getElementById('themeHeroIcon');
  const heroNameEl = document.getElementById('themeHeroName');
  const heroCountEl = document.getElementById('themeHeroCount');
  
  if (heroIconEl) heroIconEl.textContent = heroIcon;
  if (heroNameEl) heroNameEl.textContent = heroTheme.name;
  if (heroCountEl) heroCountEl.textContent = '0'; // Will animate
  
  // Make hero clickable
  if (themeHero) {
    themeHero.style.cursor = 'pointer';
    themeHero.onclick = () => openEvidenceModal(heroKey);
  }
  
  // Populate other themes (skip first)
  const otherThemes = discoveredThemes.slice(1, 6);
  const maxCount = heroTheme.messageCount || 1;
  
  if (themesCluster && otherThemes.length > 0) {
    themesCluster.innerHTML = otherThemes.map((theme, idx) => {
      const icon = themeIcons[theme.name] || themeIcons['default'];
      const themeKey = themeKeyMap[theme.name] || theme.name.toLowerCase().split(' ')[0];
      const barWidth = (theme.messageCount / maxCount) * 100;
      
      return `
        <div class="theme-cluster-card" data-theme="${themeKey}" data-bar-width="${barWidth}" onclick="openEvidenceModal('${themeKey}')" style="animation-delay: ${0.4 + idx * 0.1}s">
          <div class="theme-cluster-icon">${icon}</div>
          <div class="theme-cluster-info">
            <div class="theme-cluster-name">${theme.name}</div>
            <div class="theme-cluster-count"><span data-count="${theme.messageCount}">0</span> messages</div>
            <div class="theme-cluster-bar">
              <div class="theme-cluster-bar-fill" data-width="${barWidth}"></div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  } else if (themesCluster) {
    themesCluster.innerHTML = '';
  }
  
  // Store data for animation
  themesSlideData = {
    heroCount: heroTheme.messageCount,
    otherThemes: otherThemes
  };
}

/**
 * Trigger themes slide animations (called when slide becomes visible)
 */
function animateThemesSlide() {
  if (!themesSlideData || themesSlideAnimated) return;
  themesSlideAnimated = true;
  
  const { heroCount, otherThemes } = themesSlideData;
  
  // Animate hero card entrance
  const themeHero = document.getElementById('themeHero');
  if (themeHero) {
    themeHero.classList.add('animate-in');
  }
  
  // Animate hero count
  setTimeout(() => {
    const heroCountEl = document.getElementById('themeHeroCount');
    if (heroCountEl) {
      animateCountUp(heroCountEl, heroCount, 1500);
    }
  }, 600);
  
  // Animate theme cards entrance and counts
  const cards = document.querySelectorAll('.theme-cluster-card');
  cards.forEach((card, idx) => {
    setTimeout(() => {
      card.classList.add('animate-in');
      
      // Animate the count
      const countEl = card.querySelector('.theme-cluster-count span');
      if (countEl) {
        const targetCount = parseInt(countEl.dataset.count, 10);
        animateCountUp(countEl, targetCount, 1200);
      }
      
      // Animate the bar
      setTimeout(() => {
        const barFill = card.querySelector('.theme-cluster-bar-fill');
        if (barFill) {
          const width = barFill.dataset.width;
          barFill.style.width = `${width}%`;
        }
      }, 400);
    }, 400 + idx * 100);
  });
  
  // Animate insight footer
  setTimeout(() => {
    const insight = document.getElementById('themesInsight');
    if (insight) {
      insight.classList.add('animate-in');
    }
  }, 800 + cards.length * 100);
}

/**
 * Render the trend mini-chart for messages slide
 */
function renderMsgTrendChart(monthlyData) {
  const svg = document.getElementById('msgTrendSvg');
  const areaEl = document.getElementById('msgTrendArea');
  const lineEl = document.getElementById('msgTrendLine');
  const trendValueEl = document.getElementById('msgTrendValue');
  const trendPercentEl = document.getElementById('msgTrendPercent');
  
  if (!svg || !monthlyData || monthlyData.length < 2) return;
  
  const data = monthlyData.slice(-12); // Last 12 months
  const values = data.map(d => d.count ?? d.conversations ?? 0);
  const maxVal = Math.max(...values, 1);
  const minVal = Math.min(...values);
  
  const width = 200;
  const height = 60;
  const padding = 4;
  
  // Generate points
  const points = values.map((val, i) => {
    const x = padding + (i / (values.length - 1)) * (width - 2 * padding);
    const y = padding + (1 - (val - minVal) / (maxVal - minVal || 1)) * (height - 2 * padding);
    return { x, y };
  });
  
  // Create paths
  const linePath = points.map((p, i) => 
    (i === 0 ? 'M' : 'L') + ` ${p.x.toFixed(1)} ${p.y.toFixed(1)}`
  ).join(' ');
  
  const areaPath = linePath + 
    ` L ${points[points.length - 1].x.toFixed(1)} ${height - padding}` +
    ` L ${padding} ${height - padding} Z`;
  
  if (areaEl) areaEl.setAttribute('d', areaPath);
  if (lineEl) lineEl.setAttribute('d', linePath);
  
  // Calculate trend percentage
  const firstHalf = values.slice(0, Math.floor(values.length / 2));
  const secondHalf = values.slice(Math.floor(values.length / 2));
  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
  const trendPct = firstAvg > 0 ? Math.round(((secondAvg - firstAvg) / firstAvg) * 100) : 0;
  
  if (trendPercentEl) {
    const sign = trendPct > 0 ? '+' : trendPct < 0 ? '−' : '';
    trendPercentEl.textContent = `${sign}${Math.abs(trendPct)}%`;
  }
  
  if (trendValueEl) {
    if (trendPct < 0) {
      trendValueEl.classList.add('down');
      trendValueEl.querySelector('.trend-arrow').textContent = '↓';
    } else {
      trendValueEl.classList.remove('down');
      trendValueEl.querySelector('.trend-arrow').textContent = '↑';
    }
  }
}

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

  // Render heatmap if data is available (file uploads & sample data)
  if (heatmapData) {
    renderHeatmap(heatmapData);
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

  if (typeof window.refreshDebugPanel === 'function') {
    window.refreshDebugPanel();
  }
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
// AI IMAGE GALLERY (Redesigned)
// ============================================

/**
 * Generate floating image frame background
 */
function generateGalleryFramesBg() {
  const container = document.getElementById('galleryFramesBg');
  if (!container) return;
  
  container.innerHTML = '';
  const frameCount = 15;
  
  for (let i = 0; i < frameCount; i++) {
    const frame = document.createElement('div');
    frame.className = 'gallery-frame';
    frame.style.left = `${Math.random() * 100}%`;
    frame.style.animationDelay = `${Math.random() * 20}s`;
    frame.style.animationDuration = `${20 + Math.random() * 10}s`;
    container.appendChild(frame);
  }
}

/**
 * Populate gallery slide with data (called on data load)
 */
function populateGallerySlide() {
  const heroNumberEl = document.getElementById('galleryHeroNumber');
  const generatedCountEl = document.getElementById('galleryGeneratedCount');
  const uploadedCountEl = document.getElementById('galleryUploadedCount');
  const noDataEl = document.getElementById('galleryNoData');
  const showcaseEl = document.getElementById('galleryShowcase');
  const statsRowEl = document.querySelector('.gallery-stats-row');
  const heroEl = document.querySelector('.gallery-hero');
  
  // Generate background frames
  generateGalleryFramesBg();
  
  // Check if we have images
  if (!imagePrompts || imagePrompts.length === 0) {
    // Show no data message, hide everything else
    if (noDataEl) {
      noDataEl.style.display = 'flex';
      // Trigger animation after a small delay
      setTimeout(() => noDataEl.classList.add('animate-in'), 50);
    }
    if (showcaseEl) showcaseEl.style.display = 'none';
    if (statsRowEl) statsRowEl.style.display = 'none';
    if (heroEl) heroEl.style.display = 'none';
    
    // Set empty data state
    gallerySlideData = { total: 0, generated: 0, uploaded: 0, images: [] };
    return;
  }
  
  // Hide no data, show content
  if (noDataEl) noDataEl.style.display = 'none';
  if (showcaseEl) showcaseEl.style.display = 'block';
  if (statsRowEl) statsRowEl.style.display = 'flex';
  if (heroEl) heroEl.style.display = 'block';
  
  // Set data targets for count-up animation
  const total = imageStats.total || imagePrompts.length;
  const generated = imageStats.generated || imagePrompts.filter(img => img.source === 'generated').length;
  const uploaded = imageStats.uploaded || imagePrompts.filter(img => img.source === 'uploaded').length;
  
  if (heroNumberEl) heroNumberEl.dataset.target = total;
  if (generatedCountEl) generatedCountEl.dataset.target = generated;
  if (uploadedCountEl) uploadedCountEl.dataset.target = uploaded;
  
  // Store data for animation
  gallerySlideData = {
    total,
    generated,
    uploaded,
    images: imagePrompts
  };
  
  // Render initial gallery grid
  renderGalleryGrid(imagePrompts);
  
  // Add scroll listener for page dots
  initGalleryScrollListener();
  
  // Delay page dots update to allow grid to render
  setTimeout(() => {
    updateGalleryPageDots();
  }, 100);
}

/**
 * Initialize scroll listener for gallery grid
 */
function initGalleryScrollListener() {
  const grid = document.getElementById('galleryGrid');
  if (!grid || grid.dataset.scrollListenerAdded) return;
  
  grid.dataset.scrollListenerAdded = 'true';
  
  grid.addEventListener('scroll', () => {
    // Debounce the scroll update
    if (galleryScrollTimeout) clearTimeout(galleryScrollTimeout);
    galleryScrollTimeout = setTimeout(() => {
      updateGalleryPageIndicator();
    }, 50);
  }, { passive: true });
}

/**
 * Render gallery grid with images
 */
function renderGalleryGrid(images) {
  const grid = document.getElementById('galleryGrid');
  if (!grid) return;
  
  if (!images || images.length === 0) {
    grid.innerHTML = '<div class="sub-text" style="padding: 2rem; text-align: center; width: 100%;">No images to display</div>';
    return;
  }
  
  grid.innerHTML = images.map((img, idx) => `
    <div class="gallery-image-card" data-index="${idx}" onclick="showImagePrompt('${img.id}')">
      <div class="gallery-image-visual">
        ${img.hasRealImage && img.imagePath ? `
          <img 
            src="${img.imagePath}" 
            alt="${img.source === 'uploaded' ? 'Uploaded' : 'AI Generated'}"
            loading="lazy"
            onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
          />
          <div class="gallery-image-placeholder" style="display: none;">
            <span class="gallery-image-placeholder-icon">${img.source === 'uploaded' ? '📤' : '🎨'}</span>
          </div>
        ` : `
          <div class="gallery-image-placeholder">
            <span class="gallery-image-placeholder-icon">${img.source === 'uploaded' ? '📤' : '🎨'}</span>
          </div>
        `}
        <span class="gallery-image-badge">${img.source === 'uploaded' ? '📤' : '🎨'} ${img.imageType || (img.source === 'uploaded' ? 'Uploaded' : 'Generated')}</span>
        <span class="gallery-image-index">#${img.index || idx + 1}</span>
      </div>
      <div class="gallery-image-info">
        <div class="gallery-image-prompt">${escapeHtml(img.prompt || 'No prompt')}</div>
        <div class="gallery-image-meta">
          <span class="gallery-image-meta-icon">📁</span>
          ${escapeHtml(truncateText(img.conversationTitle || 'Unknown', 25))}
        </div>
      </div>
    </div>
  `).join('');
}

/**
 * Update gallery page dots
 */
function updateGalleryPageDots() {
  const grid = document.getElementById('galleryGrid');
  const dotsContainer = document.getElementById('galleryPageDots');
  if (!grid || !dotsContainer) return;
  
  const visibleWidth = grid.offsetWidth;
  const totalWidth = grid.scrollWidth;
  
  // Guard against division by zero or invalid dimensions
  if (!visibleWidth || !totalWidth || visibleWidth <= 0) {
    dotsContainer.innerHTML = '<div class="gallery-page-dot active" data-page="0"></div>';
    return;
  }
  
  const totalPages = Math.ceil(totalWidth / visibleWidth);
  const pageCount = Math.max(1, Math.min(totalPages, 5));
  
  dotsContainer.innerHTML = Array(pageCount)
    .fill(0)
    .map((_, i) => `<div class="gallery-page-dot ${i === 0 ? 'active' : ''}" data-page="${i}"></div>`)
    .join('');
}

/**
 * Animate gallery slide (called when slide becomes visible)
 */
function animateGallerySlide() {
  if (!gallerySlideData || gallerySlideAnimated) return;
  gallerySlideAnimated = true;
  
  const { total, generated, uploaded } = gallerySlideData;
  
  // Animate hero number
  const heroEl = document.getElementById('galleryHeroNumber');
  if (heroEl) {
    animateCountUp(heroEl, total, 1800);
  }
  
  // Animate stats row with delay
  setTimeout(() => {
    const statsRow = document.querySelector('.gallery-stats-row');
    if (statsRow) statsRow.classList.add('animate-in');
    
    // Count up stats
    const generatedEl = document.getElementById('galleryGeneratedCount');
    const uploadedEl = document.getElementById('galleryUploadedCount');
    
    if (generatedEl) animateCountUp(generatedEl, generated, 1200);
    if (uploadedEl) animateCountUp(uploadedEl, uploaded, 1200);
    
    // Animate stat bars
    setTimeout(() => {
      const maxVal = Math.max(generated, uploaded, 1);
      const genBar = document.getElementById('galleryGeneratedBar');
      const uplBar = document.getElementById('galleryUploadedBar');
      
      if (genBar) genBar.style.width = `${(generated / maxVal) * 100}%`;
      if (uplBar) uplBar.style.width = `${(uploaded / maxVal) * 100}%`;
    }, 400);
  }, 600);
  
  // Animate showcase with delay
  setTimeout(() => {
    const showcase = document.querySelector('.gallery-showcase');
    if (showcase) showcase.classList.add('animate-in');
    
    // Staggered card animation
    document.querySelectorAll('.gallery-image-card').forEach((card, i) => {
      setTimeout(() => {
        card.classList.add('animate-in');
      }, i * 80);
    });
  }, 1000);
}

/**
 * Set gallery filter
 */
function setGalleryFilter(filter) {
  currentImageFilter = filter;
  
  // Update active tab
  document.querySelectorAll('.gallery-filter-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.filter === filter);
  });
  
  // Filter images
  let filteredImages = imagePrompts;
  if (filter === 'generated') {
    filteredImages = imagePrompts.filter(img => img.source === 'generated');
  } else if (filter === 'uploaded') {
    filteredImages = imagePrompts.filter(img => img.source === 'uploaded');
  }
  
  // Re-render grid
  renderGalleryGrid(filteredImages);
  
  // Animate cards in
  document.querySelectorAll('.gallery-image-card').forEach((card, i) => {
    setTimeout(() => {
      card.classList.add('animate-in');
    }, i * 50);
  });
  
  // Reset scroll and update dots
  const grid = document.getElementById('galleryGrid');
  if (grid) grid.scrollTo({ left: 0, behavior: 'smooth' });
  galleryCurrentPage = 0;
  updateGalleryPageDots();
  updateGalleryPageIndicator();
}

/**
 * Scroll gallery grid
 */
function scrollGalleryGrid(direction) {
  const grid = document.getElementById('galleryGrid');
  if (!grid) return;
  
  const scrollAmount = grid.offsetWidth * 0.8;
  grid.scrollBy({ left: direction * scrollAmount, behavior: 'smooth' });
  
  // Update page indicator after scroll
  setTimeout(() => {
    updateGalleryPageIndicator();
  }, 400);
}

/**
 * Update page indicator based on scroll position
 */
function updateGalleryPageIndicator() {
  const grid = document.getElementById('galleryGrid');
  const dots = document.querySelectorAll('.gallery-page-dot');
  if (!grid || dots.length === 0) return;
  
  const maxScroll = grid.scrollWidth - grid.offsetWidth;
  
  // Handle case where content doesn't scroll
  if (maxScroll <= 0) {
    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === 0);
    });
    return;
  }
  
  const scrollRatio = Math.max(0, Math.min(1, grid.scrollLeft / maxScroll));
  const currentPage = Math.round(scrollRatio * (dots.length - 1));
  
  dots.forEach((dot, i) => {
    dot.classList.toggle('active', i === currentPage);
  });
}

// Legacy function wrapper for backwards compatibility
function renderImageGallery() {
  populateGallerySlide();
}

function filterImages(filter) {
  setGalleryFilter(filter);
}

function scrollGallery(direction) {
  scrollGalleryGrid(direction);
}

// ============================================
// D3.5: EVOLUTION TIMELINE VISUALIZATION
// ============================================

async function fetchEvolutionData(periods = 2, dateRange = null) {
  try {
    let url = `/api/wrapped/evolution?periods=${periods}`;
    
    if (dateRange) {
      const now = new Date();
      let fromDate;
      
      switch (dateRange) {
        case '1year':
          fromDate = new Date(now);
          fromDate.setFullYear(fromDate.getFullYear() - 1);
          break;
        case '6months':
          fromDate = new Date(now);
          fromDate.setMonth(fromDate.getMonth() - 6);
          break;
        case '3months':
          fromDate = new Date(now);
          fromDate.setMonth(fromDate.getMonth() - 3);
          break;
      }
      
      if (fromDate) {
        url += `&from=${fromDate.toISOString().split('T')[0]}`;
      }
    }
    
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch evolution data');
    
    currentEvolutionData = await response.json();
    return currentEvolutionData;
  } catch (error) {
    console.error('Evolution API error:', error);
    return null;
  }
}

/**
 * Render the new SVG-based evolution timeline chart
 */
function renderEvolutionChart(monthlyData, peakMonth = null) {
  const svg = document.getElementById('evolutionChart');
  const areaEl = document.getElementById('evolutionArea');
  const lineEl = document.getElementById('evolutionLine');
  const pointsContainer = document.getElementById('evolutionPoints');
  const gridContainer = document.getElementById('evolutionGrid');
  const axisContainer = document.getElementById('evolutionAxis');
  const tooltip = document.getElementById('evolutionTooltip');
  const hoverLine = document.getElementById('evolutionHoverLine');
  
  if (!svg || !monthlyData || monthlyData.length < 2) {
    console.log('Evolution chart: insufficient data');
    return;
  }
  
  const padding = { left: 20, right: 20, top: 20, bottom: 20 };
  const width = 800;
  const height = 200;
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  
  // Get values and find max
  const values = monthlyData.map(d => d.count ?? d.conversations ?? 0);
  const maxValue = Math.max(...values, 1);
  const minValue = Math.min(...values);
  
  // Generate points
  const points = monthlyData.map((d, i) => {
    const x = padding.left + (i / (monthlyData.length - 1)) * chartWidth;
    const value = d.count ?? d.conversations ?? 0;
    const y = padding.top + chartHeight - ((value - minValue) / (maxValue - minValue || 1)) * chartHeight;
    return { x, y, data: d, index: i };
  });
  
  // Find peak point
  const peakIndex = values.indexOf(Math.max(...values));
  
  // Create line path
  const linePath = points.map((p, i) => 
    (i === 0 ? 'M' : 'L') + ` ${p.x.toFixed(1)} ${p.y.toFixed(1)}`
  ).join(' ');
  
  // Create area path (closed to bottom)
  const areaPath = linePath + 
    ` L ${points[points.length - 1].x.toFixed(1)} ${height - padding.bottom}` +
    ` L ${padding.left} ${height - padding.bottom} Z`;
  
  // Draw grid lines
  gridContainer.innerHTML = '';
  const gridLines = 4;
  for (let i = 0; i <= gridLines; i++) {
    const y = padding.top + (i / gridLines) * chartHeight;
    gridContainer.innerHTML += `<line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}"/>`;
  }
  
  // Update paths
  areaEl.setAttribute('d', areaPath);
  lineEl.setAttribute('d', linePath);
  
  // Create data points
  pointsContainer.innerHTML = points.map((p, i) => {
    const isPeak = i === peakIndex;
    const delay = i * 0.05 + 0.8; // Stagger after line draws
    return `
      <circle 
        class="evolution-point animated ${isPeak ? 'peak' : ''}" 
        cx="${p.x}" 
        cy="${p.y}" 
        r="0"
        data-index="${i}"
        style="animation-delay: ${delay}s"
      />
    `;
  }).join('');
  
  // Axis labels (show every 3rd month or so)
  const labelInterval = Math.max(1, Math.floor(monthlyData.length / 8));
  axisContainer.innerHTML = monthlyData
    .filter((_, i) => i % labelInterval === 0 || i === monthlyData.length - 1)
    .map((d, i, arr) => {
      const date = d.date ? new Date(d.date) : new Date(d.month + '-01');
      const label = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      const isLast = i === arr.length - 1;
      return `<span class="evolution-axis-label ${isLast ? 'highlight' : ''}">${label}</span>`;
    }).join('');
  
  // Hover interaction
  const chartContainer = document.querySelector('.evolution-chart-container');
  
  chartContainer.addEventListener('mousemove', (e) => {
    const rect = chartContainer.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const chartX = (x / rect.width) * width;
    
    // Find nearest point
    let nearestPoint = points[0];
    let minDist = Math.abs(chartX - points[0].x);
    points.forEach(p => {
      const dist = Math.abs(chartX - p.x);
      if (dist < minDist) {
        minDist = dist;
        nearestPoint = p;
      }
    });
    
    // Show hover line
    hoverLine.setAttribute('x1', nearestPoint.x);
    hoverLine.setAttribute('x2', nearestPoint.x);
    hoverLine.style.display = 'block';
    
    // Update tooltip
    const date = new Date(nearestPoint.data.month + '-01');
    const monthLabel = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    
    document.getElementById('tooltipMonth').textContent = monthLabel;
    document.getElementById('tooltipValue').textContent = `${nearestPoint.data.count.toLocaleString()} messages`;
    
    // Show top topics if available
    const topicsEl = document.getElementById('tooltipTopics');
    if (nearestPoint.data.topics && nearestPoint.data.topics.length > 0) {
      topicsEl.innerHTML = nearestPoint.data.topics.slice(0, 3).map(t => `<span>${t}</span>`).join('');
    } else {
      topicsEl.innerHTML = '';
    }
    
    // Position tooltip
    const tooltipX = (nearestPoint.x / width) * rect.width;
    const tooltipY = (nearestPoint.y / height) * rect.height - 60;
    tooltip.style.left = `${tooltipX}px`;
    tooltip.style.top = `${Math.max(10, tooltipY)}px`;
    tooltip.classList.add('visible');
  });
  
  chartContainer.addEventListener('mouseleave', () => {
    hoverLine.style.display = 'none';
    tooltip.classList.remove('visible');
  });
  
  // Store for later use
  monthlyTrendData = monthlyData;
}

/**
 * Update the evolution UI with data from API
 */
function updateEvolutionUI(data) {
  if (!data || !data.periods || data.periods.length < 2) return;
  
  const firstPeriod = data.periods[0];
  const lastPeriod = data.periods[data.periods.length - 1];
  
  // Update headline
  const changePercent = data.changes.messageCount;
  const trendEmoji = changePercent > 20 ? '📈' : changePercent > 0 ? '↗️' : changePercent > -20 ? '↘️' : '📉';
  const trendWord = changePercent > 20 ? 'Power User Rising' : 
                    changePercent > 0 ? 'Steady Growth' :
                    changePercent > -20 ? 'Taking a Break' : 'Detoxing';
  
  const iconEl = document.getElementById('evolutionIcon');
  const titleEl = document.getElementById('evolutionTitle');
  const subtitleEl = document.getElementById('evolutionSubtitle');
  
  if (iconEl) iconEl.textContent = trendEmoji;
  if (titleEl) titleEl.textContent = trendWord;
  
  // Generate insight subtitle
  const avgChange = data.changes.avgMessagesPerConvo;
  if (subtitleEl) {
    if (avgChange > 30) {
      subtitleEl.textContent = `Your conversations are ${avgChange}% deeper now. Quality over quantity!`;
    } else if (changePercent > 20) {
      subtitleEl.textContent = 'Your ChatGPT usage is accelerating. AI power user incoming!';
    } else if (changePercent < -20) {
      subtitleEl.textContent = 'Taking some healthy breaks from AI. Or maybe just too busy?';
    } else {
      subtitleEl.textContent = 'Steady as she goes. Consistent AI companion vibes.';
    }
  }
  
  // Update metrics cards
  const msgOld = Math.round(firstPeriod.stats.messageCount / 4); // Rough weekly
  const msgNew = Math.round(lastPeriod.stats.messageCount / 4);
  const depthOld = Math.round(firstPeriod.stats.avgMessagesPerConvo);
  const depthNew = Math.round(lastPeriod.stats.avgMessagesPerConvo);
  const topicsOld = firstPeriod.stats.topTopics.length;
  const topicsNew = lastPeriod.stats.topTopics.length;
  
  updateMetricCard('messagesChange', 'messagesOld', 'messagesNew', data.changes.messageCount, msgOld, msgNew);
  updateMetricCard('depthChange', 'depthOld', 'depthNew', data.changes.avgMessagesPerConvo, depthOld, depthNew);
  updateMetricCard('varietyChange', 'varietyOld', 'varietyNew', 
    Math.round(((topicsNew - topicsOld) / Math.max(topicsOld, 1)) * 100), topicsOld, topicsNew);
  
  // Update topic evolution (Then vs Now)
  const oldTopicsEl = document.getElementById('oldTopics');
  const recentTopicsEl = document.getElementById('recentTopics');
  
  if (oldTopicsEl && firstPeriod.stats.topTopics.length > 0) {
    oldTopicsEl.innerHTML = firstPeriod.stats.topTopics.slice(0, 4).map(t => 
      `<span class="era-topic">${t.topic}</span>`
    ).join('');
  }
  if (recentTopicsEl && lastPeriod.stats.topTopics.length > 0) {
    recentTopicsEl.innerHTML = lastPeriod.stats.topTopics.slice(0, 4).map(t => 
      `<span class="era-topic">${t.topic}</span>`
    ).join('');
  }
  
  // Update milestone
  if (data.milestones && data.milestones.length > 0) {
    const milestoneEl = document.getElementById('evolutionMilestone');
    const peakValueEl = document.getElementById('peakMonthValue');
    const peakMilestone = data.milestones.find(m => m.event.includes('Peak'));
    if (peakMilestone && peakValueEl) {
      peakValueEl.textContent = peakMilestone.event.replace('Peak month: ', '');
    }
  }
}

function updateMetricCard(changeId, oldId, newId, changePct, oldVal, newVal) {
  const changeEl = document.getElementById(changeId);
  const oldEl = document.getElementById(oldId);
  const newEl = document.getElementById(newId);
  
  if (changeEl) {
    changeEl.textContent = changePct >= 0 ? `+${changePct}%` : `${changePct}%`;
    changeEl.classList.toggle('decrease', changePct < 0);
  }
  if (oldEl) oldEl.textContent = oldVal;
  if (newEl) newEl.textContent = newVal;
}

/**
 * Render topic markers along the timeline
 */
function renderEvolutionTopicMarkers(monthlyData, oldTopics, recentTopics) {
  const container = document.getElementById('evolutionTopicsTimeline');
  if (!container || !monthlyData || monthlyData.length < 2) return;
  
  const markers = [];
  
  // Add old topics at ~15% position
  if (oldTopics && oldTopics.length > 0) {
    markers.push({
      topic: oldTopics[0].topic || oldTopics[0],
      position: 12,
      era: 'old',
      delay: 0.5
    });
  }
  
  // Add recent topics at ~85% position  
  if (recentTopics && recentTopics.length > 0) {
    markers.push({
      topic: recentTopics[0].topic || recentTopics[0],
      position: 88,
      era: 'new',
      delay: 0.8
    });
  }
  
  container.innerHTML = markers.map(m => `
    <div class="topic-marker era-${m.era}" style="left: ${m.position}%; animation-delay: ${m.delay}s;">
      <div class="topic-line"></div>
      <div class="topic-label">${m.topic}</div>
    </div>
  `).join('');
}

// Legacy function name for backwards compatibility
function changeEvolutionPeriod(periods, dateRange = null) {
  // This function is no longer needed with the new timeline design
  // but keeping for any onclick handlers that might still reference it
  console.log('Evolution period change - using timeline view instead');
}

// ============================================
// D3: INTEREST TIMELINE (Legacy - now part of Evolution chart)
// ============================================

// Note: renderInterestTimeline has been replaced by renderEvolutionChart
// and renderEvolutionTopicMarkers for the new timeline visualization

// ============================================
// D4: SPARKLINES (mini trend charts)
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
// D4: WORD FREQUENCY BUBBLES - Redesigned
// ============================================

function renderWordBubbles(topWords) {
  const container = document.getElementById('wordBubblesContainer');
  if (!container || !topWords || topWords.length === 0) {
    console.log('Word bubbles: no data or container');
    return;
  }
  
  // Store for animation
  storedTopWords = topWords;
  
  // Populate hero word (the #1)
  const heroWord = topWords[0];
  const heroWordEl = document.getElementById('vocabHeroWord');
  const heroCountEl = document.getElementById('vocabHeroCount');
  
  if (heroWordEl && heroWord) {
    const displayWord = heroWord.word.replace(/[^a-zA-Z0-9-]/g, '');
    heroWordEl.textContent = displayWord;
  }
  if (heroCountEl && heroWord) {
    heroCountEl.dataset.target = heroWord.count;
  }
  
  // Calculate stats
  const totalWords = topWords.length;
  const avgLength = topWords.reduce((acc, w) => acc + w.word.length, 0) / totalWords;
  
  const totalWordsEl = document.getElementById('vocabTotalWords');
  const avgLengthEl = document.getElementById('vocabAvgLength');
  
  if (totalWordsEl) totalWordsEl.dataset.target = totalWords;
  if (avgLengthEl) avgLengthEl.dataset.target = Math.round(avgLength);
  
  // Generate background particles
  const particlesContainer = document.getElementById('vocabParticles');
  if (particlesContainer) {
    particlesContainer.innerHTML = Array(20).fill(0).map((_, i) => `
      <div class="vocab-particle" style="
        left: ${Math.random() * 100}%;
        animation-delay: ${Math.random() * 15}s;
        opacity: ${0.2 + Math.random() * 0.4};
      "></div>
    `).join('');
  }
  
  // Take top 11 words (excluding hero) for bubble display
  const bubbleWords = topWords.slice(1, 12);
  const maxCount = bubbleWords[0]?.count || 1;
  
  // Base positions - spread across the container (hero is separate now)
  const basePositions = [
    { x: 15, y: 30 },   // #2 - Left upper
    { x: 85, y: 35 },   // #3 - Right upper
    { x: 10, y: 60 },   // #4 - Far left lower
    { x: 90, y: 58 },   // #5 - Far right lower
    { x: 35, y: 22 },   // #6 - Left upper mid
    { x: 68, y: 25 },   // #7 - Right upper mid
    { x: 25, y: 75 },   // #8 - Left lower
    { x: 75, y: 72 },   // #9 - Right lower
    { x: 50, y: 18 },   // #10 - Top center
    { x: 50, y: 80 },   // #11 - Bottom center
    { x: 55, y: 50 },   // #12 - Center
  ];
  
  // Randomize positions slightly for organic feel
  const randomOffset = () => (Math.random() - 0.5) * 6;
  
  container.innerHTML = bubbleWords.map((word, i) => {
    const basePos = basePositions[i] || { x: 50, y: 50 };
    const pos = {
      x: Math.max(12, Math.min(88, basePos.x + randomOffset())),
      y: Math.max(15, Math.min(85, basePos.y + randomOffset()))
    };
    const intensity = word.count / maxCount;
    
    // Size class based on actual count intensity
    let sizeClass = 'size-sm';
    if (intensity > 0.6) sizeClass = 'size-lg';
    else if (intensity > 0.25) sizeClass = 'size-md';
    
    // Randomize animation start delay for more organic staggering
    const baseDelay = i * 0.08;
    const randomDelay = baseDelay + (Math.random() * 0.2);
    
    // Clean up word display (remove trailing punctuation)
    const displayWord = word.word.replace(/[^a-zA-Z0-9-]/g, '');
    
    return `
      <div class="word-bubble ${sizeClass}" 
           style="left: ${pos.x.toFixed(1)}%; top: ${pos.y.toFixed(1)}%; --delay: ${randomDelay.toFixed(2)}s; opacity: 0; transform: translate(-50%, -50%) scale(0);"
           title="${displayWord}: ${word.count.toLocaleString()} uses">
        ${displayWord}
        <span class="word-bubble-count">${word.count >= 1000 ? (word.count/1000).toFixed(1) + 'k' : word.count}</span>
      </div>
    `;
  }).join('');
}

/**
 * Animate word bubbles slide when it becomes visible
 */
function animateWordBubblesSlide() {
  if (wordBubblesSlideAnimated) return;
  wordBubblesSlideAnimated = true;
  
  // Animate headline
  const headline = document.querySelector('.vocab-headline');
  if (headline) headline.classList.add('animate-in');
  
  // Animate subtitle with delay
  setTimeout(() => {
    const subtitle = document.querySelector('.vocab-subtitle');
    if (subtitle) subtitle.classList.add('animate-in');
  }, 150);
  
  // Animate hero card
  setTimeout(() => {
    const hero = document.querySelector('.vocab-hero');
    if (hero) hero.classList.add('animate-in');
    
    // Count up hero number
    const heroCountEl = document.getElementById('vocabHeroCount');
    if (heroCountEl) {
      const target = parseInt(heroCountEl.dataset.target) || 0;
      animateCountUp(heroCountEl, target, 1500);
    }
  }, 300);
  
  // Animate bubbles wrapper
  setTimeout(() => {
    const wrapper = document.querySelector('.word-bubbles-wrapper');
    if (wrapper) wrapper.classList.add('animate-in');
    
    // Animate individual bubbles with stagger
    const bubbles = document.querySelectorAll('.word-bubble');
    bubbles.forEach((bubble, i) => {
      setTimeout(() => {
        bubble.classList.add('animate-in');
      }, i * 80);
    });
  }, 500);
  
  // Animate stats
  setTimeout(() => {
    const stats = document.querySelector('.vocab-stats');
    if (stats) stats.classList.add('animate-in');
    
    // Count up stats
    const totalWordsEl = document.getElementById('vocabTotalWords');
    const avgLengthEl = document.getElementById('vocabAvgLength');
    
    if (totalWordsEl) {
      const target = parseInt(totalWordsEl.dataset.target) || 0;
      animateCountUp(totalWordsEl, target, 1200);
    }
    if (avgLengthEl) {
      const target = parseInt(avgLengthEl.dataset.target) || 0;
      animateCountUp(avgLengthEl, target, 1200);
    }
  }, 800);
  
  // Animate hint
  setTimeout(() => {
    const hint = document.querySelector('.vocab-hint');
    if (hint) hint.classList.add('animate-in');
  }, 1000);
}

// ============================================
// SLIDE 18: SHARE - Journey Complete
// ============================================

/**
 * Generate sparkle background elements for the share slide
 */
function generateShareSparkles() {
  const bg = document.getElementById('shareSparklesBg');
  if (!bg || bg.children.length > 0) return;
  
  const sparkleCount = 20;
  
  for (let i = 0; i < sparkleCount; i++) {
    const sparkle = document.createElement('div');
    sparkle.className = 'share-sparkle';
    sparkle.style.left = `${Math.random() * 100}%`;
    sparkle.style.top = `${50 + Math.random() * 50}%`;
    sparkle.style.animationDelay = `${Math.random() * 8}s`;
    sparkle.style.animationDuration = `${6 + Math.random() * 4}s`;
    bg.appendChild(sparkle);
  }
}

/**
 * Populate share slide with summary stats
 */
function populateShareSlide(s) {
  // Generate sparkle background
  generateShareSparkles();
  
  // Set data targets for count-up animation
  const convosEl = document.getElementById('shareConvos');
  const messagesEl = document.getElementById('shareMessages');
  
  if (convosEl) {
    convosEl.dataset.target = s.totalConversations || 0;
  }
  if (messagesEl) {
    messagesEl.dataset.target = s.totalMessages || 0;
  }
}

/**
 * Animate share slide when it becomes visible
 */
function animateShareSlide() {
  if (shareSlideAnimated) return;
  shareSlideAnimated = true;
  
  // Animate main content container (triggers child animations via CSS)
  const content = document.querySelector('.share-content');
  if (content) {
    content.classList.add('animate-in');
  }
  
  // Count up stats with delay
  setTimeout(() => {
    const convosEl = document.getElementById('shareConvos');
    const messagesEl = document.getElementById('shareMessages');
    
    if (convosEl) {
      const target = parseInt(convosEl.dataset.target) || 0;
      animateCountUp(convosEl, target, 1500);
    }
    if (messagesEl) {
      const target = parseInt(messagesEl.dataset.target) || 0;
      animateCountUp(messagesEl, target, 1500);
    }
  }, 400);
}

// ============================================
// D4: ACTIVITY HEATMAP - Redesigned with animations
// ============================================

async function fetchHeatmapData() {
  try {
    const response = await fetch('/api/wrapped/heatmap?months=12');
    if (!response.ok) throw new Error('Failed to fetch heatmap data');
    heatmapData = await response.json();
    return heatmapData;
  } catch (error) {
    console.error('Heatmap API error:', error);
    return null;
  }
}

function renderHeatmap(data) {
  if (!data || !data.days) return;
  
  const grid = document.getElementById('heatmapGrid');
  const monthsContainer = document.getElementById('heatmapMonths');
  
  if (!grid) return;
  
  // Group days by week
  const weeks = [];
  let currentWeek = [];
  let currentMonth = null;
  const months = [];
  
  data.days.forEach((day, i) => {
    const date = new Date(day.date);
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    
    // Track month changes for labels
    if (month !== currentMonth) {
      currentMonth = month;
      months.push({ name: month, weekIndex: weeks.length });
    }
    
    currentWeek.push(day);
    
    // End of week (Saturday) or last day
    if (day.dayOfWeek === 6 || i === data.days.length - 1) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });
  
  // Calculate intensity levels
  const maxCount = data.stats.maxCount;
  const getLevel = (count) => {
    if (count === 0) return 0;
    if (count <= maxCount * 0.25) return 1;
    if (count <= maxCount * 0.5) return 2;
    if (count <= maxCount * 0.75) return 3;
    return 4;
  };
  
  // Render month labels
  if (monthsContainer) {
    monthsContainer.innerHTML = months.map((m, i) => {
      const nextMonth = months[i + 1];
      const weekSpan = (nextMonth ? nextMonth.weekIndex : weeks.length) - m.weekIndex;
      return `<span class="heatmap-month-label" style="min-width: ${weekSpan * 15}px">${m.name}</span>`;
    }).join('');
  }
  
  // Render grid (cells start hidden, will be animated on slide view)
  let cellIndex = 0;
  grid.innerHTML = weeks.map(week => {
    // Pad incomplete weeks at the start
    const paddedWeek = [...Array(7 - week.length).fill(null), ...week];
    if (week[0]?.dayOfWeek !== 0) {
      const padding = week[0]?.dayOfWeek || 0;
      paddedWeek.splice(0, 7 - week.length);
      for (let i = 0; i < padding; i++) {
        paddedWeek.unshift(null);
      }
      paddedWeek.length = 7;
    }
    
    return `
      <div class="heatmap-week">
        ${paddedWeek.map(day => {
          if (!day) return '<div class="heatmap-cell level-0" style="visibility: hidden;"></div>';
          const level = getLevel(day.count);
          const idx = cellIndex++;
          return `<div class="heatmap-cell level-${level}" 
            data-date="${day.date}" 
            data-count="${day.count}"
            data-cell-index="${idx}"
            onmouseenter="showHeatmapTooltip(event)"
            onmouseleave="hideHeatmapTooltip()"></div>`;
        }).join('')}
      </div>
    `;
  }).join('');
  
  // Store stats data for animation (don't display values yet)
  const activeDaysEl = document.getElementById('heatmapActiveDays');
  const streakEl = document.getElementById('heatmapStreak');
  const rateEl = document.getElementById('heatmapRate');
  
  if (activeDaysEl) activeDaysEl.dataset.target = data.stats.activeDays;
  if (streakEl) streakEl.dataset.target = data.stats.longestStreak;
  if (rateEl) rateEl.dataset.target = data.stats.activityRate;
  
  // Set up busiest day highlight
  const busiestDayEl = document.getElementById('heatmapBusiestDay');
  if (busiestDayEl && data.stats.busiestDay) {
    const busiestDate = new Date(data.stats.busiestDay.date);
    const formatted = busiestDate.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
    busiestDayEl.textContent = `${formatted} (${data.stats.busiestDay.count} messages)`;
  }
}

/**
 * Animate heatmap slide when it becomes visible
 */
function animateHeatmapSlide() {
  if (!heatmapData || heatmapSlideAnimated) return;
  heatmapSlideAnimated = true;
  
  // Animate only ACTIVE heatmap cells (level-1 through level-4) with staggered reveal
  // Level-0 (grey/inactive) cells are already visible via CSS
  const activeCells = document.querySelectorAll('.heatmap-cell.level-1, .heatmap-cell.level-2, .heatmap-cell.level-3, .heatmap-cell.level-4');
  const baseDelay = 8; // ms per cell
  const maxDelay = 1000; // cap the total animation time
  
  activeCells.forEach((cell, i) => {
    const delay = Math.min(i * baseDelay, maxDelay);
    setTimeout(() => {
      cell.classList.add('animated');
    }, delay);
  });
  
  // Animate stats with count-up after cells start appearing
  setTimeout(() => {
    // Active days count-up
    const activeDaysEl = document.getElementById('heatmapActiveDays');
    if (activeDaysEl) {
      const target = parseInt(activeDaysEl.dataset.target) || 0;
      animateCountUp(activeDaysEl, target, 1500);
      
      // Animate the bar based on activity rate (active days / total days)
      const barFill = document.getElementById('heatmapActiveDaysBar');
      if (barFill && heatmapData.stats) {
        const percent = (heatmapData.stats.activeDays / heatmapData.stats.totalDays) * 100;
        setTimeout(() => {
          barFill.style.width = `${Math.min(percent, 100)}%`;
        }, 100);
      }
    }
    
    // Streak count-up
    const streakEl = document.getElementById('heatmapStreak');
    if (streakEl) {
      const target = parseInt(streakEl.dataset.target) || 0;
      animateCountUp(streakEl, target, 1500);
      
      // Animate streak dots
      const dotsContainer = document.getElementById('heatmapStreakDots');
      if (dotsContainer && target > 0) {
        const dotCount = Math.min(target, 14); // Cap at 14 dots
        dotsContainer.innerHTML = Array(dotCount).fill(0).map((_, i) => 
          `<div class="heatmap-streak-dot" style="animation-delay: ${i * 60}ms"></div>`
        ).join('');
      }
    }
    
    // Activity rate count-up with ring animation
    const rateEl = document.getElementById('heatmapRate');
    if (rateEl) {
      const target = parseInt(rateEl.dataset.target) || 0;
      
      // Count up with % suffix
      let current = 0;
      const duration = 1500;
      const startTime = performance.now();
      
      const updateRate = (timestamp) => {
        const elapsed = timestamp - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
        current = Math.round(eased * target);
        rateEl.textContent = `${current}%`;
        
        if (progress < 1) {
          requestAnimationFrame(updateRate);
        }
      };
      requestAnimationFrame(updateRate);
      
      // Animate the ring
      const ringFill = document.getElementById('heatmapRingFill');
      if (ringFill) {
        setTimeout(() => {
          ringFill.style.strokeDasharray = `${target}, 100`;
        }, 100);
      }
    }
  }, 400);
}

function showHeatmapTooltip(event) {
  const tooltip = document.getElementById('heatmapTooltip');
  const cell = event.target;
  if (!tooltip || !cell) return;
  
  // Read data directly from the cell's data attributes
  const date = cell.dataset.date;
  const count = parseInt(cell.dataset.count) || 0;
  
  const dateObj = new Date(date);
  const formattedDate = dateObj.toLocaleDateString('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  });
  
  const tooltipDateEl = document.getElementById('tooltipDate');
  const tooltipCountContainer = document.querySelector('.heatmap-tooltip-count');
  
  if (tooltipDateEl) tooltipDateEl.textContent = formattedDate;
  
  // Show "No activity" for days with 0 messages, otherwise show count
  if (tooltipCountContainer) {
    tooltipCountContainer.innerHTML = count === 0 
      ? '<span style="color: var(--text-muted);">No activity</span>'
      : `<span id="tooltipCount">${count.toLocaleString()}</span> messages`;
  }
  
  tooltip.style.left = `${event.pageX + 10}px`;
  tooltip.style.top = `${event.pageY - 40}px`;
  tooltip.classList.add('visible');
}

function hideHeatmapTooltip() {
  const tooltip = document.getElementById('heatmapTooltip');
  if (tooltip) tooltip.classList.remove('visible');
}

// ============================================
// SLIDE 15: VERDICT CARDS (ROAST + COMPLIMENT) - REDESIGNED
// ============================================

/**
 * Generate floating background icons for verdict slide
 */
function generateVerdictBackground() {
  const container = document.getElementById('verdictBg');
  if (!container || container.children.length > 0) return;
  
  const icons = ['🔥', '✨', '💬', '🎯', '💡', '⚡'];
  const numIcons = 12;
  
  for (let i = 0; i < numIcons; i++) {
    const icon = document.createElement('span');
    icon.className = `verdict-bg-icon ${i % 2 === 0 ? 'fire' : 'sparkle'}`;
    icon.textContent = icons[i % icons.length];
    icon.style.left = `${Math.random() * 90 + 5}%`;
    icon.style.animationDelay = `${Math.random() * 8}s`;
    icon.style.animationDuration = `${8 + Math.random() * 4}s`;
    container.appendChild(icon);
  }
}

/**
 * Populate verdict slide data (no animations yet - triggered when slide visible)
 */
function populateVerdictSlide(stats, aiInsights) {
  // Generate background
  generateVerdictBackground();
  
  // Get real data - no fallbacks
  const roastText = aiInsights?.oneLineRoast;
  const complimentText = aiInsights?.compliment;
  
  // Calculate confidence based on message count
  const confidence = Math.min(95, Math.max(60, Math.floor((stats.totalMessages || 0) / 100) + 70));
  
  // Generate headlines
  const roastHeadlines = ['The Truth Hurts', 'Reality Check', 'No Filter', 'The Verdict', 'Hard Facts'];
  const complimentHeadlines = ['But Wait...', 'Silver Lining', 'The Good News', 'Actually Though', 'Redemption Arc'];
  
  const roastHeadline = roastHeadlines[Math.floor(Math.random() * roastHeadlines.length)];
  const complimentHeadline = complimentHeadlines[Math.floor(Math.random() * complimentHeadlines.length)];
  
  // Set headlines immediately (static)
  const roastHeadlineEl = document.getElementById('roastHeadline');
  const complimentHeadlineEl = document.getElementById('complimentHeadline');
  if (roastHeadlineEl) roastHeadlineEl.textContent = roastHeadline;
  if (complimentHeadlineEl) complimentHeadlineEl.textContent = complimentHeadline;
  
  // Handle missing data
  if (!roastText || !complimentText) {
    const roastCard = document.getElementById('verdictRoastCard');
    const complimentCard = document.getElementById('verdictComplimentCard');
    
    if (!roastText && roastCard) {
      const roastTextEl = document.getElementById('finalRoast');
      if (roastTextEl) roastTextEl.innerHTML = '<span style="color: var(--text-muted);">No roast data available</span>';
    }
    if (!complimentText && complimentCard) {
      const complimentTextEl = document.getElementById('finalCompliment');
      if (complimentTextEl) complimentTextEl.innerHTML = '<span style="color: var(--text-muted);">No compliment data available</span>';
    }
  }
  
  // Store data for animation
  verdictSlideData = {
    roastText: roastText || null,
    complimentText: complimentText || null,
    confidence,
    totalMessages: stats.totalMessages || 0
  };
}

/**
 * Animate verdict slide when it becomes visible
 */
function animateVerdictSlide() {
  if (!verdictSlideData || verdictSlideAnimated) return;
  verdictSlideAnimated = true;
  
  const { roastText, complimentText, confidence, totalMessages } = verdictSlideData;
  
  // Animate roast card entrance
  const roastCard = document.getElementById('verdictRoastCard');
  if (roastCard) {
    setTimeout(() => roastCard.classList.add('visible'), 100);
  }
  
  // Animate compliment card entrance (staggered)
  const complimentCard = document.getElementById('verdictComplimentCard');
  if (complimentCard) {
    setTimeout(() => complimentCard.classList.add('visible'), 400);
  }
  
  // Typewriter effect for roast text
  if (roastText) {
    const roastTextEl = document.getElementById('finalRoast');
    if (roastTextEl) {
      setTimeout(() => {
        verdictTypewriter(roastTextEl, roastText, 25);
      }, 700);
    }
  }
  
  // Typewriter effect for compliment text (staggered)
  if (complimentText) {
    const complimentTextEl = document.getElementById('finalCompliment');
    if (complimentTextEl) {
      setTimeout(() => {
        verdictTypewriter(complimentTextEl, complimentText, 25);
      }, 1200);
    }
  }
  
  // Animate confidence meters
  setTimeout(() => {
    const roastConfidence = document.getElementById('roastConfidence');
    const roastFill = document.getElementById('roastConfidenceFill');
    const complimentConfidence = document.getElementById('complimentConfidence');
    const complimentFill = document.getElementById('complimentConfidenceFill');
    
    // Count up confidence percentage
    if (roastConfidence) animateCountUp(roastConfidence, confidence, 1200, '%');
    if (roastFill) roastFill.style.width = `${confidence}%`;
    
    setTimeout(() => {
      if (complimentConfidence) animateCountUp(complimentConfidence, confidence, 1200, '%');
      if (complimentFill) complimentFill.style.width = `${confidence}%`;
    }, 300);
  }, 900);
  
  // Animate message count
  setTimeout(() => {
    const msgCountEl = document.getElementById('roastMsgCount');
    if (msgCountEl) animateCountUp(msgCountEl, totalMessages, 1500);
  }, 1100);
}

/**
 * Typewriter effect for verdict text
 */
function verdictTypewriter(element, text, speed = 30, onComplete) {
  if (!element || !text) return;
  
  let i = 0;
  element.innerHTML = '<span class="verdict-cursor"></span>';
  
  function type() {
    if (i < text.length) {
      const cursor = element.querySelector('.verdict-cursor');
      if (cursor) {
        cursor.insertAdjacentText('beforebegin', text.charAt(i));
      } else {
        element.textContent += text.charAt(i);
      }
      i++;
      setTimeout(type, speed);
    } else {
      // Remove cursor after typing complete
      setTimeout(() => {
        const cursor = element.querySelector('.verdict-cursor');
        if (cursor) cursor.remove();
        if (onComplete) onComplete();
      }, 500);
    }
  }
  
  type();
}

// ============================================
// SLIDE 16: ACHIEVEMENTS TROPHY ROOM - REDESIGNED
// ============================================

/**
 * Define all achievements with tiered progression
 * Each achievement can have multiple tiers (bronze → silver → gold → diamond → legendary)
 */
function getAchievementDefinitions(stats) {
  const totalMessages = stats.totalMessages || 0;
  const totalConversations = stats.totalConversations || 0;
  const longestStreak = stats.enhanced?.longestStreak || stats.streaks?.longestStreak || 0;
  const nightOwlScore = stats.enhanced?.nightOwlScore || 0;
  const topicCount = stats.topics?.length || 0;
  const totalActiveDays = stats.enhanced?.totalActiveDays || stats.streaks?.totalActiveDays || 0;
  const imagesGenerated = imageStats?.generated || 0;
  
  // Parse first message year - check multiple possible field names
  let firstMessageYear = 9999;
  const dateFields = [stats.firstDate, stats.firstMessage, stats.firstConversationDate];
  for (const dateField of dateFields) {
    if (dateField) {
      try {
        const date = new Date(dateField);
        if (!isNaN(date.getTime())) {
          firstMessageYear = date.getFullYear();
          break;
        }
      } catch (e) {
        // Try next field
      }
    }
  }
  
  // Debug log for achievements
  console.log('Achievement data:', { 
    firstDate: stats.firstDate,
    firstMessageYear, 
    totalMessages, 
    totalConversations,
    totalActiveDays,
    longestStreak,
    topicCount,
    imagesGenerated
  });
  
  return [
    // Message milestones - extended tiers
    {
      id: 'messages',
      icon: '💬',
      tiers: [
        { threshold: 100, name: 'Chatterbox', desc: '100+ messages', tier: 'bronze' },
        { threshold: 500, name: 'Conversationalist', desc: '500+ messages', tier: 'silver' },
        { threshold: 1000, name: 'Wordsmith', desc: '1,000+ messages', tier: 'gold' },
        { threshold: 5000, name: 'Legendary Talker', desc: '5,000+ messages', tier: 'diamond' },
        { threshold: 10000, name: 'Chat Titan', desc: '10,000+ messages', tier: 'legendary' },
        { threshold: 25000, name: 'Conversation God', desc: '25,000+ messages', tier: 'mythic' },
      ],
      currentValue: totalMessages,
    },
    // Conversation milestones - extended tiers
    {
      id: 'conversations',
      icon: '📝',
      tiers: [
        { threshold: 10, name: 'Getting Started', desc: '10+ conversations', tier: 'bronze' },
        { threshold: 50, name: 'Regular User', desc: '50+ conversations', tier: 'silver' },
        { threshold: 100, name: 'Power Chatter', desc: '100+ conversations', tier: 'gold' },
        { threshold: 500, name: 'ChatGPT Addict', desc: '500+ conversations', tier: 'diamond' },
        { threshold: 1000, name: 'Conversation Master', desc: '1,000+ conversations', tier: 'legendary' },
        { threshold: 2500, name: 'AI Confidant', desc: '2,500+ conversations', tier: 'mythic' },
      ],
      currentValue: totalConversations,
    },
    // Streak milestones - extended tiers
    {
      id: 'streak',
      icon: '🔥',
      tiers: [
        { threshold: 3, name: 'Warming Up', desc: '3+ day streak', tier: 'bronze' },
        { threshold: 7, name: 'Streak Starter', desc: '7+ day streak', tier: 'silver' },
        { threshold: 14, name: 'Streak Master', desc: '14+ day streak', tier: 'gold' },
        { threshold: 30, name: 'Unstoppable', desc: '30+ day streak', tier: 'diamond' },
        { threshold: 60, name: 'Relentless', desc: '60+ day streak', tier: 'legendary' },
        { threshold: 100, name: 'Century Streaker', desc: '100+ day streak', tier: 'mythic' },
      ],
      currentValue: longestStreak,
    },
    // Night Owl - extended tiers
    {
      id: 'nightowl',
      icon: '🌙',
      tiers: [
        { threshold: 5, name: 'Night Curious', desc: 'Some late-night chats', tier: 'bronze' },
        { threshold: 15, name: 'Night Owl', desc: 'Active after midnight', tier: 'silver' },
        { threshold: 30, name: 'Nocturnal', desc: 'Master of the midnight hour', tier: 'gold' },
        { threshold: 50, name: 'Vampire Mode', desc: 'The night is your domain', tier: 'diamond' },
      ],
      currentValue: nightOwlScore,
    },
    // Topic Explorer - extended tiers
    {
      id: 'topics',
      icon: '🌈',
      tiers: [
        { threshold: 3, name: 'Curious Mind', desc: '3+ topics explored', tier: 'bronze' },
        { threshold: 5, name: 'Explorer', desc: '5+ topics explored', tier: 'silver' },
        { threshold: 10, name: 'Renaissance Thinker', desc: '10+ topics explored', tier: 'gold' },
        { threshold: 15, name: 'Polymath', desc: '15+ topics explored', tier: 'diamond' },
      ],
      currentValue: topicCount,
    },
    // Artist - extended tiers
    {
      id: 'artist',
      icon: '🎨',
      tiers: [
        { threshold: 1, name: 'First Creation', desc: 'Created an AI image', tier: 'bronze' },
        { threshold: 10, name: 'Artist', desc: '10+ AI images', tier: 'silver' },
        { threshold: 50, name: 'Digital Picasso', desc: '50+ AI images', tier: 'gold' },
        { threshold: 100, name: 'Visual Virtuoso', desc: '100+ AI images', tier: 'diamond' },
        { threshold: 250, name: 'AI Art Legend', desc: '250+ AI images', tier: 'legendary' },
      ],
      currentValue: imagesGenerated,
    },
    // Dedication - extended tiers
    {
      id: 'dedication',
      icon: '📅',
      tiers: [
        { threshold: 7, name: 'Week Warrior', desc: '7+ active days', tier: 'bronze' },
        { threshold: 30, name: 'Monthly Regular', desc: '30+ active days', tier: 'silver' },
        { threshold: 100, name: 'Devoted User', desc: '100+ active days', tier: 'gold' },
        { threshold: 200, name: 'Dedicated Partner', desc: '200+ active days', tier: 'diamond' },
        { threshold: 365, name: 'Year-Round Companion', desc: '365+ active days', tier: 'legendary' },
      ],
      currentValue: totalActiveDays,
    },
    // OG Status - special year-based (fixed logic)
    {
      id: 'og',
      icon: '🏆',
      tiers: [
        { threshold: 2024, name: 'New Friend', desc: 'Joined in 2024', tier: 'bronze' },
        { threshold: 2023, name: 'ChatGPT OG', desc: 'Used since 2023', tier: 'gold' },
        { threshold: 2022, name: 'Early Adopter', desc: 'Used since 2022', tier: 'legendary' },
      ],
      currentValue: firstMessageYear,
      isYearBased: true,
    },
  ];
}

/**
 * Process achievements to find current tier and progress
 */
function processAchievements(stats) {
  const definitions = getAchievementDefinitions(stats);
  const processed = [];
  
  for (const def of definitions) {
    let currentTier = null;
    let nextTier = null;
    let highestUnlockedIdx = -1;
    
    // For year-based achievements, lower is better
    if (def.isYearBased) {
      for (let i = def.tiers.length - 1; i >= 0; i--) {
        const tier = def.tiers[i];
        if (def.currentValue <= tier.threshold) {
          currentTier = tier;
          highestUnlockedIdx = i;
          break;
        }
      }
      // Next tier is the one with lower year requirement
      if (highestUnlockedIdx < def.tiers.length - 1) {
        nextTier = def.tiers[highestUnlockedIdx + 1];
      } else if (highestUnlockedIdx === -1 && def.tiers.length > 0) {
        nextTier = def.tiers[0];
      }
    } else {
      // Normal threshold-based achievements
      for (let i = def.tiers.length - 1; i >= 0; i--) {
        const tier = def.tiers[i];
        if (def.currentValue >= tier.threshold) {
          currentTier = tier;
          highestUnlockedIdx = i;
          break;
        }
      }
      // Next tier is the next higher threshold
      if (highestUnlockedIdx < def.tiers.length - 1) {
        nextTier = def.tiers[highestUnlockedIdx + 1];
      } else if (highestUnlockedIdx === -1 && def.tiers.length > 0) {
        nextTier = def.tiers[0];
      }
    }
    
    // Calculate progress toward next tier
    let progress = 0;
    if (nextTier && !def.isYearBased) {
      const prevThreshold = currentTier ? currentTier.threshold : 0;
      progress = Math.min(100, Math.round(((def.currentValue - prevThreshold) / (nextTier.threshold - prevThreshold)) * 100));
    }
    
    processed.push({
      id: def.id,
      icon: def.icon,
      currentTier,
      nextTier,
      currentValue: def.currentValue,
      progress,
      isUnlocked: currentTier !== null,
      allTiers: def.tiers,
      isYearBased: def.isYearBased,
    });
  }
  
  return processed;
}

/**
 * Render achievements - populate the grid (no animations yet)
 */
function renderAchievements(stats, aiInsights) {
  const grid = document.getElementById('achievementsGrid');
  if (!grid) return;
  
  const processed = processAchievements(stats);
  
  // Debug: log all processed achievements
  console.log('Processed achievements:', processed.map(a => ({
    id: a.id,
    icon: a.icon,
    isUnlocked: a.isUnlocked,
    currentTier: a.currentTier?.name,
    nextTier: a.nextTier?.name,
    currentValue: a.currentValue
  })));
  
  const unlockedCount = processed.filter(a => a.isUnlocked).length;
  const totalAchievements = processed.length;
  
  // Generate particles for background
  generateAchievementParticles();
  
  // Store data for animation
  achievementsSlideData = {
    processed,
    unlockedCount,
    totalAchievements,
  };
  
  // Hide next milestone section (removed feature)
  const nextEl = document.getElementById('achievementsNext');
  if (nextEl) nextEl.style.display = 'none';
  
  // Render achievement cards - ALWAYS show all achievements
  grid.innerHTML = processed.map((a, idx) => {
    const tierClass = a.isUnlocked ? `tier-${a.currentTier.tier}` : '';
    const unlockedClass = a.isUnlocked ? 'unlocked' : 'locked';
    const displayTier = a.isUnlocked ? a.currentTier : a.nextTier;
    
    // Fallback if somehow no tier info (shouldn't happen)
    if (!displayTier) {
      console.warn('No display tier for achievement:', a.id);
      const fallbackTier = a.allTiers?.[0];
      if (!fallbackTier) return ''; // Only skip if truly no tiers defined
      return `
        <div class="achievement-card locked" data-index="${idx}">
          <div class="achievement-card-lock">🔒</div>
          <div class="achievement-card-icon">${a.icon}</div>
          <div class="achievement-card-name">${fallbackTier.name}</div>
          <div class="achievement-card-desc">${fallbackTier.desc}</div>
        </div>
      `;
    }
    
    // Show progress bar for locked achievements (not for year-based)
    const progressBar = !a.isUnlocked && a.nextTier && !a.isYearBased ? `
      <div class="achievement-card-progress">
        <div class="achievement-card-progress-bar">
          <div class="achievement-card-progress-fill" data-progress="${a.progress}" style="width: 0;"></div>
        </div>
        <div class="achievement-card-progress-text">${(a.currentValue || 0).toLocaleString()} / ${a.nextTier.threshold.toLocaleString()}</div>
      </div>
    ` : '';
    
    return `
      <div class="achievement-card ${unlockedClass} ${tierClass}" data-index="${idx}">
        ${a.isUnlocked ? '<div class="achievement-card-check">✓</div>' : '<div class="achievement-card-lock">🔒</div>'}
        <div class="achievement-card-icon">${a.icon}</div>
        <div class="achievement-card-name">${displayTier.name}</div>
        <div class="achievement-card-desc">${displayTier.desc}</div>
        ${a.isUnlocked ? `<div class="achievement-card-tier">${getTierLabel(displayTier.tier)}</div>` : ''}
        ${progressBar}
      </div>
    `;
  }).join('');
}

/**
 * Get display label for tier
 */
function getTierLabel(tier) {
  const labels = {
    bronze: '🥉 Bronze',
    silver: '🥈 Silver',
    gold: '🥇 Gold',
    diamond: '💎 Diamond',
    legendary: '⭐ Legendary',
    mythic: '🌟 Mythic',
  };
  return labels[tier] || tier;
}

/**
 * Generate floating particles for achievements background
 */
function generateAchievementParticles() {
  const bg = document.getElementById('achievementsBg');
  if (!bg) return;
  
  // Clear existing particles
  const existingParticles = bg.querySelectorAll('.achievement-particle');
  existingParticles.forEach(p => p.remove());
  
  // Add trophy/medal particles
  const particles = ['🏆', '🎖️', '⭐', '🌟', '✨', '💫', '🥇', '🥈', '🥉'];
  for (let i = 0; i < 12; i++) {
    const particle = document.createElement('div');
    particle.className = 'achievement-particle';
    particle.textContent = particles[i % particles.length];
    particle.style.left = `${Math.random() * 100}%`;
    particle.style.animationDelay = `${Math.random() * 15}s`;
    particle.style.animationDuration = `${12 + Math.random() * 8}s`;
    bg.appendChild(particle);
  }
}

/**
 * Animate achievements slide (called when slide becomes visible)
 */
function animateAchievementsSlide() {
  if (!achievementsSlideData || achievementsSlideAnimated) return;
  achievementsSlideAnimated = true;
  
  const { processed, unlockedCount, totalAchievements } = achievementsSlideData;
  
  // Animate summary section
  const summary = document.querySelector('.achievements-summary');
  if (summary) {
    summary.classList.add('animate-in');
  }
  
  // Animate progress ring and count
  setTimeout(() => {
    const ringFill = document.getElementById('achievementsRingFill');
    const countEl = document.getElementById('achievementsUnlockedCount');
    const summaryTextEl = document.getElementById('achievementsSummaryText');
    
    if (ringFill) {
      const percent = Math.round((unlockedCount / totalAchievements) * 100);
      ringFill.style.strokeDasharray = `${percent}, 100`;
    }
    
    if (countEl) {
      animateCountUp(countEl, unlockedCount, 1000);
    }
    
    if (summaryTextEl) {
      const remaining = totalAchievements - unlockedCount;
      if (remaining === 0) {
        summaryTextEl.textContent = `You've unlocked every achievement! 🎉`;
      } else if (remaining === 1) {
        summaryTextEl.textContent = `Just 1 more to complete your collection!`;
      } else {
        summaryTextEl.textContent = `${remaining} more achievements to unlock`;
      }
    }
  }, 400);
  
  // Animate cards with stagger
  const cards = document.querySelectorAll('.achievement-card');
  cards.forEach((card, idx) => {
    setTimeout(() => {
      card.classList.add('animate-in');
      
      // Animate progress bars for locked achievements
      const progressFill = card.querySelector('.achievement-card-progress-fill');
      if (progressFill) {
        setTimeout(() => {
          progressFill.style.width = `${progressFill.dataset.progress}%`;
        }, 200);
      }
    }, 100 + idx * 60);
  });
}

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

  if (typeof window.focusDebugSection === 'function') {
    const sectionMap = {
      0: 'raw',
      1: 'raw',
      2: 'topics',
      3: 'insights',
      4: 'insights',
      5: 'raw',
      7: 'insights',
      8: 'images',
      9: 'insights',
      10: 'achievements-sources',
      11: 'insights',
      12: 'achievements-results',
      13: 'raw',
      14: 'raw'
    };
    const sectionKey = sectionMap[n];
    if (sectionKey) {
      window.focusDebugSection(sectionKey);
    }
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
    syncDebugGlobals();

    // Fetch AI insights (only when on server)
    try {
      updateProgress(70, '🤖 AI is analyzing your conversations via embeddings...');
      const insightsResponse = await fetch('/api/wrapped/insights');
      if (insightsResponse.ok) {
        const data = await insightsResponse.json();
        aiInsights = data.insights;
        discoveredThemes = data.discoveredThemes || [];
        syncDebugGlobals();
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
        syncDebugGlobals();
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
      syncDebugGlobals();
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
    syncDebugGlobals();
    
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
  syncDebugGlobals();
  
  // Generate AI insights for sample data
  aiInsights = generateSampleInsights(stats);
  syncDebugGlobals();
  
  // Generate themes
  discoveredThemes = generateDiscoveredThemes(stats, sampleConversations);
  syncDebugGlobals();
  
  // Add enhanced data
  stats.enhanced = {
    topicsOld: [
      { topic: 'coding', score: 45 },
      { topic: 'learning', score: 32 },
      { topic: 'writing', score: 18 },
      { topic: 'planning', score: 12 }
    ],
    topicsRecent: [
      { topic: 'coding', score: 52 },
      { topic: 'ai', score: 38 },
      { topic: 'learning', score: 25 },
      { topic: 'creative', score: 15 }
    ],
    monthlyTrend: generateMonthlyTrend(),
    trendDirection: 15,
    nightOwlScore: 35,
    marathonConvos: 12,
    quickConvos: 84,
    mostProductiveDay: 'Thursday',
    weekendRatio: 35
  };
  syncDebugGlobals();
  
  // Add top words for vocabulary slide
  stats.topWords = [
    { word: 'function', count: 234 },
    { word: 'component', count: 187 },
    { word: 'api', count: 156 },
    { word: 'react', count: 145 },
    { word: 'javascript', count: 132 },
    { word: 'data', count: 128 },
    { word: 'code', count: 121 },
    { word: 'error', count: 98 },
    { word: 'design', count: 87 },
    { word: 'build', count: 76 }
  ];
  syncDebugGlobals();
  
  // Add heatmap data for activity map slide
  heatmapData = generateHeatmapData(sampleConversations);
  syncDebugGlobals();
  
  await new Promise(r => setTimeout(r, 300));
  updateProgress(90, 'Generating insights...');
  
  await new Promise(r => setTimeout(r, 200));
  updateProgress(100, 'Done!');
  
  await new Promise(r => setTimeout(r, 300));
  populateSlides(stats);
  showScreen('wrapped');
}

function generateSampleInsights(stats) {
  return {
    profileSummary: 'You\'re a tech enthusiast with a passion for building things. Your conversations span from coding challenges to creative brainstorming.',
    obsession: 'coding',
    obsessionDetail: 'JavaScript and React are your jam. You spend significant time debugging, learning new patterns, and optimizing performance.',
    hiddenTheme: 'You\'re constantly learning and pushing your technical boundaries',
    questionStyle: 'You ask detailed, specific questions—the kind that show you\'ve already done some research.',
    roastPoint: 'You have 847 conversations but somehow still ask "why doesn\'t this work?" without including the actual error message.',
    complimentPoint: 'Your ability to articulate complex technical problems in simple terms is genuinely impressive.',
    personality: 'Curious, detail-oriented, and always iterating.',
    trendInsight: 'Your usage has been growing steadily. You\'re definitely a power user now.',
    achievements: ['Code Wizard', 'Conversation King', 'Night Owl']
  };
}

function generateMonthlyTrend() {
  const trend = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const baseValue = 45;
    const variation = Math.sin(i / 3) * 20 + Math.random() * 15;
    trend.push({
      month: date.toLocaleString('default', { month: 'short' }),
      count: Math.max(10, Math.round(baseValue + variation)),
      date: date
    });
  }
  return trend;
}

// ============================================
// REAL DATA ANALYSIS
// ============================================

function generateEnhancedAnalysis(conversations) {
  // Analyze conversation distribution over time
  const monthlyData = {};
  const now = new Date();
  
  // Initialize last 12 months
  for (let i = 11; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const key = `${year}-${month}`;
    monthlyData[key] = 0;
  }
  
  // Count conversations by month
  const topicsOverTime = { old: {}, recent: {} };
  const daysOfWeek = [0, 0, 0, 0, 0, 0, 0]; // Sunday-Saturday
  let convCount = 0;
  let marathonCount = 0; // 50+ messages
  let quickCount = 0; // <5 messages
  let mostProductiveDay = null;
  let maxDayCount = 0;
  
  for (const conv of conversations) {
    if (!conv.create_time) continue;
    const date = new Date(conv.create_time * 1000);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const key = `${year}-${month}`;
    
    if (monthlyData.hasOwnProperty(key)) {
      monthlyData[key]++;
      convCount++;
    }
    
    // Day of week tracking
    const dayOfWeek = date.getDay();
    daysOfWeek[dayOfWeek]++;
    if (daysOfWeek[dayOfWeek] > maxDayCount) {
      maxDayCount = daysOfWeek[dayOfWeek];
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      mostProductiveDay = dayNames[dayOfWeek];
    }
    
    // Count messages in conversation
    const messages = conv.mapping ? Object.values(conv.mapping) : [];
    const userMsgCount = messages.filter(m => m.message?.author?.role === 'user').length;
    if (userMsgCount >= 50) marathonCount++;
    if (userMsgCount < 5) quickCount++;
    
    // Topic tracking
    const title = (conv.title || '').toLowerCase();
    let topic = 'general';
    if (title.match(/code|function|api|bug|error|typescript|javascript|python|react|html|css/i)) topic = 'coding';
    else if (title.match(/write|email|blog|article|copy|draft/i)) topic = 'writing';
    else if (title.match(/learn|explain|how|what|why|tutorial/i)) topic = 'learning';
    else if (title.match(/plan|strategy|roadmap|todo|list/i)) topic = 'planning';
    else if (title.match(/design|creative|art|image|visual/i)) topic = 'creative';
    
    const isOld = date < new Date(now.getFullYear(), now.getMonth() - 6, 1);
    const bucket = isOld ? topicsOverTime.old : topicsOverTime.recent;
    bucket[topic] = (bucket[topic] || 0) + 1;
  }
  
  // Weekend vs weekday ratio
  const weekdayCount = daysOfWeek.slice(1, 6).reduce((a, b) => a + b, 0); // Mon-Fri
  const weekendCount = daysOfWeek[0] + daysOfWeek[6]; // Sat-Sun
  const weekendRatio = weekdayCount + weekendCount > 0 
    ? Math.round((weekendCount / (weekdayCount + weekendCount)) * 100) 
    : 0;
  
  // Convert to arrays
  const oldTopics = Object.entries(topicsOverTime.old)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([topic, count]) => ({ topic, count }));
  
  const recentTopics = Object.entries(topicsOverTime.recent)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([topic, count]) => ({ topic, count }));
  
  // Build monthly trend
  const monthlyTrend = Object.entries(monthlyData).map(([key, count]) => {
    const [year, month] = key.split('-');
    const date = new Date(year, parseInt(month) - 1, 1);
    return {
      month: date.toLocaleString('default', { month: 'short' }),
      count,
      date
    };
  });
  
  // Calculate trend direction
  const firstHalf = monthlyTrend.slice(0, 6).reduce((sum, m) => sum + (m.count ?? 0), 0);
  const secondHalf = monthlyTrend.slice(6).reduce((sum, m) => sum + (m.count ?? 0), 0);
  const trendDirection = ((secondHalf - firstHalf) / (firstHalf || 1)) * 100;
  
  return {
    topicsOld: oldTopics,
    topicsRecent: recentTopics,
    monthlyTrend,
    trendDirection: Math.round(trendDirection),
    nightOwlScore: calculateNightOwlScore(conversations),
    marathonConvos: marathonCount,
    quickConvos: quickCount,
    mostProductiveDay: mostProductiveDay || 'Monday',
    weekendRatio: weekendRatio
  };
}

function calculateNightOwlScore(conversations) {
  const nightHours = [22, 23, 0, 1, 2, 3, 4, 5]; // 10 PM - 5 AM
  let nightMessages = 0;
  let totalMessages = 0;
  
  for (const conv of conversations) {
    const messages = conv.mapping ? Object.values(conv.mapping) : [];
    for (const node of messages) {
      if (!node.message || node.message.author?.role !== 'user') continue;
      totalMessages++;
      
      if (node.message.create_time) {
        const hour = new Date(node.message.create_time * 1000).getHours();
        if (nightHours.includes(hour)) nightMessages++;
      }
    }
  }
  
  return totalMessages > 0 ? Math.round((nightMessages / totalMessages) * 100) : 0;
}

function extractTopWords(conversations) {
  const wordFreq = {};
  const stopwords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'is', 'are', 'was', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'what', 'which', 'who', 'when', 'where', 'why', 'how']);
  
  for (const conv of conversations) {
    const title = (conv.title || '').toLowerCase();
    const words = title.split(/\W+/).filter(w => w.length > 3 && !stopwords.has(w));
    
    for (const word of words) {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    }
    
    const messages = conv.mapping ? Object.values(conv.mapping) : [];
    for (const node of messages) {
      if (!node.message || node.message.author?.role !== 'user') continue;
      const text = node.message.content?.parts?.join(' ') || '';
      const words = text.toLowerCase().split(/\W+/).filter(w => w.length > 4 && !stopwords.has(w));
      
      for (const word of words) {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
      }
    }
  }
  
  return Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word, count]) => ({ word, count }));
}

function generateDiscoveredThemes(stats, conversations) {
  // Create semantic themes based on conversation patterns
  const themePatterns = {
    'Learning & Education': /learn|tutorial|explain|how|understand|teach|course|study|guide/i,
    'Creative Writing': /write|article|blog|story|narrative|script|poem|fiction|novel/i,
    'Technical Architecture': /architecture|design|system|pattern|structure|framework|implementation/i,
    'Business & Entrepreneurship': /business|startup|entrepreneurship|company|team|management|leadership|strategy/i,
    'AI Image Generation': /image|visual|generate|dall|midjourney|artwork|design|creative/i,
    'Career & Growth': /career|job|interview|resume|opportunity|growth|skill|development|promotion/i,
    'Productivity & Organization': /productivity|organize|organize|todo|task|schedule|plan|time management/i,
    'Personal Life': /personal|relationship|family|health|hobby|lifestyle|hobby|interest/i
  };
  
  const themeCounts = {};
  
  for (const conv of conversations) {
    const title = conv.title || '';
    const messages = conv.mapping ? Object.values(conv.mapping) : [];
    let messageText = title;
    
    for (const node of messages) {
      if (node.message?.content?.parts) {
        messageText += ' ' + node.message.content.parts.join(' ');
      }
    }
    
    for (const [themeName, pattern] of Object.entries(themePatterns)) {
      if (pattern.test(messageText)) {
        themeCounts[themeName] = (themeCounts[themeName] || 0) + messages.length;
      }
    }
  }
  
  // Convert to array and sort by count
  return Object.entries(themeCounts)
    .map(([name, messageCount]) => ({ name, messageCount }))
    .sort((a, b) => b.messageCount - a.messageCount)
    .slice(0, 6);
}

function generateHeatmapData(conversations) {
  // Build daily activity breakdown for heatmap
  const dailyActivity = {};
  let earliestDate = new Date();
  let latestDate = new Date();
  let messagesByHour = new Array(24).fill(0);
  let busiestDay = { date: null, count: 0 };
  let maxCount = 0;
  
  for (const conv of conversations) {
    const messages = conv.mapping ? Object.values(conv.mapping) : [];
    for (const node of messages) {
      if (!node.message || node.message.author?.role !== 'user') continue;
      
      const timestamp = node.message.metadata?.timestamp ?? node.message.create_time;
      if (!timestamp) continue;
      
      const date = new Date(timestamp * 1000);
      const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
      const hour = date.getHours();
      
      dailyActivity[dateKey] = (dailyActivity[dateKey] || 0) + 1;
      messagesByHour[hour]++;
      
      // Track busiest day
      if (dailyActivity[dateKey] > busiestDay.count) {
        busiestDay = { date: dateKey, count: dailyActivity[dateKey] };
        maxCount = dailyActivity[dateKey];
      }
      
      if (date < earliestDate) earliestDate = date;
      if (date > latestDate) latestDate = date;
    }
  }
  
  // If no data, return empty structure with safe defaults
  if (Object.keys(dailyActivity).length === 0) {
    return {
      stats: {
        activeDays: 0,
        longestStreak: 0,
        totalDays: 1,
        activityRate: 0,
        hoursWithActivity: 0,
        averageMessagesPerDay: 0,
        busiestDay: null,
        maxCount: 1
      },
      days: [],
      hourlyDistribution: messagesByHour,
      peakHours: []
    };
  }
  
  // Convert to continuous day range (ensures weeks render correctly)
  const days = [];
  const start = new Date(earliestDate);
  const end = new Date(latestDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateKey = d.toISOString().split('T')[0];
    const count = dailyActivity[dateKey] || 0;
    maxCount = Math.max(maxCount, count);
    days.push({
      date: new Date(d),
      dateStr: dateKey,
      count,
      dayOfWeek: d.getDay()
    });
  }
  
  // Calculate streak (consecutive days with activity)
  let longestStreak = 0;
  let currentStreak = 0;
  let activeDays = 0;
  
  for (const day of days) {
    if (day.count > 0) {
      activeDays++;
      currentStreak++;
      longestStreak = Math.max(longestStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  }
  
  const totalDays = Math.max(1, days.length);
  const activityRate = Math.round((activeDays / totalDays) * 100);
  
  return {
    stats: {
      activeDays,
      longestStreak,
      totalDays,
      activityRate,
      hoursWithActivity: messagesByHour.filter(h => h > 0).length,
      averageMessagesPerDay: Math.round(Object.values(dailyActivity).reduce((a, b) => a + b, 0) / Math.max(activeDays, 1)),
      busiestDay: busiestDay.date ? { date: busiestDay.date, count: busiestDay.count } : null,
      maxCount: Math.max(maxCount, 1)
    },
    days: days.slice(-365), // Last 365 days
    hourlyDistribution: messagesByHour,
    peakHours: messagesByHour
      .map((count, hour) => ({ hour, count }))
      .filter(h => h.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
  };
}

function generateDataInsights(stats, conversations) {
  // Determine primary obsession from topic distribution
  const topTopic = stats.topics && stats.topics.length > 0 ? stats.topics[0][0] : 'technology';
  const topicCount = stats.topics && stats.topics.length > 0 ? stats.topics[0][1] : 0;
  const totalConvs = stats.totalConversations || 1;
  const totalMsgs = stats.totalMessages || 1;
  const avgMsgsPerConv = Math.round(totalMsgs / totalConvs);
  
  // Get session data
  const enhanced = stats.enhanced || {};
  const marathonCount = enhanced.marathonConvos || 0;
  const quickCount = enhanced.quickConvos || 0;
  const nightOwl = enhanced.nightOwlScore || 0;
  
  // Generate contextual roasts based on actual usage patterns
  const generateContextualRoast = () => {
    const roastPool = [];
    
    if (marathonCount > 0) {
      roastPool.push(`You logged ${marathonCount} marathon sessions. That's not a chat, that's a lifestyle.`);
      roastPool.push(`${marathonCount} deep dives? At this point ChatGPT should be on your payroll.`);
    }
    if (quickCount > 0) {
      roastPool.push(`${quickCount} quick chats out of ${totalConvs}. You treat ChatGPT like a search bar with feelings.`);
      roastPool.push(`Your short chats are efficient. Your long chats are... rare.`);
    }
    if (nightOwl > 35) {
      roastPool.push(`${nightOwl}% of your messages land after 10 PM. Sleep is optional, apparently.`);
      roastPool.push(`Night‑owl ratio: ${nightOwl}%. You and ChatGPT are in a committed late‑night relationship.`);
    }
    if (avgMsgsPerConv < 6) {
      roastPool.push(`Average ${avgMsgsPerConv} messages per conversation. Blink and it's over.`);
    }
    if (totalConvs > 300) {
      roastPool.push(`${totalConvs} conversations and you're still "just exploring". Sure.`);
    }
    
    const topicRoasts = {
      coding: `You ask ChatGPT to debug your code more than you run your tests.`,
      writing: `You've rewritten the same sentence with ChatGPT's help at least 47 times.`,
      learning: `Your learning backlog is impressive. Your implementation backlog is larger.`,
      planning: `You plan in ChatGPT. You execute... with reminders from ChatGPT.`,
      creative: `You have amazing ideas, but finishing them? That's the optional DLC.`
    };
    roastPool.push(topicRoasts[topTopic] || `You use ChatGPT for everything, which is great but also... you use it for everything.`);
    
    const index = Math.abs(totalMsgs + totalConvs + marathonCount - quickCount) % roastPool.length;
    return roastPool[index];
  };
  
  // Generate contextual compliments
  const generateContextualCompliment = () => {
    const complimentPool = [];
    
    if (marathonCount > 5) {
      complimentPool.push(`Your long‑form sessions show real depth and persistence.`);
      complimentPool.push(`You stick with problems until they break. That's rare.`);
    }
    if (avgMsgsPerConv >= 10) {
      complimentPool.push(`Average ${avgMsgsPerConv} messages per conversation means you actually explore ideas.`);
    }
    if (nightOwl > 30) {
      complimentPool.push(`Late‑night energy, high‑quality questions. Your focus is strong.`);
    }
    if (totalConvs > 150) {
      complimentPool.push(`You consistently show up and ask better questions. That compounds fast.`);
    }
    
    const topicCompliments = {
      coding: `Your technical depth and problem‑solving approach show real mastery.`,
      writing: `Your attention to detail in language and communication is genuinely impressive.`,
      learning: `Your constant drive to understand and grow is the hallmark of a true learner.`,
      planning: `Your strategic thinking and ability to organize your thoughts is exceptional.`,
      creative: `Your willingness to experiment and explore new ideas is inspiring.`
    };
    complimentPool.push(topicCompliments[topTopic] || `Your conversations show genuine curiosity and thoughtfulness.`);
    
    const index = Math.abs(totalMsgs + totalConvs + quickCount) % complimentPool.length;
    return complimentPool[index];
  };
  
  const topicDescriptions = {
    coding: 'JavaScript, React, and APIs are your favorite tools. You\'re constantly solving technical problems.',
    writing: 'You love crafting emails, articles, and creative content. Communication is your strength.',
    learning: 'You\'re a knowledge seeker. You ask great questions and love understanding how things work.',
    planning: 'You\'re strategically minded. You think ahead and organize your projects well.',
    creative: 'You explore creative and artistic ideas with ChatGPT.'
  };
  
  const spiritAnimals = {
    coding: { animal: 'owl', reason: 'Night owl who debugs at 3 AM' },
    writing: { animal: 'peacock', reason: 'Expressing yourself with flair' },
    learning: { animal: 'dolphin', reason: 'Curious and intelligent explorer' },
    planning: { animal: 'beaver', reason: 'Building structures with intent' },
    creative: { animal: 'phoenix', reason: 'Creating and iterating endlessly' }
  };
  
  const personalities = {
    coding: { title: 'The Architect', subtitle: 'Building logic, one function at a time' },
    writing: { title: 'The Wordsmith', subtitle: 'Crafting the perfect phrase' },
    learning: { title: 'The Scholar', subtitle: 'Perpetually curious and questioning' },
    planning: { title: 'The Strategist', subtitle: 'Always thinking three steps ahead' },
    creative: { title: 'The Creator', subtitle: 'Bringing ideas to life' }
  };
  
  const roastText = generateContextualRoast();
  const complimentText = generateContextualCompliment();
  
  return {
    // Obsession slide specific
    topObsession: {
      topic: topTopic,
      count: topicCount,
      roast: roastText
    },
    
    // Verdict slide specific (roast + compliment)
    oneLineRoast: roastText,
    compliment: complimentText,
    
    // DNA Identity slide specific
    personality: personalities[topTopic] || { title: 'The Seeker', subtitle: 'Multi-disciplinary explorer' },
    spiritAnimal: spiritAnimals[topTopic] || { animal: 'owl', reason: 'Wise and observant' },
    
    // General insights
    profileSummary: `Based on ${stats.totalConversations} conversations and ${stats.totalMessages} messages, you're deeply engaged with ChatGPT.`,
    obsession: topTopic,
    obsessionDetail: topicDescriptions[topTopic] || 'You\'re a multi-disciplinary explorer.',
    hiddenTheme: 'You\'re driven by curiosity and the desire to understand and create.',
    questionStyle: 'You ask thoughtful, specific questions that show genuine engagement.',
    roastPoint: roastText,
    complimentPoint: complimentText,
    trendInsight: `Your ${stats.totalConversations} conversations show you\'re actively using ChatGPT as a thinking tool.`,
    achievements: ['Conversation Explorer', 'Curious Mind', 'AI Companion User']
  };
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
