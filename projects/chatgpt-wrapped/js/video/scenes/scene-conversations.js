// ============================================
// ChatGPT Wrapped Video - Conversations Scene
// ============================================
// Big number reveal for total conversations

class SceneConversations extends SceneBase {
  constructor(options) {
    super(options);
    this.id = 'conversations';
    
    // Get data
    this.totalConversations = this.stats?.basic?.totalConversations ?? 847;
    
    // Counter animation
    this.counter = new CounterAnimation({
      from: 0,
      to: this.totalConversations,
      duration: 1800,
      delay: 200,
      easing: 'easeOutCubic',
      format: true,
    });
    
    // Label reveal
    this.labelReveal = new TextReveal({
      text: 'conversations',
      mode: 'character',
      duration: 800,
      delay: 1200,
    });
    
    // Particle effects
    this.particles = new ParticleSystem({
      maxParticles: 100,
      bounds: { x: 0, y: 0, width: this.width, height: this.height },
    });
    
    this.burstTriggered = false;
    
    // Animation state
    this.labelY = 0;
    this.numberScale = 1;
    this.contentOpacity = 0;
    
    // Ambient particles for atmospheric depth
    this.ambientParticles = new AmbientParticles({
      width: this.width,
      height: this.height,
      density: 0.2,
      colors: ['rgba(16, 163, 127, 0.15)', 'rgba(20, 201, 148, 0.08)'],
    });
    
    // Responsive layout
    this.isPortrait = this.height > this.width;
    this.setupLayout();
  }

  /**
   * Setup responsive layout positions
   */
  setupLayout() {
    if (this.isPortrait) {
      this.numberY = this.height * 0.38;
      this.labelY_base = this.height * 0.52;
      this.contextY = this.height * 0.68;
      this.numberFont = this.fonts.numberLarge;
      this.titleFontSize = 48;
    } else {
      this.numberY = this.height * 0.42;
      this.labelY_base = this.height * 0.55;
      this.contextY = this.height * 0.68;
      this.numberFont = this.fonts.number;
      this.titleFontSize = 56;
    }
  }

  setupAnimations() {
    // Content fade in
    this.createTween({
      from: 0,
      to: 1,
      duration: 400,
      easing: Easing.easeOutCubic,
      onUpdate: (v) => { this.contentOpacity = v; },
    });
    
    // Start counter
    this.counter.start(performance.now());
    
    // Start label reveal
    this.labelReveal.start(performance.now());
    
    // Number scale pulse when counter completes
    this.counter.onComplete = () => {
      this.triggerBurst();
      
      // Scale pulse
      this.createTween({
        from: 1,
        to: 1.08,
        duration: 150,
        easing: Easing.easeOutCubic,
        onUpdate: (v) => { this.numberScale = v; },
        onComplete: () => {
          this.createTween({
            from: 1.08,
            to: 1,
            duration: 300,
            easing: Easing.easeOutCubic,
            onUpdate: (v) => { this.numberScale = v; },
          });
        },
      });
    };
  }

  triggerBurst() {
    if (this.burstTriggered) return;
    this.burstTriggered = true;
    
    // Burst from the number
    this.particles.burst(this.centerX, this.numberY, 40, {
      speed: 8,
      spread: Math.PI * 2,
      colors: ['#10a37f', '#14c994', '#ffffff', '#ffd700'],
      sizes: [4, 6, 8],
      shapes: ['circle', 'star'],
      life: 1200,
      gravity: 0.05,
    });
    
    // Extra sparkles
    this.particles.sparkle(this.centerX, this.numberY, 20);
  }

  updateElements(sceneTime, deltaTime, progress) {
    // Update counter
    this.counter.update(performance.now());
    
    // Update label reveal
    this.labelReveal.update(performance.now());
    
    // Update particles
    this.particles.update(performance.now());
    
    // Update ambient particles
    this.ambientParticles.update(performance.now());
  }

  renderContent(ctx, sceneTime, progress) {
    // Animated gradient background (replaces flat drawGradientBackground)
    this.drawAnimatedGradient(ctx, 'dark', sceneTime);
    
    // Ambient floating particles (behind content)
    this.ambientParticles.draw(ctx);
    
    // Pulsing glow behind the number area
    this.drawPulsingGlow(ctx, this.centerX, this.numberY, {
      baseRadius: this.width * 0.35,
      color: this.colors.accentGlow,
      intensity: 0.2,
      time: sceneTime,
    });
    
    // Draw burst/sparkle particles
    this.particles.draw(ctx);
    
    // Foreground content with fade
    ctx.save();
    ctx.globalAlpha = this.contentOpacity;
    
    // Draw the big number
    this.drawNumber(ctx);
    
    // Draw label
    this.drawLabel(ctx);
    
    ctx.restore();
    
    // Draw context card (has its own opacity)
    this.drawContext(ctx, progress);
    
    // Particles on top of everything
    this.particles.draw(ctx);
  }

  drawNumber(ctx) {
    const y = this.numberY;
    const displayValue = this.counter.getDisplayValue();
    
    ctx.save();
    
    // Apply scale from center of number
    ctx.translate(this.centerX, y);
    ctx.scale(this.numberScale, this.numberScale);
    ctx.translate(-this.centerX, -y);
    
    // Draw number with glow
    this.drawGlowText(ctx, displayValue, this.centerX, y, {
      font: this.numberFont,
      color: this.colors.text,
      glowColor: this.colors.accentGlow,
      glowBlur: 40,
    });
    
    ctx.restore();
  }

  drawLabel(ctx) {
    const y = this.labelY_base;
    
    // Draw revealing text
    drawRevealingText(ctx, this.labelReveal, this.centerX, y, {
      font: this.isPortrait ? this.fonts.subtitleSmall : this.fonts.subtitle,
      color: this.colors.textMuted,
    });
  }

  drawContext(ctx, progress) {
    // Fade in context after main animation
    const contextOpacity = this.ease(this.clamp((progress - 0.6) / 0.3, 0, 1));
    if (contextOpacity <= 0) return;
    
    // "That's X per day" or date range
    let contextText = '';
    if (this.stats?.basic?.avgPerDay) {
      contextText = `That's about ${this.stats.basic.avgPerDay.toFixed(1)} per day`;
    } else if (this.stats?.basic?.dateRange) {
      contextText = this.stats.basic.dateRange;
    }
    
    if (!contextText) return;
    
    ctx.save();
    ctx.globalAlpha = contextOpacity;
    
    // Measure text to size the glass card
    const fontSize = this.isPortrait ? 28 : 36;
    ctx.font = `400 ${fontSize}px Outfit, sans-serif`;
    const textWidth = ctx.measureText(contextText).width;
    
    const cardPadding = this.isPortrait ? 36 : 48;
    const cardWidth = textWidth + cardPadding * 2;
    const cardHeight = this.isPortrait ? 64 : 72;
    const cardX = this.centerX - cardWidth / 2;
    const cardY = this.contextY - cardHeight / 2;
    
    // Glass card background
    ctx.fillStyle = 'rgba(22, 24, 30, 0.9)';
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardWidth, cardHeight, 16);
    ctx.fill();
    
    // Accent border
    ctx.strokeStyle = 'rgba(16, 163, 127, 0.35)';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Text centered in card
    ctx.font = `400 ${fontSize}px Outfit, sans-serif`;
    ctx.fillStyle = this.colors.textMuted;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(contextText, this.centerX, this.contextY);
    
    ctx.restore();
  }

  exit() {
    super.exit();
    this.particles.clear();
  }
}

// Register scene
window.SceneConversations = SceneConversations;
