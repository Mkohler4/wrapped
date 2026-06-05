// ============================================
// Slide 18: Share - Journey Complete
// ============================================
// Dependencies: utils.js (animateCountUp)
// DOM elements: shareSparklesBg, shareConvos, shareMessages

// Note: shareSlideAnimated is defined in app.js

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

// Make slide functions globally available
window.generateShareSparkles = generateShareSparkles;
window.populateShareSlide = populateShareSlide;
window.animateShareSlide = animateShareSlide;

