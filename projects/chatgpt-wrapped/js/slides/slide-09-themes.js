// ============================================
// Slide 9: Discovered Themes - AI Semantic Clusters
// ============================================
// Dependencies: utils.js (animateCountUp), state.js (themesSlideData, themesSlideAnimated, discoveredThemes)
// DOM elements: themeHero, themeHeroIcon, themeHeroName, themeHeroCount,
//               themesCluster, themesOrbsBg, themesInsight

// Note: themeIcons is defined in app.js
// This module uses the global themeIcons constant

/**
 * Populate the Discovered Themes slide with AI semantic clusters
 * Requires discoveredThemes global array from data load
 */
function populateThemesSlide() {
  const themeHero = document.getElementById('themeHero');
  const themesCluster = document.getElementById('themesCluster');
  const orbsBg = document.getElementById('themesOrbsBg');
  
  // Generate background orbs
  if (orbsBg) {
    orbsBg.innerHTML = '';
    for (let i = 0; i < 4; i++) {
      const orb = document.createElement('div');
      orb.className = 'themes-orb';
      orbsBg.appendChild(orb);
    }
  }
  
  // Check for data
  if (!discoveredThemes || discoveredThemes.length === 0) {
    // Show no data message
    if (themeHero) themeHero.style.display = 'none';
    if (themesCluster) {
      themesCluster.innerHTML = `
        <div class="themes-no-data">
          <div class="themes-no-data-icon">🔍</div>
          <div class="themes-no-data-text">No semantic themes discovered yet</div>
        </div>
      `;
    }
    return;
  }
  
  // Theme key mapping for evidence modal
  const themeKeyMap = {
    'Business & Entrepreneurship': 'business',
    'AI Image Generation': 'images',
    'Career & Growth': 'career',
    'Learning & Education': 'learning',
    'Creative Writing': 'writing',
    'Technical Architecture': 'architecture',
    'Personal Life': 'personal',
    'Productivity & Organization': 'productivity',
    'Coding & Development': 'coding',
    'Data & Analytics': 'data',
    'Marketing & Content': 'marketing',
    'Finance & Investing': 'finance',
  };
  
  // Get hero theme (first/dominant)
  const heroTheme = discoveredThemes[0];
  const heroIcon = themeIcons[heroTheme.name] || themeIcons['default'];
  const heroKey = themeKeyMap[heroTheme.name] || heroTheme.name.toLowerCase().split(' ')[0];
  
  // Populate hero
  const heroIconEl = document.getElementById('themeHeroIcon');
  const heroNameEl = document.getElementById('themeHeroName');
  const heroCountEl = document.getElementById('themeHeroCount');
  
  if (heroIconEl) heroIconEl.textContent = heroIcon;
  if (heroNameEl) heroNameEl.textContent = heroTheme.name;
  if (heroCountEl) heroCountEl.textContent = '0'; // Will animate
  
  // Make hero clickable
  if (themeHero) {
    themeHero.style.cursor = 'pointer';
    themeHero.onclick = () => openEvidenceModal(heroKey);
  }
  
  // Populate other themes (skip first)
  const otherThemes = discoveredThemes.slice(1, 6);
  const maxCount = heroTheme.messageCount || 1;
  
  if (themesCluster && otherThemes.length > 0) {
    themesCluster.innerHTML = otherThemes.map((theme, idx) => {
      const icon = themeIcons[theme.name] || themeIcons['default'];
      const themeKey = themeKeyMap[theme.name] || theme.name.toLowerCase().split(' ')[0];
      const barWidth = (theme.messageCount / maxCount) * 100;
      
      return `
        <div class="theme-cluster-card" data-theme="${themeKey}" data-bar-width="${barWidth}" onclick="openEvidenceModal('${themeKey}')" style="animation-delay: ${0.4 + idx * 0.1}s">
          <div class="theme-cluster-icon">${icon}</div>
          <div class="theme-cluster-info">
            <div class="theme-cluster-name">${theme.name}</div>
            <div class="theme-cluster-count"><span data-count="${theme.messageCount}">0</span> user messages</div>
            <div class="theme-cluster-bar">
              <div class="theme-cluster-bar-fill" data-width="${barWidth}"></div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  } else if (themesCluster) {
    themesCluster.innerHTML = '';
  }
  
  // Update insight footer with data-driven text
  const insightTextEl = document.getElementById('themesInsightText');
  if (insightTextEl) {
    const totalThemeMessages = discoveredThemes.reduce((sum, t) => sum + (t.messageCount || 0), 0);
    insightTextEl.textContent = `${discoveredThemes.length} themes discovered across ${totalThemeMessages.toLocaleString()} user messages`;
  }
  
  // Store data for animation
  themesSlideData = {
    heroCount: heroTheme.messageCount,
    otherThemes: otherThemes
  };
}

/**
 * Trigger themes slide animations (called when slide becomes visible)
 */
function animateThemesSlide() {
  if (!themesSlideData || themesSlideAnimated) return;
  themesSlideAnimated = true;
  
  const { heroCount, otherThemes } = themesSlideData;
  
  // Animate hero card entrance
  const themeHero = document.getElementById('themeHero');
  if (themeHero) {
    themeHero.classList.add('animate-in');
  }
  
  // Animate hero count
  setTimeout(() => {
    const heroCountEl = document.getElementById('themeHeroCount');
    if (heroCountEl) {
      animateCountUp(heroCountEl, heroCount, 1500);
    }
  }, 600);
  
  // Animate theme cards entrance and counts
  const cards = document.querySelectorAll('.theme-cluster-card');
  cards.forEach((card, idx) => {
    setTimeout(() => {
      card.classList.add('animate-in');
      
      // Animate the count
      const countEl = card.querySelector('.theme-cluster-count span');
      if (countEl) {
        const targetCount = parseInt(countEl.dataset.count, 10);
        animateCountUp(countEl, targetCount, 1200);
      }
      
      // Animate the bar
      setTimeout(() => {
        const barFill = card.querySelector('.theme-cluster-bar-fill');
        if (barFill) {
          const width = barFill.dataset.width;
          barFill.style.width = `${width}%`;
        }
      }, 400);
    }, 400 + idx * 100);
  });
  
  // Animate insight footer
  setTimeout(() => {
    const insight = document.getElementById('themesInsight');
    if (insight) {
      insight.classList.add('animate-in');
    }
  }, 800 + cards.length * 100);
}

// Make slide functions globally available
window.populateThemesSlide = populateThemesSlide;
window.animateThemesSlide = animateThemesSlide;
window.themeIcons = themeIcons;

