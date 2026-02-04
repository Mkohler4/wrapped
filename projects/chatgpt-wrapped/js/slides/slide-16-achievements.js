// ============================================
// Slide 16: Achievements Trophy Room
// ============================================
// Dependencies: utils.js (animateCountUp)
// DOM elements: achievementsBg, achievementsGrid, achievementsRingFill, achievementsUnlockedCount,
//               achievementsSummaryText, achievementsNext

// Note: achievementsSlideData, achievementsSlideAnimated, imageStats are defined in app.js

/**
 * Define all achievements with tiered progression
 * Each achievement can have multiple tiers (bronze → silver → gold → diamond → legendary)
 */
function getAchievementDefinitions(stats) {
  const totalMessages = stats.totalMessages || 0;
  const totalConversations = stats.totalConversations || 0;
  const longestStreak = stats.enhanced?.longestStreak || stats.streaks?.longestStreak || 0;
  const nightOwlScore = stats.enhanced?.nightOwlScore || 0;
  const topicCount = stats.topics?.length || 0;
  const totalActiveDays = stats.enhanced?.totalActiveDays || stats.streaks?.totalActiveDays || 0;
  const imagesGenerated = imageStats?.generated || 0;
  
  // Parse first message year - check multiple possible field names
  let firstMessageYear = 9999;
  const dateFields = [stats.firstDate, stats.firstMessage, stats.firstConversationDate];
  for (const dateField of dateFields) {
    if (dateField) {
      try {
        const date = new Date(dateField);
        if (!isNaN(date.getTime())) {
          firstMessageYear = date.getFullYear();
          break;
        }
      } catch (e) {
        // Try next field
      }
    }
  }
  
  // Debug log for achievements
  console.log('Achievement data:', { 
    firstDate: stats.firstDate,
    firstMessageYear, 
    totalMessages, 
    totalConversations,
    totalActiveDays,
    longestStreak,
    topicCount,
    imagesGenerated
  });
  
  return [
    // Message milestones - extended tiers
    {
      id: 'messages',
      icon: '💬',
      tiers: [
        { threshold: 100, name: 'Chatterbox', desc: '100+ messages', tier: 'bronze' },
        { threshold: 500, name: 'Conversationalist', desc: '500+ messages', tier: 'silver' },
        { threshold: 1000, name: 'Wordsmith', desc: '1,000+ messages', tier: 'gold' },
        { threshold: 5000, name: 'Legendary Talker', desc: '5,000+ messages', tier: 'diamond' },
        { threshold: 10000, name: 'Chat Titan', desc: '10,000+ messages', tier: 'legendary' },
        { threshold: 25000, name: 'Conversation God', desc: '25,000+ messages', tier: 'mythic' },
      ],
      currentValue: totalMessages,
    },
    // Conversation milestones - extended tiers
    {
      id: 'conversations',
      icon: '📝',
      tiers: [
        { threshold: 10, name: 'Getting Started', desc: '10+ conversations', tier: 'bronze' },
        { threshold: 50, name: 'Regular User', desc: '50+ conversations', tier: 'silver' },
        { threshold: 100, name: 'Power Chatter', desc: '100+ conversations', tier: 'gold' },
        { threshold: 500, name: 'ChatGPT Addict', desc: '500+ conversations', tier: 'diamond' },
        { threshold: 1000, name: 'Conversation Master', desc: '1,000+ conversations', tier: 'legendary' },
        { threshold: 2500, name: 'AI Confidant', desc: '2,500+ conversations', tier: 'mythic' },
      ],
      currentValue: totalConversations,
    },
    // Streak milestones - extended tiers
    {
      id: 'streak',
      icon: '🔥',
      tiers: [
        { threshold: 3, name: 'Warming Up', desc: '3+ day streak', tier: 'bronze' },
        { threshold: 7, name: 'Streak Starter', desc: '7+ day streak', tier: 'silver' },
        { threshold: 14, name: 'Streak Master', desc: '14+ day streak', tier: 'gold' },
        { threshold: 30, name: 'Unstoppable', desc: '30+ day streak', tier: 'diamond' },
        { threshold: 60, name: 'Relentless', desc: '60+ day streak', tier: 'legendary' },
        { threshold: 100, name: 'Century Streaker', desc: '100+ day streak', tier: 'mythic' },
      ],
      currentValue: longestStreak,
    },
    // Night Owl - extended tiers
    {
      id: 'nightowl',
      icon: '🌙',
      tiers: [
        { threshold: 5, name: 'Night Curious', desc: 'Some late-night chats', tier: 'bronze' },
        { threshold: 15, name: 'Night Owl', desc: 'Active after midnight', tier: 'silver' },
        { threshold: 30, name: 'Nocturnal', desc: 'Master of the midnight hour', tier: 'gold' },
        { threshold: 50, name: 'Vampire Mode', desc: 'The night is your domain', tier: 'diamond' },
      ],
      currentValue: nightOwlScore,
    },
    // Topic Explorer - extended tiers
    {
      id: 'topics',
      icon: '🌈',
      tiers: [
        { threshold: 3, name: 'Curious Mind', desc: '3+ topics explored', tier: 'bronze' },
        { threshold: 5, name: 'Explorer', desc: '5+ topics explored', tier: 'silver' },
        { threshold: 10, name: 'Renaissance Thinker', desc: '10+ topics explored', tier: 'gold' },
        { threshold: 15, name: 'Polymath', desc: '15+ topics explored', tier: 'diamond' },
      ],
      currentValue: topicCount,
    },
    // Artist - extended tiers
    {
      id: 'artist',
      icon: '🎨',
      tiers: [
        { threshold: 1, name: 'First Creation', desc: 'Created an AI image', tier: 'bronze' },
        { threshold: 10, name: 'Artist', desc: '10+ AI images', tier: 'silver' },
        { threshold: 50, name: 'Digital Picasso', desc: '50+ AI images', tier: 'gold' },
        { threshold: 100, name: 'Visual Virtuoso', desc: '100+ AI images', tier: 'diamond' },
        { threshold: 250, name: 'AI Art Legend', desc: '250+ AI images', tier: 'legendary' },
      ],
      currentValue: imagesGenerated,
    },
    // Dedication - extended tiers
    {
      id: 'dedication',
      icon: '📅',
      tiers: [
        { threshold: 7, name: 'Week Warrior', desc: '7+ active days', tier: 'bronze' },
        { threshold: 30, name: 'Monthly Regular', desc: '30+ active days', tier: 'silver' },
        { threshold: 100, name: 'Devoted User', desc: '100+ active days', tier: 'gold' },
        { threshold: 200, name: 'Dedicated Partner', desc: '200+ active days', tier: 'diamond' },
        { threshold: 365, name: 'Year-Round Companion', desc: '365+ active days', tier: 'legendary' },
      ],
      currentValue: totalActiveDays,
    },
    // OG Status - special year-based (fixed logic)
    {
      id: 'og',
      icon: '🏆',
      tiers: [
        { threshold: 2024, name: 'New Friend', desc: 'Joined in 2024', tier: 'bronze' },
        { threshold: 2023, name: 'ChatGPT OG', desc: 'Used since 2023', tier: 'gold' },
        { threshold: 2022, name: 'Early Adopter', desc: 'Used since 2022', tier: 'legendary' },
      ],
      currentValue: firstMessageYear,
      isYearBased: true,
    },
  ];
}

