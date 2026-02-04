// ============================================
// Slide 15: Verdict - The Roast + Compliment
// ============================================
// Dependencies: utils.js (animateCountUp)
// DOM elements: verdictBg, verdictRoastCard, verdictComplimentCard, roastHeadline, complimentHeadline,
//               finalRoast, finalCompliment, roastConfidence, roastConfidenceFill, complimentConfidence,
//               complimentConfidenceFill, roastMsgCount

// Note: verdictSlideData, verdictSlideAnimated are defined in app.js

/**
 * Generate floating background icons for verdict slide
 */
function generateVerdictBackground() {
  const container = document.getElementById('verdictBg');
  if (!container || container.children.length > 0) return;
  
  const icons = ['🔥', '✨', '💬', '⚡', '🎯', '💡'];
  for (let i = 0; i < 12; i++) {
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

// Make slide functions globally available
window.generateVerdictBackground = generateVerdictBackground;
window.populateVerdictSlide = populateVerdictSlide;
window.animateVerdictSlide = animateVerdictSlide;
window.verdictTypewriter = verdictTypewriter;

