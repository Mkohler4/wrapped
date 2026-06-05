// ============================================
// ChatGPT Wrapped - Navigation & Screens
// ============================================

function showSlide(n) {
  currentSlide = n;
  
  document.querySelectorAll('.slide').forEach((s, i) => {
    s.classList.toggle('active', i === n);
  });
  
  document.querySelectorAll('.dot').forEach((d, i) => {
    d.classList.toggle('active', i === n);
  });

  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  if (prevBtn) prevBtn.style.visibility = n === 0 ? 'hidden' : 'visible';
  if (nextBtn) nextBtn.textContent = n === totalSlides - 1 ? 'Done ✓' : 'Next →';
  
  // Trigger slide-specific animations
  if (n === 1) {
    setTimeout(() => animateMessagesSlide(), 300);
  } else if (n === 2) {
    setTimeout(() => animateTopicsSlide(), 300);
  } else if (n === 4) {
    setTimeout(() => animateObsessionSlide(), 300);
  } else if (n === 5) {
    setTimeout(() => animateTimeSlide(), 300);
  } else if (n === 9) {
    setTimeout(() => animateCosmicRevelations(), 300);
  } else if (n === 7) {
    setTimeout(() => animateThemesSlide(), 300);
  } else if (n === 8) {
    setTimeout(() => animateGallerySlide(), 300);
  } else if (n === 10) {
    setTimeout(() => animateHeatmapSlide(), 300);
  } else if (n === 11) {
    setTimeout(() => animateVerdictSlide(), 300);
  } else if (n === 12) {
    setTimeout(() => animateAchievementsSlide(), 300);
  } else if (n === 13) {
    setTimeout(() => animateWordBubblesSlide(), 300);
  } else if (n === 14) {
    setTimeout(() => animateShareSlide(), 300);
  }
  
  // Trigger floating bubbles on theme slides (Discovered Themes)
  if (n === 7 && discoveredThemes.length > 0) {
    const themeKeyMap = {
      'Business & Entrepreneurship': 'business',
      'AI Image Generation': 'images', 
      'Career & Growth': 'career',
      'Learning & Education': 'learning',
      'Creative Writing': 'writing',
      'Technical Architecture': 'architecture',
      'Personal Life': 'personal',
      'Productivity & Organization': 'productivity',
    };
    const themeKeys = discoveredThemes.map(t => 
      themeKeyMap[t.name] || t.name.toLowerCase().split(' ')[0]
    );
    console.log('Spawning floating bubbles for themes:', themeKeys);
    if (themeKeys.length > 0) {
      spawnFloatingBubbles(themeKeys, document.getElementById('slide9'));
    }
  } else {
    clearFloatingBubbles();
  }

  if (typeof window.focusDebugSection === 'function') {
    const sectionMap = {
      0: 'raw',
      1: 'raw',
      2: 'topics',
      3: 'insights',
      4: 'insights',
      5: 'raw',
      7: 'insights',
      8: 'images',
      9: 'insights',
      10: 'achievements-sources',
      11: 'insights',
      12: 'achievements-results',
      13: 'raw',
      14: 'raw'
    };
    const sectionKey = sectionMap[n];
    if (sectionKey) {
      window.focusDebugSection(sectionKey);
    }
  }
}

function nextSlide() {
  if (currentSlide < totalSlides - 1) {
    showSlide(currentSlide + 1);
  }
}

function prevSlide() {
  if (currentSlide > 0) {
    showSlide(currentSlide - 1);
  }
}

// ============================================
// SCREENS
// ============================================
function showScreen(name) {
  const uploadScreen = document.getElementById('uploadScreen');
  const processingScreen = document.getElementById('processingScreen');
  const wrappedScreen = document.getElementById('wrappedScreen');
  
  if (uploadScreen) uploadScreen.style.display = name === 'upload' ? 'flex' : 'none';
  if (processingScreen) processingScreen.style.display = name === 'processing' ? 'flex' : 'none';
  if (wrappedScreen) wrappedScreen.style.display = name === 'wrapped' ? 'block' : 'none';
}

function updateProgress(pct, label) {
  const progressFill = document.getElementById('progressFill');
  const progressLabel = document.getElementById('progressLabel');
  if (progressFill) progressFill.style.width = pct + '%';
  if (progressLabel) progressLabel.textContent = label;
}

function restart() {
  currentSlide = 0;
  
  // Reset all slide animation flags
  messagesSlideAnimated = false;
  topicsSlideAnimated = false;
  timeSlideAnimated = false;
  themesSlideAnimated = false;
  obsessionSlideAnimated = false;
  cosmicRevelationsAnimated = false;
  gallerySlideAnimated = false;
  heatmapSlideAnimated = false;
  verdictSlideAnimated = false;
  achievementsSlideAnimated = false;
  wordBubblesSlideAnimated = false;
  shareSlideAnimated = false;
  
  showSlide(0);
  showScreen('upload');
}

// ============================================
// SHARE FUNCTIONS
// ============================================
function shareTwitter() {
  const text = `I had ${stats?.totalConversations || 0} conversations with ChatGPT! #ChatGPTWrapped`;
  window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
}

function downloadImage() {
  alert('Image download coming soon!');
}

// Make navigation functions globally available for onclick handlers
window.nextSlide = nextSlide;
window.prevSlide = prevSlide;
window.restart = restart;
window.shareTwitter = shareTwitter;
window.downloadImage = downloadImage;