/**
 * Process achievements to find current tier and progress
 */
function processAchievements(stats) {
  const definitions = getAchievementDefinitions(stats);
  const processed = [];
  
  for (const def of definitions) {
    let currentTier = null;
    let nextTier = null;
    let highestUnlockedIdx = -1;
    
    // For year-based achievements, lower is better
    if (def.isYearBased) {
      for (let i = def.tiers.length - 1; i >= 0; i--) {
        const tier = def.tiers[i];
        if (def.currentValue <= tier.threshold) {
          currentTier = tier;
          highestUnlockedIdx = i;
          break;
        }
      }
      // Next tier is the one with lower year requirement
      if (highestUnlockedIdx < def.tiers.length - 1) {
        nextTier = def.tiers[highestUnlockedIdx + 1];
      } else if (highestUnlockedIdx === -1 && def.tiers.length > 0) {
        nextTier = def.tiers[0];
      }
    } else {
      // Normal threshold-based achievements
      for (let i = def.tiers.length - 1; i >= 0; i--) {
        const tier = def.tiers[i];
        if (def.currentValue >= tier.threshold) {
          currentTier = tier;
          highestUnlockedIdx = i;
          break;
        }
      }
      // Next tier is the next higher threshold
      if (highestUnlockedIdx < def.tiers.length - 1) {
        nextTier = def.tiers[highestUnlockedIdx + 1];
      } else if (highestUnlockedIdx === -1 && def.tiers.length > 0) {
        nextTier = def.tiers[0];
      }
    }
    
    // Calculate progress toward next tier
    let progress = 0;
    if (nextTier && !def.isYearBased) {
      const prevThreshold = currentTier ? currentTier.threshold : 0;
      progress = Math.min(100, Math.round(((def.currentValue - prevThreshold) / (nextTier.threshold - prevThreshold)) * 100));
    }
    
    processed.push({
      id: def.id,
      icon: def.icon,
      currentTier,
      nextTier,
      currentValue: def.currentValue,
      progress,
      isUnlocked: currentTier !== null,
      allTiers: def.tiers,
      isYearBased: def.isYearBased,
    });
  }
  
  return processed;
}

