// ============================================
// Slide 1: Conversations - Opening Impact
// ============================================
// Dependencies: utils.js (animateCountUp)
// DOM elements: totalConvos, convoPerDay, convoPerWeek, convoBarMax, convoBarFill, convoBubblesBg

/**
 * Populate the Conversations slide with stats and trigger animations
 * @param {Object} s - Stats object with totalConversations, firstDate, lastDate
 */
function populateConversationsSlide(s) {
  const totalConvos = s.totalConversations;
  const totalConvosEl = document.getElementById('totalConvos');
  
  if (!totalConvosEl) return;
  
  // Set data target for count-up
  totalConvosEl.dataset.target = totalConvos;
  
  // Calculate contextual stats
  const firstDate = s.firstDate ? new Date(s.firstDate) : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
  const lastDate = s.lastDate ? new Date(s.lastDate) : new Date();
  const daysDiff = Math.max(1, Math.ceil((lastDate - firstDate) / (1000 * 60 * 60 * 24)));
  
  const perDay = (totalConvos / daysDiff).toFixed(1);
  const perWeek = Math.round(totalConvos / (daysDiff / 7));
  
  const perDayEl = document.getElementById('convoPerDay');
  const perWeekEl = document.getElementById('convoPerWeek');
  if (perDayEl) perDayEl.textContent = perDay;
  if (perWeekEl) perWeekEl.textContent = perWeek;
  
  // Update bar max label
  const barMaxEl = document.getElementById('convoBarMax');
  const maxScale = Math.ceil(totalConvos / 100) * 100;
  if (barMaxEl) barMaxEl.textContent = maxScale.toLocaleString();
  
  // Generate floating bubbles
  generateConvoBubbles();
  
  // Trigger count-up animation when slide becomes visible
  // Initial count-up happens immediately since it's the first slide
  setTimeout(() => {
    animateCountUp(totalConvosEl, totalConvos, 2000);
    
    // Animate progress bar
    const barFill = document.getElementById('convoBarFill');
    if (barFill) {
      const fillPercent = Math.min(100, (totalConvos / maxScale) * 100);
      barFill.style.width = `${fillPercent}%`;
    }
  }, 500);
}

/**
 * Generate floating conversation bubbles for background effect
 */
function generateConvoBubbles() {
  const container = document.getElementById('convoBubblesBg');
  if (!container) return;
  
  container.innerHTML = '';
  const numBubbles = 12;
  
  for (let i = 0; i < numBubbles; i++) {
    const bubble = document.createElement('div');
    bubble.className = 'convo-bubble';
    
    // Random position and timing
    const left = Math.random() * 90 + 5; // 5% to 95%
    const delay = Math.random() * 15; // 0-15s delay
    const duration = 15 + Math.random() * 10; // 15-25s duration
    
    bubble.style.left = `${left}%`;
    bubble.style.animationDelay = `${delay}s`;
    bubble.style.animationDuration = `${duration}s`;
    
    container.appendChild(bubble);
  }
}

