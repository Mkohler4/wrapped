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
  }

  setupAnimations() {
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
        to: 1.1,
        duration: 150,
        easing: Easing.easeOutCubic,
        onUpdate: (v) => { this.numberScale = v; },
        onComplete: () => {
          this.createTween({
            from: 1.1,
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
    this.particles.burst(this.centerX, this.centerY - 80, 40, {
      speed: 8,
      spread: Math.PI * 2,
      colors: ['#10a37f', '#14c994', '#ffffff', '#ffd700'],
      sizes: [4, 6, 8],
      shapes: ['circle', 'star'],
      life: 1200,
      gravity: 0.05,
    });
    
    // Extra sparkles
    this.particles.sparkle(this.centerX, this.centerY - 80, 20);
  }

  updateElements(sceneTime, deltaTime, progress) {
    // Update counter
    this.counter.update(performance.now());
    
    // Update label reveal
    this.labelReveal.update(performance.now());
    
    // Update particles
    this.particles.update(performance.now());
  }

  renderContent(ctx, sceneTime, progress) {
    // Draw gradient background
    this.drawGradientBackground(ctx);
    
    // Draw subtle radial glow
    this.drawRadialOverlay(ctx, {
      y: this.centerY - 80,
      innerColor: 'rgba(16, 163, 127, 0.15)',
      outerRadius: this.height * 0.6,
    });
    
    // Draw particles (behind number)
    this.particles.draw(ctx);
    
    // Draw the big number
    this.drawNumber(ctx);
    
    // Draw label
    this.drawLabel(ctx);
    
    // Draw context text
    this.drawContext(ctx, progress);
  }

  drawNumber(ctx) {
    const y = this.centerY - 80;
    const displayValue = this.counter.getDisplayValue();
    
    ctx.save();
    
    // Apply scale
    ctx.translate(this.centerX, y);
    ctx.scale(this.numberScale, this.numberScale);
    ctx.translate(-this.centerX, -y);
    
    // Draw number with glow
    this.drawGlowText(ctx, displayValue, this.centerX, y, {
      font: this.fonts.number,
      color: this.colors.text,
      glowColor: this.colors.accentGlow,
      glowBlur: 40,
    });
    
    ctx.restore();
  }

  drawLabel(ctx) {
    const y = this.centerY + 100;
    
    // Draw revealing text
    drawRevealingText(ctx, this.labelReveal, this.centerX, y, {
      font: this.fonts.subtitle,
      color: this.colors.textMuted,
    });
  }

  drawContext(ctx, progress) {
    // Fade in context after main animation
    const contextOpacity = this.ease(this.clamp((progress - 0.6) / 0.3, 0, 1));
    if (contextOpacity <= 0) return;
    
    const y = this.centerY + 200;
    
    // "That's X per day" or date range
    let contextText = '';
    if (this.stats?.basic?.avgPerDay) {
      contextText = `That's about ${this.stats.basic.avgPerDay.toFixed(1)} per day`;
    } else if (this.stats?.basic?.dateRange) {
      contextText = this.stats.basic.dateRange;
    }
    
    if (contextText) {
      this.drawText(ctx, contextText, this.centerX, y, {
        font: this.fonts.body,
        color: this.colors.textMuted,
        opacity: contextOpacity,
      });
    }
  }

  exit() {
    super.exit();
    this.particles.clear();
  }
}

// Register scene
window.SceneConversations = SceneConversations;