/**
 * Render achievements - populate the grid (no animations yet)
 */
function renderAchievements(stats, aiInsights) {
  const grid = document.getElementById('achievementsGrid');
  if (!grid) return;
  
  const processed = processAchievements(stats);
  
  // Debug: log all processed achievements
  console.log('Processed achievements:', processed.map(a => ({
    id: a.id,
    icon: a.icon,
    isUnlocked: a.isUnlocked,
    currentTier: a.currentTier?.name,
    nextTier: a.nextTier?.name,
    currentValue: a.currentValue
  })));
  
  const unlockedCount = processed.filter(a => a.isUnlocked).length;
  const totalAchievements = processed.length;
  
  // Generate particles for background
  generateAchievementParticles();
  
  // Store data for animation
  achievementsSlideData = {
    processed,
    unlockedCount,
    totalAchievements,
  };
  
  // Hide next milestone section (removed feature)
  const nextEl = document.getElementById('achievementsNext');
  if (nextEl) nextEl.style.display = 'none';
  
  // Render achievement cards - ALWAYS show all achievements
  grid.innerHTML = processed.map((a, idx) => {
    const tierClass = a.isUnlocked ? `tier-${a.currentTier.tier}` : '';
    const unlockedClass = a.isUnlocked ? 'unlocked' : 'locked';
    const displayTier = a.isUnlocked ? a.currentTier : a.nextTier;
    
    // Fallback if somehow no tier info (shouldn't happen)
    if (!displayTier) {
      console.warn('No display tier for achievement:', a.id);
      const fallbackTier = a.allTiers?.[0];
      if (!fallbackTier) return ''; // Only skip if truly no tiers defined
      return `
        <div class="achievement-card locked" data-index="${idx}">
          <div class="achievement-card-lock">🔒</div>
          <div class="achievement-card-icon">${a.icon}</div>
          <div class="achievement-card-name">${fallbackTier.name}</div>
          <div class="achievement-card-desc">${fallbackTier.desc}</div>
        </div>
      `;
    }
    
    // Show progress bar for locked achievements (not for year-based)
    const progressBar = !a.isUnlocked && a.nextTier && !a.isYearBased ? `
      <div class="achievement-card-progress">
        <div class="achievement-card-progress-bar">
          <div class="achievement-card-progress-fill" data-progress="${a.progress}" style="width: 0;"></div>
        </div>
        <div class="achievement-card-progress-text">${(a.currentValue || 0).toLocaleString()} / ${a.nextTier.threshold.toLocaleString()}</div>
      </div>
    ` : '';
    
    return `
      <div class="achievement-card ${unlockedClass} ${tierClass}" data-index="${idx}">
        ${a.isUnlocked ? '<div class="achievement-card-check">✓</div>' : '<div class="achievement-card-lock">🔒</div>'}
        <div class="achievement-card-icon">${a.icon}</div>
        <div class="achievement-card-name">${displayTier.name}</div>
        <div class="achievement-card-desc">${displayTier.desc}</div>
        ${a.isUnlocked ? `<div class="achievement-card-tier">${getTierLabel(displayTier.tier)}</div>` : ''}
        ${progressBar}
      </div>
    `;
  }).join('');
}

