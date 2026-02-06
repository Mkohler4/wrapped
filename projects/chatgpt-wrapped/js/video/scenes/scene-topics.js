// ============================================
// ChatGPT Wrapped Video - Topics Scene
// ============================================
// Top 3 topics with staggered reveal

class SceneTopics extends SceneBase {
  constructor(options) {
    super(options);
    this.id = 'topics';
    
    // Get top topics
    const topTopics = this.stats?.enhanced?.topTopics ?? [];
    this.topics = topTopics.slice(0, 3).map((t, i) => ({
      name: t.topic || t.name || `Topic ${i + 1}`,
      count: t.count || 0,
      icon: this.getTopicIcon(t.topic || t.name || ''),
    }));
    
    // Fill with defaults if not enough topics
    while (this.topics.length < 3) {
      this.topics.push({
        name: 'General',
        count: 0,
        icon: '💬',
      });
    }
    
    // Animation state for each topic
    this.topicStates = this.topics.map(() => ({
      opacity: 0,
      x: 100, // Start offset to the right
      scale: 0.8,
      countValue: 0,
    }));
    
    // Title animation
    this.titleOpacity = 0;
    this.titleY = -30;
    
    // Particles
    this.particles = new ParticleSystem({
      maxParticles: 60,
      bounds: { x: 0, y: 0, width: this.width, height: this.height },
    });
  }

  getTopicIcon(topic) {
    const topicLower = topic.toLowerCase();
    const icons = {
      coding: '💻',
      programming: '💻',
      code: '💻',
      javascript: '🟨',
      python: '🐍',
      react: '⚛️',
      ai: '🤖',
      'artificial intelligence': '🤖',
      'machine learning': '🧠',
      ml: '🧠',
      writing: '✍️',
      creative: '🎨',
      art: '🎨',
      design: '🎨',
      music: '🎵',
      math: '📐',
      science: '🔬',
      health: '🏥',
      fitness: '💪',
      travel: '✈️',
      food: '🍕',
      cooking: '👨‍🍳',
      business: '💼',
      finance: '💰',
      investing: '📈',
      gaming: '🎮',
      education: '📚',
      learning: '📚',
      philosophy: '🤔',
      history: '📜',
      language: '🗣️',
      translation: '🌐',
    };
    
    for (const [key, icon] of Object.entries(icons)) {
      if (topicLower.includes(key)) return icon;
    }
    return '💡';
  }

  setupAnimations() {
    const duration = this.timeline.duration;
    
    // Title animation
    this.createTween({
      from: 0,
      to: 1,
      duration: 500,
      easing: Easing.easeOutCubic,
      onUpdate: (v) => { this.titleOpacity = v; },
    });
    
    this.createTween({
      from: -30,
      to: 0,
      duration: 500,
      easing: Easing.easeOutCubic,
      onUpdate: (v) => { this.titleY = v; },
    });
    
    // Stagger topic reveals
    this.topics.forEach((topic, index) => {
      const delay = 400 + (index * 300);
      
      // Opacity
      this.createTween({
        from: 0,
        to: 1,
        duration: 400,
        delay,
        easing: Easing.easeOutCubic,
        onUpdate: (v) => { this.topicStates[index].opacity = v; },
      });
      
      // Slide in
      this.createTween({
        from: 100,
        to: 0,
        duration: 500,
        delay,
        easing: Easing.easeOutCubic,
        onUpdate: (v) => { this.topicStates[index].x = v; },
      });
      
      // Scale
      this.createTween({
        from: 0.8,
        to: 1,
        duration: 400,
        delay,
        easing: Easing.easeOutBack,
        onUpdate: (v) => { this.topicStates[index].scale = v; },
        onComplete: () => {
          // Sparkle on reveal
          const y = this.getTopicY(index);
          this.particles.sparkle(this.centerX, y, 10, {
            colors: ['#10a37f', '#ffffff'],
          });
        },
      });
      
      // Count up (if has count)
      if (topic.count > 0) {
        this.createTween({
          from: 0,
          to: topic.count,
          duration: 800,
          delay: delay + 200,
          easing: Easing.easeOutCubic,
          onUpdate: (v) => { this.topicStates[index].countValue = v; },
        });
      }
    });
  }

  getTopicY(index) {
    const startY = this.centerY - 100;
    const spacing = 180;
    return startY + (index * spacing);
  }

  updateElements(sceneTime, deltaTime, progress) {
    this.particles.update(performance.now());
  }

  renderContent(ctx, sceneTime, progress) {
    // Draw gradient background
    this.drawGradientBackground(ctx);
    
    // Draw particles
    this.particles.draw(ctx);
    
    // Draw title
    this.drawTitle(ctx);
    
    // Draw topics
    this.topics.forEach((topic, index) => {
      this.drawTopic(ctx, topic, index);
    });
  }

  drawTitle(ctx) {
    if (this.titleOpacity <= 0) return;
    
    const y = 280 + this.titleY;
    
    this.drawText(ctx, 'You talked most about', this.centerX, y, {
      font: this.fonts.label,
      color: this.colors.textMuted,
      opacity: this.titleOpacity,
    });
  }

  drawTopic(ctx, topic, index) {
    const state = this.topicStates[index];
    if (state.opacity <= 0) return;
    
    const y = this.getTopicY(index);
    const rankColors = ['#ffd700', '#c0c0c0', '#cd7f32']; // Gold, Silver, Bronze
    
    ctx.save();
    
    // Apply transforms
    ctx.translate(state.x, 0);
    ctx.globalAlpha = state.opacity;
    
    // Scale from center
    ctx.translate(this.centerX, y);
    ctx.scale(state.scale, state.scale);
    ctx.translate(-this.centerX, -y);
    
    // Layout: center the whole row around centerX
    // Row layout: [rank 40px gap] [icon 60px gap] [name]
    const rowStartX = this.centerX - 200; // Shift left to center the visual mass
    
    // Draw rank number
    const rankX = rowStartX;
    ctx.font = 'bold 64px Outfit, sans-serif';
    ctx.fillStyle = rankColors[index] || this.colors.textMuted;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${index + 1}`, rankX, y);
    
    // Draw icon
    const iconX = rowStartX + 100;
    ctx.font = '72px sans-serif';
    ctx.fillText(topic.icon, iconX, y);
    
    // Draw topic name (aligned with rank and icon baseline)
    const nameX = rowStartX + 200;
    ctx.font = 'bold 56px Outfit, sans-serif';
    ctx.fillStyle = this.colors.text;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.capitalize(topic.name), nameX, y);
    
    // Draw count if available
    if (topic.count > 0) {
      const countDisplay = Math.round(state.countValue).toLocaleString();
      ctx.font = '32px Outfit, sans-serif';
      ctx.fillStyle = this.colors.textMuted;
      ctx.fillText(`${countDisplay} conversations`, nameX, y + 50);
    }
    
    ctx.restore();
  }

  capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  exit() {
    super.exit();
    this.particles.clear();
  }
}

// Register scene
window.SceneTopics = SceneTopics;

