// ============================================
// Slide 13: Cosmic Revelations - Fun Facts
// ============================================
// Dependencies: utils.js (formatHour), state.js (cosmicRevelationsData, cosmicRevelationsAnimated)
// DOM elements: revelationCards, revelationNoData

// Note: cosmicRevelationsData, cosmicRevelationsAnimated are defined in app.js

/**
 * Populate the Cosmic Revelations slide with fun facts
 * Horizontal scrolling carousel with staggered reveal
 * @param {Object} stats - Stats object
 * @param {Object} aiInsights - AI-generated insights with funFacts array
 * @param {number} nightScore - Night owl score percentage
 * @param {Object} enhanced - Enhanced stats object
 */
function populateCosmicRevelations(stats, aiInsights, nightScore, enhanced) {
  const container = document.getElementById('revelationCards');
  const noDataEl = document.getElementById('revelationNoData');
  
  if (!container) return;
  
  // Collect all available facts
  const aiFunFacts = aiInsights?.funFacts || [];
  
  // Build computed facts from stats with associated icons
  const computedFacts = [
    stats.streaks?.longestStreak > 0 ? {
      icon: '🔥',
      text: `<span class="fact-number">${stats.streaks.longestStreak}</span> day streak — your longest run`,
    } : null,
    stats.peakHour !== undefined ? {
      icon: '⏰',
      text: `Peak productivity at <span class="fact-number">${formatHour(stats.peakHour)}</span> on ${stats.peakDay}s`,
    } : null,
    stats.topWords?.[0]?.word ? {
      icon: '💬',
      text: `"${stats.topWords[0].word}" — your signature word`,
    } : null,
    stats.streaks?.totalActiveDays > 0 ? {
      icon: '📅',
      text: `<span class="fact-number">${stats.streaks.totalActiveDays}</span> active days with ChatGPT`,
    } : null,
    nightScore > 10 ? {
      icon: '🌙',
      text: `<span class="fact-number">${nightScore}%</span> of your chats happen after 10pm`,
    } : null,
    enhanced?.marathonConvos > 3 ? {
      icon: '💪',
      text: `<span class="fact-number">${enhanced.marathonConvos}</span> marathon sessions (50+ messages)`,
    } : null,
    enhanced?.productivityMultiplier > 1.5 ? {
      icon: '📈',
      text: `<span class="fact-number">${enhanced.productivityMultiplier}x</span> more active on ${enhanced.mostProductiveDay}s`,
    } : null,
    stats.totalConversations > 100 ? {
      icon: '🎯',
      text: `<span class="fact-number">${stats.totalConversations}</span> conversations — power user status`,
    } : null,
  ].filter(Boolean);
  
  // Build facts array - prefer AI insights, fall back to computed
  let facts = [];
  
  if (aiFunFacts.length > 0) {
    // Use AI-generated facts with appropriate icons
    const icons = ['✨', '🔮', '🌟', '💫', '🎭', '🌌'];
    facts = aiFunFacts.slice(0, 6).map((fact, i) => ({
      icon: icons[i % icons.length],
      text: fact,
    }));
  } else if (computedFacts.length > 0) {
    facts = computedFacts.slice(0, 6);
  }
  
  // Show no data state if no facts available
  if (facts.length === 0) {
    container.style.display = 'none';
    if (noDataEl) noDataEl.style.display = 'flex';
    return;
  }
  
  // Store data for animation
  cosmicRevelationsData = facts;
  cosmicRevelationsAnimated = false;
  
  // Render cards (simplified - no flip)
  container.innerHTML = facts.map((fact, i) => `
    <div class="revelation-card" data-index="${i}">
      <div class="revelation-card-inner">
        <div class="revelation-icon">${fact.icon}</div>
        <div class="revelation-fact">${fact.text}</div>
      </div>
    </div>
  `).join('');
  
  container.style.display = 'flex';
  if (noDataEl) noDataEl.style.display = 'none';
}

/**
 * Animate the Cosmic Revelations slide
 * Triggers when slide becomes visible - staggered card reveal
 */
function animateCosmicRevelations() {
  if (!cosmicRevelationsData || cosmicRevelationsAnimated) return;
  cosmicRevelationsAnimated = true;
  
  const cards = document.querySelectorAll('.revelation-card');
  if (cards.length === 0) return;
  
  // Staggered entrance animation
  cards.forEach((card, i) => {
    setTimeout(() => {
      card.classList.add('visible');
    }, i * 150);
  });
}

// Make slide functions globally available
window.populateCosmicRevelations = populateCosmicRevelations;
window.animateCosmicRevelations = animateCosmicRevelations;