/**
 * Get display label for tier
 */
function getTierLabel(tier) {
  const labels = {
    bronze: '🥉 Bronze',
    silver: '🥈 Silver',
    gold: '🥇 Gold',
    diamond: '💎 Diamond',
    legendary: '⭐ Legendary',
    mythic: '🌟 Mythic',
  };
  return labels[tier] || tier;
}

/**
 * Generate floating particles for achievements background
 */
function generateAchievementParticles() {
  const bg = document.getElementById('achievementsBg');
  if (!bg) return;
  
  // Clear existing particles
  const existingParticles = bg.querySelectorAll('.achievement-particle');
  existingParticles.forEach(p => p.remove());
  
  // Add trophy/medal particles
  const particles = ['🏆', '🎖️', '⭐', '🌟', '✨', '💫', '🥇', '🥈', '🥉'];
  for (let i = 0; i < 12; i++) {
    const particle = document.createElement('div');
    particle.className = 'achievement-particle';
    particle.textContent = particles[i % particles.length];
    particle.style.left = `${Math.random() * 100}%`;
    particle.style.animationDelay = `${Math.random() * 15}s`;
    particle.style.animationDuration = `${12 + Math.random() * 8}s`;
    bg.appendChild(particle);
  }
}

/**
 * Animate achievements slide (called when slide becomes visible)
 */
function animateAchievementsSlide() {
  if (!achievementsSlideData || achievementsSlideAnimated) return;
  achievementsSlideAnimated = true;
  
  const { processed, unlockedCount, totalAchievements } = achievementsSlideData;
  
  // Animate summary section
  const summary = document.querySelector('.achievements-summary');
  if (summary) {
    summary.classList.add('animate-in');
  }
  
  // Animate progress ring and count
  setTimeout(() => {
    const ringFill = document.getElementById('achievementsRingFill');
    const countEl = document.getElementById('achievementsUnlockedCount');
    const summaryTextEl = document.getElementById('achievementsSummaryText');
    
    if (ringFill) {
      const percent = Math.round((unlockedCount / totalAchievements) * 100);
      ringFill.style.strokeDasharray = `${percent}, 100`;
    }
    
    if (countEl) {
      animateCountUp(countEl, unlockedCount, 1000);
    }
    
    if (summaryTextEl) {
      const remaining = totalAchievements - unlockedCount;
      if (remaining === 0) {
        summaryTextEl.textContent = `You've unlocked every achievement! 🎉`;
      } else if (remaining === 1) {
        summaryTextEl.textContent = `Just 1 more to complete your collection!`;
      } else {
        summaryTextEl.textContent = `${remaining} more achievements to unlock`;
      }
    }
  }, 400);
  
  // Animate cards with stagger
  const cards = document.querySelectorAll('.achievement-card');
  cards.forEach((card, idx) => {
    setTimeout(() => {
      card.classList.add('animate-in');
      
      // Animate progress bars for locked achievements
      const progressFill = card.querySelector('.achievement-card-progress-fill');
      if (progressFill) {
        setTimeout(() => {
          progressFill.style.width = `${progressFill.dataset.progress}%`;
        }, 200);
      }
    }, 100 + idx * 60);
  });
}

// Make slide functions globally available
window.getAchievementDefinitions = getAchievementDefinitions;
window.processAchievements = processAchievements;
window.renderAchievements = renderAchievements;
window.getTierLabel = getTierLabel;
window.generateAchievementParticles = generateAchievementParticles;
window.animateAchievementsSlide = animateAchievementsSlide;

