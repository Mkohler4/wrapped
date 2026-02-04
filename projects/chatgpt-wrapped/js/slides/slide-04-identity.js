// ============================================
// Slide 4: DNA Identity - Behavioral Fingerprint
// ============================================
// Dependencies: state.js (aiInsights)
// DOM elements: dnaTitle, dnaSubtitle, dnaHeroValue, dnaHeroContext, 
//               animalImage, animalImageContainer, animalName, animalReason,
//               nightOwlValue, marathonValue, quickChatsValue, peakDayValue,
//               radarPolygon, radarPolygonGlow, radarPoints

/**
 * Populate the DNA Identity slide with behavioral fingerprint visualization
 * @param {Object} stats - Stats object with enhanced behavioral data
 * @param {Object} aiInsights - AI-generated insights (personality, spiritAnimal)
 */
function populateDNAIdentity(stats, aiInsights) {
  // Animal emoji lookup for spirit animal
  const animalEmojis = {
    'owl': '🦉', 'fox': '🦊', 'cat': '🐱', 'dog': '🐕', 'wolf': '🐺',
    'eagle': '🦅', 'dolphin': '🐬', 'octopus': '🐙', 'bee': '🐝', 'ant': '🐜',
    'raccoon': '🦝', 'monkey': '🐵', 'robot': '🤖', 'unicorn': '🦄',
    'bear': '🐻', 'lion': '🦁', 'tiger': '🐯', 'panda': '🐼', 'koala': '🐨',
    'sloth': '🦥', 'otter': '🦦', 'beaver': '🦫', 'hedgehog': '🦔', 'bat': '🦇',
    'crow': '🐦‍⬛', 'raven': '🐦‍⬛', 'parrot': '🦜', 'penguin': '🐧', 'flamingo': '🦩',
    'shark': '🦈', 'whale': '🐋', 'squid': '🦑', 'crab': '🦀', 'turtle': '🐢',
    'snake': '🐍', 'lizard': '🦎', 'dragon': '🐉', 'phoenix': '🔥',
    'butterfly': '🦋', 'spider': '🕷️', 'scorpion': '🦂'
  };
  
  // Extract behavioral data from stats (real data, no fallbacks)
  const enhanced = stats.enhanced || {};
  const nightOwlScore = enhanced.nightOwlScore || 0;
  const weekendRatio = enhanced.weekendRatio || 0;
  const marathonCount = enhanced.marathonConvos || 0;
  const quickCount = enhanced.quickConvos || 0;
  const topicCount = stats.topics?.length || 0;
  const peakDay = enhanced.mostProductiveDay || stats.peakDay || 'N/A';
  
  // Calculate "Deep Diver" score based on marathon sessions ratio
  const totalConvos = stats.totalConversations || 1;
  const deepDiverScore = Math.min(100, Math.round((marathonCount / totalConvos) * 500));
  
  // Calculate "Explorer" score based on topic diversity
  const explorerScore = Math.min(100, topicCount * 10);
  
  // Calculate "Consistency" score based on spread of activity
  const consistencyScore = Math.min(100, 100 - Math.abs(50 - weekendRatio));
  
  // Radar chart values (0-100 scale, mapped to 0-80 radius)
  const radarValues = {
    top: nightOwlScore,           // Night Owl
    right: deepDiverScore,        // Deep Diver
    bottom: consistencyScore,     // Consistent
    left: explorerScore           // Explorer
  };
  
  // Draw radar polygon
  drawRadarChart(radarValues);
  
  // Update personality title from AI insights (required)
  const titleEl = document.getElementById('dnaTitle');
  const subtitleEl = document.getElementById('dnaSubtitle');
  
  if (titleEl && aiInsights?.personality?.title) {
    titleEl.textContent = aiInsights.personality.title;
  }
  if (subtitleEl) {
    subtitleEl.textContent = 'Your unique AI fingerprint';
  }
  
  // Hero stat - pick the most interesting behavioral stat
  const heroValueEl = document.getElementById('dnaHeroValue');
  const heroContextEl = document.getElementById('dnaHeroContext');
  
  if (heroValueEl && heroContextEl) {
    if (nightOwlScore >= 20) {
      heroValueEl.textContent = `${nightOwlScore}%`;
      heroContextEl.textContent = 'of your messages sent between 10 PM and 4 AM';
    } else if (marathonCount > 10) {
      heroValueEl.textContent = marathonCount;
      heroContextEl.textContent = 'marathon sessions (50+ messages each)';
    } else if (weekendRatio > 70) {
      heroValueEl.textContent = `${weekendRatio}%`;
      heroContextEl.textContent = 'weekend warrior ratio vs weekdays';
    } else {
      heroValueEl.textContent = `${topicCount}`;
      heroContextEl.textContent = 'different topics explored with ChatGPT';
    }
  }
  
  // Spirit animal from AI insights (required)
  const animalImageEl = document.getElementById('animalImage');
  const animalImageContainer = document.getElementById('animalImageContainer');
  const animalNameEl = document.getElementById('animalName');
  const animalReasonEl = document.getElementById('animalReason');
  
  if (aiInsights?.spiritAnimal) {
    const animalLower = aiInsights.spiritAnimal.animal.toLowerCase();
    const emoji = Object.entries(animalEmojis).find(([k]) => animalLower.includes(k))?.[1] || '🦉';
    
    // Use emoji as fallback for image
    if (animalImageContainer) {
      animalImageContainer.innerHTML = `<span class="animal-emoji">${emoji}</span>`;
    }
    if (animalNameEl) animalNameEl.textContent = aiInsights.spiritAnimal.animal;
    if (animalReasonEl) animalReasonEl.textContent = aiInsights.spiritAnimal.reason;
  }
  
  // Bottom metrics (real data)
  const nightOwlValueEl = document.getElementById('nightOwlValue');
  const marathonValueEl = document.getElementById('marathonValue');
  const quickChatsValueEl = document.getElementById('quickChatsValue');
  const peakDayValueEl = document.getElementById('peakDayValue');
  
  if (nightOwlValueEl) nightOwlValueEl.textContent = `${nightOwlScore}%`;
  if (marathonValueEl) marathonValueEl.textContent = marathonCount;
  if (quickChatsValueEl) quickChatsValueEl.textContent = quickCount;
  if (peakDayValueEl) peakDayValueEl.textContent = peakDay.slice(0, 3); // "Mon", "Tue", etc.
}

