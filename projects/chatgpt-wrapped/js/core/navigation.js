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
    // Messages slide - trigger animations
    setTimeout(() => animateMessagesSlide(), 300);
  } else if (n === 2) {
    // Topics slide - trigger animations
    setTimeout(() => animateTopicsSlide(), 300);
  } else if (n === 4) {
    // Obsession slide (slide-05 file, index 4) - trigger typewriter
    setTimeout(() => animateObsessionSlide(), 300);
  } else if (n === 5) {
    // Time slide (slide-07 file, index 5) - trigger animations
    setTimeout(() => animateTimeSlide(), 300);
  } else if (n === 9) {
    // Cosmic Revelations slide (slide-13 file, index 9) - trigger card flip animations
    setTimeout(() => animateCosmicRevelations(), 300);
  } else if (n === 7) {
    // Themes slide (slide-09 file, index 7) - trigger animations
    setTimeout(() => animateThemesSlide(), 300);
  } else if (n === 8) {
    // Gallery slide (slide-10 file, index 8) - trigger animations
    setTimeout(() => animateGallerySlide(), 300);
  } else if (n === 10) {
    // Heatmap slide (slide-14 file, index 10) - trigger animations
    setTimeout(() => animateHeatmapSlide(), 300);
  } else if (n === 11) {
    // Verdict slide (slide-15 file, index 11) - trigger animations
    setTimeout(() => animateVerdictSlide(), 300);
  } else if (n === 12) {
    // Achievements slide (slide-16 file, index 12) - trigger animations
    setTimeout(() => animateAchievementsSlide(), 300);
  } else if (n === 13) {
    // Word Bubbles slide (slide-17 file, index 13) - trigger animations
    setTimeout(() => animateWordBubblesSlide(), 300);
  } else if (n === 14) {
    // Share slide (slide-18 file, index 14) - trigger animations
    setTimeout(() => animateShareSlide(), 300);
  }
  
  // Trigger floating bubbles on theme slides (Discovered Themes)
  // Clear bubbles when leaving theme slides
  if (n === 7 && discoveredThemes.length > 0) { // Slide index 7 (0-indexed) = Discovered Themes
    // Get all theme keys from the data
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

