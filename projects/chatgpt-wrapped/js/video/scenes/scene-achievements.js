// ============================================
// ChatGPT Wrapped Video - Achievements Scene
// ============================================
// Achievement badges fly in with animation

class SceneAchievements extends SceneBase {
  constructor(options) {
    super(options);
    this.id = 'achievements';
    
    // Get achievements
    const achievements = this.stats?.enhanced?.achievements ?? [];
    this.achievements = achievements.slice(0, 3).map(a => ({
      name: a.name || a.title || 'Achievement',
      description: a.description || '',
      icon: a.icon || this.getAchievementIcon(a.name || ''),
    }));
    
    // Fill with defaults if needed
    const defaultAchievements = [
      { name: 'Early Adopter', description: 'Started using ChatGPT', icon: '🌟' },
      { name: 'Power User', description: '1000+ messages', icon: '⚡' },
      { name: 'Night Owl', description: 'Active after midnight', icon: '🦉' },
    ];
    
    while (this.achievements.length < 3) {
      this.achievements.push(defaultAchievements[this.achievements.length]);
    }
    
    // Animation state for each badge
    this.badgeStates = this.achievements.map(() => ({
      y: 200,       // Start position (above)
      opacity: 0,
      scale: 0.3,
      rotation: -0.3,
      glow: 0,
    }));
    
    // Title animation
    this.titleOpacity = 0;
    
    // Particles
    this.particles = new ParticleSystem({ maxParticles: 100 });
  }

  getAchievementIcon(name) {
    const nameLower = name.toLowerCase();
    const icons = {
      'early adopter': '🌟',
      'power user': '⚡',
      'night owl': '🦉',
      'early bird': '🐦',
      'marathon': '🏃',
      'explorer': '🔭',
      'deep diver': '🤿',
      'creative': '🎨',
      'coder': '💻',
      'writer': '✍️',
      'learner': '📚',
      'analyst': '📊',
      'streak': '🔥',
      'milestone': '🎯',
      'veteran': '🏆',
      'consistent': '📅',
    };
    
    for (const [key, icon] of Object.entries(icons)) {
      if (nameLower.includes(key)) return icon;
    }
    return '🏅';
  }

  setupAnimations() {
    const duration = this.timeline.duration;
    
    // Title fade in
    this.createTween({
      from: 0,
      to: 1,
      duration: 400,
      easing: Easing.easeOutCubic,
      onUpdate: (v) => { this.titleOpacity = v; },
    });
    
    // Stagger badge animations
    this.achievements.forEach((_, index) => {
      const delay = 300 + (index * 250);
      const state = this.badgeStates[index];
      
      // Drop down with bounce
      this.createTween({
        from: -200,
        to: 0,
        duration: 600,
        delay,
        easing: Easing.easeOutBounce,
        onUpdate: (v) => { state.y = v; },
        onComplete: () => {
          // Confetti burst on landing
          const badgeY = this.getBadgeY(index);
          this.particles.confetti(this.centerX, badgeY, 15, {
            spread: Math.PI * 0.6,
            colors: ['#ffd700', '#10a37f', '#ffffff', '#ff6b6b'],
          });
        },
      });
      
      // Fade in
      this.createTween({
        from: 0,
        to: 1,
        duration: 400,
        delay,
        easing: Easing.easeOutCubic,
        onUpdate: (v) => { state.opacity = v; },
      });
      
      // Scale up
      this.createTween({
        from: 0.3,
        to: 1,
        duration: 500,
        delay,
        easing: Easing.easeOutBack,
        onUpdate: (v) => { state.scale = v; },
      });
      
      // Rotation normalize
      this.createTween({
        from: -0.3,
        to: 0,
        duration: 600,
        delay,
        easing: Easing.easeOutCubic,
        onUpdate: (v) => { state.rotation = v; },
      });
      
      // Glow pulse
      this.createTween({
        from: 0,
        to: 1,
        duration: 400,
        delay: delay + 300,
        easing: Easing.easeOutCubic,
        onUpdate: (v) => { state.glow = v; },
      });
    });
  }

