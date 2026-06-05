// ============================================
// ChatGPT Wrapped Video - Messages Scene
// ============================================
// Big number reveal for total messages

class SceneMessages extends SceneBase {
  constructor(options) {
    super(options);
    this.id = 'messages';
    
    // Get data
    this.totalMessages = this.stats?.basic?.totalMessages ?? 9665;
    
    // Counter animation
    this.counter = new CounterAnimation({
      from: 0,
      to: this.totalMessages,
      duration: 2000,
      delay: 200,
      easing: 'easeOutCubic',
      format: true,
    });
    
    // Label reveal
    this.labelReveal = new TextReveal({
      text: 'messages exchanged',
      mode: 'word',
      duration: 800,
      delay: 1400,
    });
    
    // Particle effects
    this.particles = new ParticleSystem({
      maxParticles: 150,
      bounds: { x: 0, y: 0, width: this.width, height: this.height },
    });
    
    this.burstTriggered = false;
    
    // Animation state
    this.numberScale = 1;
    this.contentOpacity = 0;
  }

  setupAnimations() {
    const duration = this.timeline.duration;
    
    // Fade in animation (no slide - keeps number centered while counting)
    this.createTween({
      from: 0,
      to: 1,
      duration: 400,
      easing: Easing.easeOutCubic,
      onUpdate: (v) => { this.contentOpacity = v; },
    });
    
    // Start counter immediately
    this.counter.start(performance.now());
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
    
    // Larger burst for bigger number
    this.particles.burst(this.centerX, this.centerY - 80, 50, {
      speed: 10,
      spread: Math.PI * 2,
      colors: ['#10a37f', '#14c994', '#ffffff', '#ffd700', '#ff6b6b'],
      sizes: [4, 6, 8, 10],
      shapes: ['circle', 'star', 'confetti'],
      life: 1500,
      gravity: 0.08,
    });
    
    // Confetti celebration
    this.particles.confetti(this.centerX, this.centerY - 80, 30);
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
    
    // Apply fade (no slide - number stays centered while counting up)
    ctx.save();
    ctx.globalAlpha = this.contentOpacity;
    
    // Draw the big number
    this.drawNumber(ctx);
    
    // Draw label
    this.drawLabel(ctx);
    
    ctx.restore();
    
    // Draw particles (not affected by slide)
    this.particles.draw(ctx);
    
    // Draw context
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
    const contextOpacity = this.ease(this.clamp((progress - 0.65) / 0.25, 0, 1));
    if (contextOpacity <= 0) return;
    
    const y = this.centerY + 220;
    
    // Calculate words equivalent
    const wordsEstimate = Math.round(this.totalMessages * 25); // ~25 words per message avg
    let contextText = '';
    
    if (wordsEstimate > 1000000) {
      contextText = `That's over ${(wordsEstimate / 1000000).toFixed(1)}M words`;
    } else if (wordsEstimate > 1000) {
      contextText = `That's over ${Math.round(wordsEstimate / 1000)}K words`;
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
window.SceneMessages = SceneMessages;

