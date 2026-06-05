// ============================================
// Slide 5: Obsession - Your #1 Topic Exposed
// ============================================
// Dependencies: state.js (obsessionSlideData, obsessionSlideAnimated, aiInsights)
// DOM elements: obsessionTopic, obsessionIcon, obsessionCount, obsessionPercent,
//               obsessionRoast, obsessionBarFill, obsessionBarLabel, 
//               comparisonText, obsessionContext

// ---- Topic display names ----
// Maps classifier keys (e.g. 'web-dev') to human-readable display names.
const topicDisplayNames = {
  'coding': 'Coding',
  'web-dev': 'Web Development',
  'mobile-dev': 'Mobile Development',
  'data-analytics': 'Data & Analytics',
  'ai-ml': 'AI & Machine Learning',
  'devops': 'DevOps',
  'cloud': 'Cloud Computing',
  'security': 'Security',
  'database': 'Databases',
  'testing-qa': 'Testing & QA',
  'performance': 'Performance',
  'architecture': 'Architecture',
  'ux-ui': 'UX & UI Design',
  'product': 'Product',
  'business': 'Business',
  'marketing': 'Marketing',
  'sales': 'Sales',
  'customer-support': 'Customer Support',
  'finance': 'Finance',
  'crypto': 'Crypto & Web3',
  'legal': 'Legal',
  'hr-people': 'HR & People',
  'education': 'Education',
  'math': 'Mathematics',
  'science': 'Science',
  'physics': 'Physics',
  'chemistry': 'Chemistry',
  'biology': 'Biology',
  'astronomy': 'Astronomy',
  'history': 'History',
  'philosophy': 'Philosophy',
  'politics': 'Politics',
  'economics': 'Economics',
  'language-learning': 'Language Learning',
  'writing': 'Writing',
  'creative': 'Creative Writing',
  'design': 'Design',
  'music-audio': 'Music & Audio',
  'video-media': 'Video & Media',
  'photography': 'Photography',
  'gaming': 'Gaming',
  'hardware': 'Hardware',
  'iot': 'IoT',
  'robotics': 'Robotics',
  'travel': 'Travel',
  'food-cooking': 'Food & Cooking',
  'health-fitness': 'Health & Fitness',
  'mental-health': 'Mental Health',
  'relationships': 'Relationships',
  'productivity': 'Productivity',
  'planning': 'Planning',
  'learning': 'Learning',
  'general': 'General',
  'other': 'Other',
};

/**
 * Format a raw topic key into a human-readable display name.
 * Falls back to title-casing the key if not found in the map.
 */
