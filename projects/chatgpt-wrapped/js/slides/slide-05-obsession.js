// ============================================
// Slide 5: Obsession - Your #1 Topic Exposed
// ============================================
// Dependencies: state.js (obsessionSlideData, obsessionSlideAnimated, aiInsights)
// DOM elements: obsessionTopic, obsessionIcon, obsessionCount, obsessionPercent,
//               obsessionRoast, obsessionBarFill, obsessionBarLabel, 
//               comparisonText, obsessionContext

/**
 * Populate the Obsession slide with top topic and AI-generated roast
 * @param {Object} stats - Stats object with topics array
 * @param {Object} aiInsights - AI insights with topObsession data
 */
function populateRoastChamber(stats, aiInsights) {
  // Topic icons mapping
  const topicIcons = {
    'coding': '💻', 'code': '💻', 'programming': '💻',
    'writing': '✍️', 'creative': '✍️',
    'research': '🔬', 'learning': '📚',
    'planning': '📋', 'productivity': '📋',
    'business': '💼', 'work': '💼',
    'health': '🏥', 'fitness': '💪',
    'music': '🎵', 'art': '🎨',
    'travel': '✈️', 'food': '🍕',
    'games': '🎮', 'gaming': '🎮',
    'finance': '💰', 'money': '💰',
    'relationships': '❤️', 'personal': '🧘',
    'ai': '🤖', 'technology': '⚙️',
    'default': '🎯'
  };
  
  // Get DOM elements
  const topicEl = document.getElementById('obsessionTopic');
  const iconEl = document.getElementById('obsessionIcon');
  const countEl = document.getElementById('obsessionCount');
  const percentEl = document.getElementById('obsessionPercent');
  const roastEl = document.getElementById('obsessionRoast');
  const barFill = document.getElementById('obsessionBarFill');
  const barLabel = document.getElementById('obsessionBarLabel');
  const comparisonEl = document.getElementById('comparisonText');
  const contextEl = document.getElementById('obsessionContext');
  
  // Check if we have the required AI insights
  if (!aiInsights?.topObsession) {
    if (topicEl) topicEl.textContent = 'Unknown';
    if (iconEl) iconEl.textContent = '❓';
    if (roastEl) roastEl.textContent = 'Couldn\'t load your obsession data. Try refreshing!';
    return;
  }
  
  const obsession = aiInsights.topObsession;
  const topTopic = stats.topics?.[0];
  const topicName = obsession.topic || topTopic?.[0] || 'unknown';
  const topicCount = topTopic?.[1] || 0;
  const totalConvos = stats.totalConversations || 1;
  const percentage = Math.round((topicCount / totalConvos) * 100);
  
  // Find matching icon
  const topicLower = topicName.toLowerCase();
  const icon = Object.entries(topicIcons).find(([k]) => topicLower.includes(k))?.[1] || topicIcons.default;
  
  // Update DOM (static elements only - no animations yet)
  if (topicEl) topicEl.textContent = topicName;
  if (iconEl) iconEl.textContent = icon;
  if (countEl) countEl.textContent = topicCount.toLocaleString();
  if (percentEl) percentEl.textContent = `${percentage}%`;
  
  // Start with empty roast, will typewriter in when slide visible
  if (roastEl) roastEl.innerHTML = '<span class="roast-cursor"></span>';
  
  // Set bar label based on focus level (static)
  if (barLabel) {
    if (percentage > 25) {
      barLabel.textContent = 'Deeply focused';
    } else if (percentage > 15) {
      barLabel.textContent = 'Highly focused';
    } else if (percentage > 8) {
      barLabel.textContent = 'Focused';
    } else {
      barLabel.textContent = 'One of many interests';
    }
  }
  
  // Context line (will fade in after typewriter)
  const avgPerMonth = Math.round(topicCount / 12);
  let contextText = '';
  if (avgPerMonth > 20) {
    contextText = `About ${avgPerMonth} conversations per month on this topic alone.`;
  } else if (topicCount > 50) {
    contextText = `${topicCount} deep dives and counting.`;
  } else {
    contextText = `A clear pattern in your conversations.`;
  }
  if (comparisonEl) comparisonEl.textContent = contextText;
  
  // Store data for animation when slide becomes visible
  obsessionSlideData = {
    roastText: obsession.roast,
    fillAmount: Math.min(100, percentage * 2)
  };
}

/**
 * Trigger obsession slide animations (called when slide becomes visible)
 */
function animateObsessionSlide() {
  if (!obsessionSlideData || obsessionSlideAnimated) return;
  obsessionSlideAnimated = true;
  
  const { roastText, fillAmount } = obsessionSlideData;
  const roastEl = document.getElementById('obsessionRoast');
  const barFill = document.getElementById('obsessionBarFill');
  const contextEl = document.getElementById('obsessionContext');
  
  // Animate the bar fill
  setTimeout(() => {
    if (barFill) {
      barFill.style.width = `${fillAmount}%`;
    }
  }, 400);
  
  // Typewriter effect for roast - starts after bar animation
  setTimeout(() => {
    typewriterEffect(roastEl, roastText, 30, () => {
      // Fade in context after typewriter completes
      if (contextEl) contextEl.classList.add('visible');
    });
  }, 800);
}

/**
 * Typewriter effect for text
 * @param {HTMLElement} element - Element to type into
 * @param {string} text - Text to type
 * @param {number} speed - Milliseconds per character
 * @param {function} onComplete - Callback when done
 */
function typewriterEffect(element, text, speed = 30, onComplete) {
  if (!element || !text) return;
  
  let i = 0;
  element.innerHTML = '<span class="roast-cursor"></span>';
  
  function type() {
    if (i < text.length) {
      // Insert character before cursor
      const cursor = element.querySelector('.roast-cursor');
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
        const cursor = element.querySelector('.roast-cursor');
        if (cursor) cursor.remove();
        if (onComplete) onComplete();
      }, 500);
    }
  }
  
  type();
}

// Make slide functions globally available
window.populateRoastChamber = populateRoastChamber;
window.animateObsessionSlide = animateObsessionSlide;
window.typewriterEffect = typewriterEffect;