  getBadgeY(index) {
    const startY = this.centerY - 150;
    const spacing = 220;
    return startY + (index * spacing);
  }

  updateElements(sceneTime, deltaTime, progress) {
    this.particles.update(performance.now());
  }

  renderContent(ctx, sceneTime, progress) {
    // Draw gradient background
    this.drawGradientBackground(ctx);
    
    // Draw title
    this.drawTitle(ctx);
    
    // Draw badges
    this.achievements.forEach((achievement, index) => {
      this.drawBadge(ctx, achievement, index);
    });
    
    // Draw particles on top
    this.particles.draw(ctx);
  }

  drawTitle(ctx) {
    if (this.titleOpacity <= 0) return;
    
    this.drawText(ctx, '🏆 Achievements Unlocked', this.centerX, 200, {
      font: 'bold 52px Outfit, sans-serif',
      color: this.colors.text,
      opacity: this.titleOpacity,
    });
  }

  drawBadge(ctx, achievement, index) {
    const state = this.badgeStates[index];
    if (state.opacity <= 0) return;
    
    const baseY = this.getBadgeY(index);
    const y = baseY + state.y;
    
    ctx.save();
    ctx.globalAlpha = state.opacity;
    
    // Apply transforms
    ctx.translate(this.centerX, y);
    ctx.rotate(state.rotation);
    ctx.scale(state.scale, state.scale);
    ctx.translate(-this.centerX, -y);
    
    // Badge card background
    const cardWidth = 600;
    const cardHeight = 160;
    const cardX = this.centerX - cardWidth / 2;
    const cardY = y - cardHeight / 2;
    
    // Glow behind card
    if (state.glow > 0) {
      const glowGradient = ctx.createRadialGradient(
        this.centerX, y, 0,
        this.centerX, y, cardWidth * 0.6
      );
      glowGradient.addColorStop(0, `rgba(255, 215, 0, ${0.15 * state.glow})`);
      glowGradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
      ctx.fillStyle = glowGradient;
      ctx.fillRect(cardX - 50, cardY - 50, cardWidth + 100, cardHeight + 100);
    }
    
    // Card background
    ctx.fillStyle = 'rgba(30, 30, 35, 0.9)';
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardWidth, cardHeight, 20);
    ctx.fill();
    
    // Card border
    const borderGradient = ctx.createLinearGradient(cardX, cardY, cardX + cardWidth, cardY + cardHeight);
    borderGradient.addColorStop(0, 'rgba(255, 215, 0, 0.5)');
    borderGradient.addColorStop(0.5, 'rgba(16, 163, 127, 0.5)');
    borderGradient.addColorStop(1, 'rgba(255, 215, 0, 0.5)');
    ctx.strokeStyle = borderGradient;
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Icon circle
    const iconX = cardX + 80;
    const iconSize = 80;
    
    ctx.fillStyle = 'rgba(16, 163, 127, 0.2)';
    ctx.beginPath();
    ctx.arc(iconX, y, iconSize / 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Icon
    ctx.font = '48px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(achievement.icon, iconX, y);
    
    // Achievement name
    ctx.font = 'bold 36px Outfit, sans-serif';
    ctx.fillStyle = this.colors.text;
    ctx.textAlign = 'left';
    ctx.fillText(achievement.name, cardX + 150, y - 20);
    
    // Description
    if (achievement.description) {
      ctx.font = '24px Outfit, sans-serif';
      ctx.fillStyle = this.colors.textMuted;
      ctx.fillText(achievement.description, cardX + 150, y + 25);
    }
    
    // Rank/rarity indicator
    const rarityColors = ['#ffd700', '#c0c0c0', '#cd7f32'];
    ctx.fillStyle = rarityColors[index] || '#ffd700';
    ctx.beginPath();
    ctx.arc(cardX + cardWidth - 40, cardY + 30, 12, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  }

  exit() {
    super.exit();
    this.particles.clear();
  }
}

// Register scene
window.SceneAchievements = SceneAchievements;

