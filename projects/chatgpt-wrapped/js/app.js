// ============================================
// ChatGPT Wrapped - Main Application Orchestrator
// ============================================
// This file coordinates all modules. Core functionality is in:
//   - js/core/state.js          (global state variables)
//   - js/core/utils.js          (utility functions)
//   - js/core/analysis.js       (conversation analysis & insights)
//   - js/core/image-extraction.js (image extraction from exports)
//   - js/core/file-handling.js  (file upload & processing)
//   - js/core/navigation.js     (slide navigation & screens)
//   - js/core/evidence-modal.js (evidence modals & floating bubbles)
//   - js/core/sample-data.js    (demo data generation)
//   - js/core/init.js           (DOM initialization)
//
// Slide-specific UI is in js/slides/*.js
// Video export system is in js/video/*.js

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
  const nightScore = enhanced.nightOwlScore || 0;
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
  const oldTopics = enhanced.topicsOld || [];
  const recentTopics = enhanced.topicsRecent || [];
  
  // Render the monthly trend chart if data is available
  if (enhanced.monthlyTrend && enhanced.monthlyTrend.length > 0) {
    renderEvolutionChart(enhanced.monthlyTrend);
  }
  
  // Update topic boxes with new format
  const oldTopicsEl = document.getElementById('oldTopics');
  const recentTopicsEl = document.getElementById('recentTopics');
  const fmtTopicPopulate = (name) => (typeof window.formatTopicName === 'function') ? window.formatTopicName(name) : name;
  if (oldTopicsEl) {
    oldTopicsEl.innerHTML = oldTopics.length > 0 
      ? oldTopics.slice(0, 4).map(t => `<span class="era-topic">${fmtTopicPopulate(t.topic)}</span>`).join('') 
      : '<span class="era-topic" style="opacity: 0.5">No data</span>';
  }
  if (recentTopicsEl) {
    recentTopicsEl.innerHTML = recentTopics.length > 0
      ? recentTopics.slice(0, 4).map(t => `<span class="era-topic">${fmtTopicPopulate(t.topic)}</span>`).join('')
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

  // Slide 12 - AI Hidden Insights (no hardcoded fallbacks — data-driven or empty)
  const hiddenThemeEl = document.getElementById('hiddenTheme');
  const questionStyleEl = document.getElementById('questionStyle');
  if (aiInsights?.hiddenTheme) {
    if (hiddenThemeEl) hiddenThemeEl.textContent = `"${aiInsights.hiddenTheme}"`;
  } else {
    // Data-driven fallback from available stats
    if (hiddenThemeEl) {
      const mc = enhanced.marathonConvos || 0;
      const qc = enhanced.quickConvos || 0;
      const topicLen = s.topics?.length || 0;
      if (mc > 3 && mc > qc * 0.3) {
        hiddenThemeEl.textContent = `"${mc} marathon sessions reveal a preference for depth over quick answers"`;
      } else if (topicLen >= 4) {
        hiddenThemeEl.textContent = `"${topicLen} topic areas — your curiosity doesn't stay in one lane"`;
      } else if (nightScore > 25) {
        hiddenThemeEl.textContent = `"${nightScore}% of your messages sent after 10 PM — the night is your focus zone"`;
      } else {
        hiddenThemeEl.textContent = '';
      }
    }
  }
  if (aiInsights?.questionStyle) {
    if (questionStyleEl) questionStyleEl.textContent = aiInsights.questionStyle;
  } else {
    // Data-driven fallback from message depth
    if (questionStyleEl) {
      const avgMpc = s.totalMessages && s.totalConversations ? Math.round(s.totalMessages / s.totalConversations) : 0;
      if (avgMpc > 20) {
        questionStyleEl.textContent = `Iterative deep-diver — ${avgMpc} messages per conversation on average.`;
      } else if (avgMpc > 8) {
        questionStyleEl.textContent = `Thorough but focused — ${avgMpc} messages per conversation.`;
      } else if (avgMpc > 3) {
        questionStyleEl.textContent = `Efficient — you get what you need in ~${avgMpc} exchanges.`;
      } else if (avgMpc > 0) {
        questionStyleEl.textContent = `Rapid-fire — ${avgMpc} messages per conversation, quick and targeted.`;
      } else {
        questionStyleEl.textContent = '';
      }
    }
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
// LOAD MY DATA (from API)
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
      byHour: dbStats.byHour,
      hourCounts: dbStats.byHour,
      longestConvo: dbStats.longestConversation ? {
        title: dbStats.longestConversation.title,
        count: dbStats.longestConversation.messageCount
      } : { title: 'N/A', count: 0 },
      codeBlocks: dbStats.codeBlocksShared,
      images: dbStats.imagesUploaded,
      streaks: dbStats.streaks,
      topWords: dbStats.topWords,
      peakDay: dbStats.peakDay,
      firstDate: dbStats.firstConversationDate,
      lastDate: dbStats.lastConversationDate,
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
        imageStats = data.stats || { generated: 0, total: imagePrompts.length };
        syncDebugGlobals();
        console.log('✓ Image prompts loaded:', imagePrompts.length, 'stats:', imageStats);
      }
    } catch (e) {
      console.log('Image prompts not available:', e);
    }

    // Fetch evolution comparison data (D3.5)
    try {
      updateProgress(94, '📈 Analyzing your evolution...');
      currentEvolutionData = await fetchEvolutionData(2);
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

// Make loadMyData globally available for onclick handler
window.loadMyData = loadMyData;
