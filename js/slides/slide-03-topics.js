// ============================================
// Slide 3: Topics - What You Explored
// ============================================
// Dependencies: utils.js (animateCountUp), state.js (topicsSlideData, topicsSlideAnimated)
// DOM elements: topicHeroIcon, topicHeroName, topicHeroCount, topicsGrid, 
//               diversityFill, diversityInsight

/**
 * Populate the Topics slide with hero topic and grid cards
 * @param {Object} s - Stats object with topics array (sorted by count desc)
 */
function populateTopicsSlide(s) {
  if (!s.topics || s.topics.length === 0) return;
  
  // Use shared topic icon map from slide-05-obsession.js (loaded at runtime)
  const getIcon = (name) => (window.topicIcons && window.topicIcons[name]) || '📌';
  const getDisplayName = (name) => (typeof window.formatTopicName === 'function') ? window.formatTopicName(name) : name;
  
  const [heroName, heroCount] = s.topics[0];
  const maxCount = heroCount || 1;
  
  // Set hero topic
  const heroIcon = document.getElementById('topicHeroIcon');
  const heroNameEl = document.getElementById('topicHeroName');
  const heroCountEl = document.getElementById('topicHeroCount');
  
  if (heroIcon) heroIcon.textContent = getIcon(heroName);
  if (heroNameEl) heroNameEl.textContent = getDisplayName(heroName);
  if (heroCountEl) heroCountEl.dataset.target = heroCount;
  
  // Generate remaining topics as cards
  const topicsGrid = document.getElementById('topicsGrid');
  if (topicsGrid && s.topics.length > 1) {
    const restTopics = s.topics.slice(1, 5); // Show #2-5
    
    topicsGrid.innerHTML = restTopics.map(([name, count], i) => {
      const delay = 0.6 + (i * 0.15);
      const barPercent = (count / maxCount) * 100;
      
      return `
        <div class="topic-card" style="animation-delay: ${delay}s" data-bar-width="${barPercent}">
          <div class="topic-card-rank">#${i + 2}</div>
          <div class="topic-card-icon">${getIcon(name)}</div>
          <div class="topic-card-info">
            <div class="topic-card-name">${getDisplayName(name)}</div>
            <div class="topic-card-count">${count.toLocaleString()} convos</div>
          </div>
          <div class="topic-card-bar">
            <div class="topic-card-bar-fill" id="topicBar${i}"></div>
          </div>
        </div>
      `;
    }).join('');
  }
  
  // Store data for animation on slide reveal
  topicsSlideData = {
    heroCount,
    topics: s.topics,
    totalTopics: s.topics.length
  };
}

/**
 * Trigger topics slide animations (called when slide becomes visible)
 */
function animateTopicsSlide() {
  if (!topicsSlideData || topicsSlideAnimated) return;
  topicsSlideAnimated = true;
  
  const { heroCount, topics, totalTopics } = topicsSlideData;
  
  // Animate hero count
  const heroCountEl = document.getElementById('topicHeroCount');
  if (heroCountEl) {
    animateCountUp(heroCountEl, heroCount, 1500);
  }
  
  // Animate topic card bars
  setTimeout(() => {
    document.querySelectorAll('.topic-card').forEach((card, i) => {
      const barWidth = card.dataset.barWidth;
      const bar = document.getElementById(`topicBar${i}`);
      if (bar) {
        bar.style.width = `${barWidth}%`;
      }
    });
  }, 800);
  
  // Animate diversity meter
  setTimeout(() => {
    const diversityFill = document.getElementById('diversityFill');
    const diversityInsight = document.getElementById('diversityInsight');
    
    if (diversityFill && topics.length > 0) {
      // Calculate diversity based on distribution
      const counts = topics.map(t => t[1]);
      const total = counts.reduce((a, b) => a + b, 0);
      const topShare = counts[0] / total;
      
      // If top topic > 60% of total = focused, < 30% = explorer
      const topNameRaw = topics[0]?.[0] || 'your top topic';
      const topName = (typeof window.formatTopicName === 'function') ? window.formatTopicName(topNameRaw) : topNameRaw;
      const topPct = Math.round(topShare * 100);
      let diversityPercent, insight;
      if (topShare > 0.5) {
        diversityPercent = 15;
        insight = `${topPct}% focused on ${topName} — deep specialist`;
      } else if (topShare > 0.35) {
        diversityPercent = 40;
        insight = `${topPct}% in ${topName}, plus ${topics.length - 1} other interests`;
      } else if (topShare > 0.25) {
        diversityPercent = 65;
        insight = `${topPct}% in ${topName} — spread across ${topics.length} areas`;
      } else {
        diversityPercent = 85;
        insight = `Only ${topPct}% in ${topName} — ${topics.length} topics, no clear favorite`;
      }
      
      diversityFill.style.left = `calc(${diversityPercent}% - 8px)`;
      if (diversityInsight) diversityInsight.textContent = insight;
    }
  }, 1200);
}

// Make slide functions globally available
window.populateTopicsSlide = populateTopicsSlide;
window.animateTopicsSlide = animateTopicsSlide;