function formatTopicName(topicKey) {
  if (!topicKey) return 'Unknown';
  if (topicDisplayNames[topicKey]) return topicDisplayNames[topicKey];
  // Fallback: title-case the hyphenated key (e.g. 'some-topic' → 'Some Topic')
  return topicKey.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ---- Topic icons (covers all ~50 classifier categories) ----
const topicIcons = {
  'coding': '💻',
  'web-dev': '🌐',
  'mobile-dev': '📱',
  'data-analytics': '📊',
  'ai-ml': '🤖',
  'devops': '🔧',
  'cloud': '☁️',
  'security': '🔒',
  'database': '🗄️',
  'testing-qa': '🧪',
  'performance': '⚡',
  'architecture': '🏗️',
  'ux-ui': '🎨',
  'product': '📦',
  'business': '💼',
  'marketing': '📣',
  'sales': '🤝',
  'customer-support': '🎧',
  'finance': '💰',
  'crypto': '🪙',
  'legal': '⚖️',
  'hr-people': '👥',
  'education': '🎓',
  'math': '🔢',
  'science': '🔬',
  'physics': '⚛️',
  'chemistry': '🧫',
  'biology': '🧬',
  'astronomy': '🔭',
  'history': '📜',
  'philosophy': '🤔',
  'politics': '🏛️',
  'economics': '📈',
  'language-learning': '🗣️',
  'writing': '✍️',
  'creative': '🖊️',
  'design': '🎨',
  'music-audio': '🎵',
  'video-media': '🎬',
  'photography': '📷',
  'gaming': '🎮',
  'hardware': '🖥️',
  'iot': '📡',
  'robotics': '🦾',
  'travel': '✈️',
  'food-cooking': '🍳',
  'health-fitness': '💪',
  'mental-health': '🧘',
  'relationships': '❤️',
  'productivity': '⏱️',
  'planning': '📋',
  'learning': '📚',
  'general': '🎯',
  'other': '🎯',
};

/**
 * Populate the Obsession slide with top topic and AI-generated roast
 * @param {Object} stats - Stats object with topics array
 * @param {Object} aiInsights - AI insights with topObsession data
 */
function populateRoastChamber(stats, aiInsights) {
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
  const totalConvos = stats.totalConversations || 1;

  // Determine the obsession topic + count, with defense-in-depth safeguard:
  // If the obsession topic is "general" or "other" (shouldn't happen if generateDataInsights
  // safeguard worked, but covers the server path too), fall back to stats.topics[1].
  let topicKey = obsession.topic;
  let topicCount = obsession.count || 0;

  if ((topicKey === 'general' || topicKey === 'other') && stats.topics && stats.topics.length > 1) {
    // Skip "general"/"other" — use the next meaningful topic
    for (let i = 1; i < stats.topics.length; i++) {
      const candidate = stats.topics[i][0];
      if (candidate !== 'general' && candidate !== 'other') {
        topicKey = candidate;
        topicCount = stats.topics[i][1];
        break;
      }
    }
  }

  // If obsession.count was 0 or missing, try to find the count from stats.topics
  if (!topicCount && stats.topics) {
    const match = stats.topics.find(([t]) => t === topicKey);
    if (match) topicCount = match[1];
  }

  const displayName = formatTopicName(topicKey);
  const percentage = Math.round((topicCount / totalConvos) * 100);
  
  // Find matching icon by exact key, then by substring match, then default
  const icon = topicIcons[topicKey] || topicIcons['general'];
  
  // Update DOM (static elements only - no animations yet)
  if (topicEl) topicEl.textContent = displayName;
  if (iconEl) iconEl.textContent = icon;
  if (countEl) countEl.textContent = topicCount.toLocaleString();
  if (percentEl) percentEl.textContent = `${percentage}%`;
  
  // Start with empty roast, will typewriter in when slide visible
  if (roastEl) roastEl.innerHTML = '<span class="roast-cursor"></span>';
  
  // Set bar label based on focus level — always reference actual percentage
  if (barLabel) {
    if (percentage > 25) {
      barLabel.textContent = `${percentage}% — deep focus`;
    } else if (percentage > 15) {
      barLabel.textContent = `${percentage}% — strong focus`;
    } else if (percentage > 8) {
      barLabel.textContent = `${percentage}% — notable interest`;
    } else {
      barLabel.textContent = `${percentage}% — one of many`;
    }
  }
  
  // Context line (will fade in after typewriter)
  const avgPerMonth = Math.round(topicCount / 12);
  let contextText = '';
  if (avgPerMonth > 20) {
    contextText = `About ${avgPerMonth} conversations per month on ${displayName} alone.`;
  } else if (topicCount > 50) {
    contextText = `${topicCount} deep dives into ${displayName} and counting.`;
  } else {
    contextText = `${topicCount} conversations about ${displayName} — ${percentage}% of your total.`;
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

// Make slide functions and shared topic utilities globally available
window.populateRoastChamber = populateRoastChamber;
window.animateObsessionSlide = animateObsessionSlide;
window.typewriterEffect = typewriterEffect;
window.formatTopicName = formatTopicName;
window.topicIcons = topicIcons;
window.topicDisplayNames = topicDisplayNames;