/**
 * Draw the radar/spider chart visualization with micro-animations
 * @param {Object} values - Object with top, right, bottom, left values (0-100)
 */
function drawRadarChart(values) {
  const radarPolygon = document.getElementById('radarPolygon');
  const radarPolygonGlow = document.getElementById('radarPolygonGlow');
  const radarPoints = document.getElementById('radarPoints');
  
  if (!radarPolygon) return;
  
  // Center of chart and max radius
  const cx = 100, cy = 100, maxR = 80;
  
  // Convert value (0-100) to radius
  const toRadius = (val) => (val / 100) * maxR;
  
  // Calculate polygon points (4 axes: top, right, bottom, left)
  const points = [
    { x: cx, y: cy - toRadius(values.top), label: 'Night Owl' },
    { x: cx + toRadius(values.right), y: cy, label: 'Deep Diver' },
    { x: cx, y: cy + toRadius(values.bottom), label: 'Consistent' },
    { x: cx - toRadius(values.left), y: cy, label: 'Explorer' }
  ];
  
  // Create polygon points string
  const pointsStr = points.map(p => `${p.x},${p.y}`).join(' ');
  
  // Start from center (collapsed state)
  radarPolygon.setAttribute('points', `${cx},${cy} ${cx},${cy} ${cx},${cy} ${cx},${cy}`);
  radarPolygonGlow.setAttribute('points', `${cx},${cy} ${cx},${cy} ${cx},${cy} ${cx},${cy}`);
  
  // Clear existing points
  if (radarPoints) {
    radarPoints.innerHTML = '';
  }
  
  // Animate polygon expansion after brief delay
  setTimeout(() => {
    radarPolygon.setAttribute('points', pointsStr);
    radarPolygonGlow.setAttribute('points', pointsStr);
    
    // Add data points with staggered entrance
    if (radarPoints) {
      points.forEach((p, i) => {
        setTimeout(() => {
          const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          circle.setAttribute('class', 'radar-point');
          circle.setAttribute('cx', cx);
          circle.setAttribute('cy', cy);
          circle.setAttribute('r', '0');
          radarPoints.appendChild(circle);
          
          // Animate to final position
          setTimeout(() => {
            circle.setAttribute('cx', p.x);
            circle.setAttribute('cy', p.y);
            circle.setAttribute('r', '5');
          }, 50);
        }, i * 150);
      });
    }
  }, 400);
}

// Make slide functions globally available
window.populateDNAIdentity = populateDNAIdentity;
window.drawRadarChart = drawRadarChart;

