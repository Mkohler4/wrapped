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
  
  // Build unique fallback facts from stats that do NOT repeat other slides.
  // Other slides already show: streak (heatmap), peak hour (time), active days (heatmap),
  // night owl % (identity), total conversations (conversations), total messages (messages).
  // These fallback facts focus on behavioral insights unique to this slide.
  const totalConvs = stats.totalConversations || 1;
  const totalMsgs = stats.totalMessages || 1;
  const avgMsgsPerConv = Math.round(totalMsgs / totalConvs);
  
  const uniqueFallbackFacts = [
    // 1. Average conversation depth personality
    avgMsgsPerConv > 0 ? {
      icon: '📐',
      text: avgMsgsPerConv > 20
        ? `Average <span class="fact-number">${avgMsgsPerConv}</span> messages per conversation — you don't do small talk with AI`
        : avgMsgsPerConv > 8
        ? `Average <span class="fact-number">${avgMsgsPerConv}</span> messages per conversation — thorough but focused`
        : `Average <span class="fact-number">${avgMsgsPerConv}</span> messages per conversation — you know what you need and get out`,
    } : null,
    
    // 2. Code block density (messages slide shows total, this shows ratio)
    stats.codeBlocks > 5 && stats.userMessages > 0 ? (() => {
      const codeRatio = Math.round((stats.codeBlocks / stats.userMessages) * 100);
      return {
        icon: '💻',
        text: `<span class="fact-number">${codeRatio}%</span> of your messages include code — ${codeRatio > 20 ? 'basically pair programming' : codeRatio > 10 ? 'you speak fluent code' : 'code peppered in for flavor'}`,
      };
    })() : null,
    
    // 3. Marathon-to-quick ratio
    (enhanced?.marathonConvos || 0) > 0 && (enhanced?.quickConvos || 0) > 0 ? (() => {
      const ratio = Math.round((enhanced.quickConvos || 0) / (enhanced.marathonConvos || 1));
      return ratio > 3 ? {
        icon: '⚖️',
        text: `For every deep-dive, you fire off <span class="fact-number">${ratio}</span> quick chats — efficiency meets depth`,
      } : null;
    })() : null,
    
    // 4. Weekend vs weekday personality
    (enhanced?.weekendRatio || 0) > 0 ? (() => {
      const wr = enhanced.weekendRatio;
      if (wr > 55) return { icon: '🏖️', text: `<span class="fact-number">${wr}%</span> weekend usage — ChatGPT is your weekend hobby partner` };
      if (wr < 15) return { icon: '💼', text: `Only <span class="fact-number">${wr}%</span> weekend usage — you clock out from AI on weekends` };
      return null;
    })() : null,
    
    // 5. Topic diversity insight
    (stats.topics?.length || 0) > 0 ? {
      icon: '🧩',
      text: stats.topics.length >= 4
        ? `You've explored <span class="fact-number">${stats.topics.length}</span> different topic areas — intellectual range on display`
        : `<span class="fact-number">${stats.topics.length}</span> topic areas — you know your lane and you own it`,
    } : null,
    
    // 6. Trend direction
    (enhanced?.trendDirection || 0) !== 0 ? (() => {
      const td = enhanced.trendDirection;
      if (td > 30) return { icon: '🚀', text: `Usage surged <span class="fact-number">${td}%</span> in the last 6 months — you're accelerating` };
      if (td < -30) return { icon: '🧘', text: `Usage dipped <span class="fact-number">${Math.abs(td)}%</span> recently — slowing down or found your groove?` };
      return null;
    })() : null,
    
    // 7. Longest conversation
    stats.longestConvo?.count > 10 ? {
      icon: '🏔️',
      text: `Your longest conversation hit <span class="fact-number">${stats.longestConvo.count}</span> messages: "${(stats.longestConvo.title || 'Untitled').slice(0, 30)}${(stats.longestConvo.title || '').length > 30 ? '...' : ''}"`,
    } : null,
    
    // 8. ChatGPT age (how long they've been using it)
    stats.firstDate ? (() => {
      const start = new Date(stats.firstDate);
      const now = new Date();
      const months = Math.round((now - start) / (1000 * 60 * 60 * 24 * 30));
      if (months > 6) return { icon: '📜', text: `You've been chatting with AI for <span class="fact-number">${months}</span> months — that's a real relationship` };
      return null;
    })() : null,
  ].filter(Boolean);
  
  // Build facts array - prefer AI-generated funFacts, fall back to unique computed facts
  let facts = [];
  
  if (aiFunFacts.length > 0) {
    // Use AI-generated facts with appropriate icons
    const icons = ['✨', '🔮', '🌟', '💫', '🎭', '🌌'];
    facts = aiFunFacts.slice(0, 6).map((fact, i) => ({
      icon: icons[i % icons.length],
      text: fact,
    }));
  } else if (uniqueFallbackFacts.length > 0) {
    facts = uniqueFallbackFacts.slice(0, 6);
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

