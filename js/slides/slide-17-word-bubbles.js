// ============================================
// Slide 17: Word Frequency Bubbles - Your Vocabulary Universe
// ============================================
// Dependencies: utils.js (animateCountUp)
// DOM elements: wordBubblesContainer, vocabHeroWord, vocabHeroCount, vocabTotalWords,
//               vocabAvgLength, vocabParticles

// Note: wordBubblesSlideAnimated, storedTopWords are defined in app.js

/**
 * Render word frequency bubbles
 */
function renderWordBubbles(topWords) {
  const container = document.getElementById('wordBubblesContainer');
  if (!container || !topWords || topWords.length === 0) {
    console.log('Word bubbles: no data or container');
    return;
  }
  
  // Store for animation
  storedTopWords = topWords;
  
  // Populate hero word (the #1)
  const heroWord = topWords[0];
  const heroWordEl = document.getElementById('vocabHeroWord');
  const heroCountEl = document.getElementById('vocabHeroCount');
  
  if (heroWordEl && heroWord) {
    const displayWord = heroWord.word.replace(/[^a-zA-Z0-9-]/g, '');
    heroWordEl.textContent = displayWord;
  }
  if (heroCountEl && heroWord) {
    heroCountEl.dataset.target = heroWord.count;
  }
  
  // Calculate stats
  const totalWords = topWords.length;
  const avgLength = topWords.reduce((acc, w) => acc + w.word.length, 0) / totalWords;
  
  const totalWordsEl = document.getElementById('vocabTotalWords');
  const avgLengthEl = document.getElementById('vocabAvgLength');
  
  if (totalWordsEl) totalWordsEl.dataset.target = totalWords;
  if (avgLengthEl) avgLengthEl.dataset.target = Math.round(avgLength);
  
  // Generate background particles
  const particlesContainer = document.getElementById('vocabParticles');
  if (particlesContainer) {
    particlesContainer.innerHTML = Array(20).fill(0).map((_, i) => `
      <div class="vocab-particle" style="
        left: ${Math.random() * 100}%;
        animation-delay: ${Math.random() * 15}s;
        opacity: ${0.2 + Math.random() * 0.4};
      "></div>
    `).join('');
  }
  
  // Take top 11 words (excluding hero) for bubble display
  const bubbleWords = topWords.slice(1, 12);
  const maxCount = bubbleWords[0]?.count || 1;
  
  // Base positions - spread across the container (hero is separate now)
  const basePositions = [
    { x: 15, y: 30 },   // #2 - Left upper
    { x: 85, y: 35 },   // #3 - Right upper
    { x: 10, y: 60 },   // #4 - Far left lower
    { x: 90, y: 58 },   // #5 - Far right lower
    { x: 35, y: 22 },   // #6 - Left upper mid
    { x: 68, y: 25 },   // #7 - Right upper mid
    { x: 25, y: 75 },   // #8 - Left lower
    { x: 75, y: 72 },   // #9 - Right lower
    { x: 50, y: 18 },   // #10 - Top center
    { x: 50, y: 80 },   // #11 - Bottom center
    { x: 55, y: 50 },   // #12 - Center
  ];
  
  // Randomize positions slightly for organic feel
  const randomOffset = () => (Math.random() - 0.5) * 6;
  
  container.innerHTML = bubbleWords.map((word, i) => {
    const basePos = basePositions[i] || { x: 50, y: 50 };
    const pos = {
      x: Math.max(12, Math.min(88, basePos.x + randomOffset())),
      y: Math.max(15, Math.min(85, basePos.y + randomOffset()))
    };
    const intensity = word.count / maxCount;
    
    // Size class based on actual count intensity
    let sizeClass = 'size-sm';
    if (intensity > 0.6) sizeClass = 'size-lg';
    else if (intensity > 0.25) sizeClass = 'size-md';
    
    // Randomize animation start delay for more organic staggering
    const baseDelay = i * 0.08;
    const randomDelay = baseDelay + (Math.random() * 0.2);
    
    // Clean up word display (remove trailing punctuation)
    const displayWord = word.word.replace(/[^a-zA-Z0-9-]/g, '');
    
    return `
      <div class="word-bubble ${sizeClass}" 
           style="left: ${pos.x.toFixed(1)}%; top: ${pos.y.toFixed(1)}%; --delay: ${randomDelay.toFixed(2)}s; opacity: 0; transform: translate(-50%, -50%) scale(0);"
           title="${displayWord}: ${word.count.toLocaleString()} uses">
        ${displayWord}
        <span class="word-bubble-count">${word.count >= 1000 ? (word.count/1000).toFixed(1) + 'k' : word.count}</span>
      </div>
    `;
  }).join('');
}

/**
 * Animate word bubbles slide when it becomes visible
 */
function animateWordBubblesSlide() {
  if (wordBubblesSlideAnimated) return;
  wordBubblesSlideAnimated = true;
  
  // Animate headline
  const headline = document.querySelector('.vocab-headline');
  if (headline) headline.classList.add('animate-in');
  
  // Animate subtitle with delay
  setTimeout(() => {
    const subtitle = document.querySelector('.vocab-subtitle');
    if (subtitle) subtitle.classList.add('animate-in');
  }, 150);
  
  // Animate hero card
  setTimeout(() => {
    const hero = document.querySelector('.vocab-hero');
    if (hero) hero.classList.add('animate-in');
    
    // Count up hero number
    const heroCountEl = document.getElementById('vocabHeroCount');
    if (heroCountEl) {
      const target = parseInt(heroCountEl.dataset.target) || 0;
      animateCountUp(heroCountEl, target, 1500);
    }
  }, 300);
  
  // Animate bubbles wrapper
  setTimeout(() => {
    const wrapper = document.querySelector('.word-bubbles-wrapper');
    if (wrapper) wrapper.classList.add('animate-in');
    
    // Animate individual bubbles with stagger
    const bubbles = document.querySelectorAll('.word-bubble');
    bubbles.forEach((bubble, i) => {
      setTimeout(() => {
        bubble.classList.add('animate-in');
      }, i * 80);
    });
  }, 500);
  
  // Animate stats
  setTimeout(() => {
    const stats = document.querySelector('.vocab-stats');
    if (stats) stats.classList.add('animate-in');
    
    // Count up stats
    const totalWordsEl = document.getElementById('vocabTotalWords');
    const avgLengthEl = document.getElementById('vocabAvgLength');
    
    if (totalWordsEl) {
      const target = parseInt(totalWordsEl.dataset.target) || 0;
      animateCountUp(totalWordsEl, target, 1200);
    }
    if (avgLengthEl) {
      const target = parseInt(avgLengthEl.dataset.target) || 0;
      animateCountUp(avgLengthEl, target, 1200);
    }
  }, 800);
  
  // Animate hint
  setTimeout(() => {
    const hint = document.querySelector('.vocab-hint');
    if (hint) hint.classList.add('animate-in');
  }, 1000);
}

// Make slide functions globally available
window.renderWordBubbles = renderWordBubbles;
window.animateWordBubblesSlide = animateWordBubblesSlide;

