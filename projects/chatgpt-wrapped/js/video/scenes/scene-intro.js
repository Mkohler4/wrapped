// ============================================
// ChatGPT Wrapped Video - Intro Scene
// ============================================
// "Your ChatGPT Wrapped" title with zoom + glow animation

class SceneIntro extends SceneBase {
  constructor(options) {
    super(options);
    this.id = 'intro';
    
    // Animation state
    this.titleScale = 0.5;
    this.titleOpacity = 0;
    this.subtitleOpacity = 0;
    this.glowIntensity = 0;
    this.yearOpacity = 0;
    
    // Ambient particles
    this.ambientParticles = new AmbientParticles({
      width: this.width,
      height: this.height,
      density: 0.3,
      color: 'rgba(16, 163, 127, 0.3)',
    });
    
    // Burst effect for title reveal
    this.burstEffect = new NumberBurstEffect({
      colors: ['#10a37f', '#14c994', '#ffffff', '#0d8a6a'],
    });
  }

  setupAnimations() {
    const duration = this.timeline.duration;
    
    // Title zoom in (0-40% of scene)
    this.titleZoomTween = this.createTween({
      from: 0.5,
      to: 1,
      duration: duration * 0.4,
      easing: Easing.easeOutBack,
      onUpdate: (value) => {
        this.titleScale = value;
      },
    });
    
    // Title fade in (0-30%)
    this.titleFadeTween = this.createTween({
      from: 0,
      to: 1,
      duration: duration * 0.3,
      easing: Easing.easeOutCubic,
      onUpdate: (value) => {
        this.titleOpacity = value;
      },
    });
    
    // Glow pulse (20-60%)
    this.glowTween = this.createTween({
      from: 0,
      to: 1,
      duration: duration * 0.4,
      delay: duration * 0.2,
      easing: Easing.easeOutCubic,
      onUpdate: (value) => {
        this.glowIntensity = value;
      },
      onComplete: () => {
        // Trigger particle burst at center
        this.burstEffect.trigger(this.centerX, this.centerY - 50, 1.5);
      },
    });
    
    // Subtitle fade in (40-70%)
    this.subtitleTween = this.createTween({
      from: 0,
      to: 1,
      duration: duration * 0.3,
      delay: duration * 0.4,
      easing: Easing.easeOutCubic,
      onUpdate: (value) => {
        this.subtitleOpacity = value;
      },
    });
    
    // Year fade in (50-80%)
    this.yearTween = this.createTween({
      from: 0,
      to: 1,
      duration: duration * 0.3,
      delay: duration * 0.5,
      easing: Easing.easeOutCubic,
      onUpdate: (value) => {
        this.yearOpacity = value;
      },
    });
  }

  updateElements(sceneTime, deltaTime, progress) {
    // Update ambient particles
    this.ambientParticles.update(performance.now());
    
    // Update burst effect
    this.burstEffect.update(performance.now());
    
    // Subtle glow pulse after initial animation
    if (progress > 0.6) {
      const pulseProgress = (progress - 0.6) / 0.4;
      this.glowIntensity = 1 + Math.sin(pulseProgress * Math.PI * 4) * 0.15;
    }
  }

  renderContent(ctx, sceneTime, progress) {
    // Draw gradient background
    this.drawGradientBackground(ctx);
    
    // Draw ambient particles (behind text)
    this.ambientParticles.draw(ctx);
    
    // Draw radial glow from center
    this.drawCenterGlow(ctx);
    
    // Draw main title
    this.drawTitle(ctx);
    
    // Draw subtitle
    this.drawSubtitle(ctx);
    
    // Draw year indicator
    this.drawYear(ctx);
    
    // Draw burst particles (on top)
    this.burstEffect.draw(ctx);
  }

  drawCenterGlow(ctx) {
    if (this.glowIntensity <= 0) return;
    
    const gradient = ctx.createRadialGradient(
      this.centerX, this.centerY - 50,
      0,
      this.centerX, this.centerY - 50,
      this.width * 0.6 * this.glowIntensity
    );
    
    gradient.addColorStop(0, `rgba(16, 163, 127, ${0.25 * this.glowIntensity})`);
    gradient.addColorStop(0.5, `rgba(16, 163, 127, ${0.1 * this.glowIntensity})`);
    gradient.addColorStop(1, 'rgba(16, 163, 127, 0)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  drawTitle(ctx) {
    if (this.titleOpacity <= 0) return;
    
    ctx.save();
    
    // Apply scale transform from center
    ctx.translate(this.centerX, this.centerY - 50);
    ctx.scale(this.titleScale, this.titleScale);
    ctx.translate(-this.centerX, -(this.centerY - 50));
    
    // Main title: "Your"
    this.drawGlowText(ctx, 'Your', this.centerX, this.centerY - 150, {
      font: '300 64px Outfit, sans-serif',
      color: this.colors.text,
      glowColor: `rgba(255, 255, 255, ${0.3 * this.glowIntensity})`,
      glowBlur: 20 * this.glowIntensity,
      opacity: this.titleOpacity,
    });
    
    // Main title: "ChatGPT"
    this.drawGlowText(ctx, 'ChatGPT', this.centerX, this.centerY - 50, {
      font: 'bold 120px Outfit, sans-serif',
      color: this.colors.text,
      glowColor: `rgba(16, 163, 127, ${0.5 * this.glowIntensity})`,
      glowBlur: 40 * this.glowIntensity,
      opacity: this.titleOpacity,
    });
    
    // Main title: "Wrapped"
    this.drawGlowText(ctx, 'Wrapped', this.centerX, this.centerY + 70, {
      font: 'bold 120px Outfit, sans-serif',
      color: this.colors.accent,
      glowColor: `rgba(16, 163, 127, ${0.6 * this.glowIntensity})`,
      glowBlur: 50 * this.glowIntensity,
      opacity: this.titleOpacity,
    });
    
    ctx.restore();
  }

  drawSubtitle(ctx) {
    if (this.subtitleOpacity <= 0) return;
    
    const y = this.centerY + 200;
    
    this.drawText(ctx, 'Your year in AI conversations', this.centerX, y, {
      font: '400 36px Outfit, sans-serif',
      color: this.colors.textMuted,
      opacity: this.subtitleOpacity,
    });
  }

  drawYear(ctx) {
    if (this.yearOpacity <= 0) return;
    
    // Get year from stats if available
    let yearText = '2024';
    if (this.stats?.basic?.dateRange) {
      const match = this.stats.basic.dateRange.match(/(\d{4})$/);
      if (match) yearText = match[1];
    }
    
    const y = this.height - 200;
    
    // Draw year with accent styling
    ctx.save();
    ctx.globalAlpha = this.yearOpacity;
    
    // Decorative line left
    const lineWidth = 60;
    const lineY = y;
    ctx.strokeStyle = this.colors.accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(this.centerX - 100 - lineWidth, lineY);
    ctx.lineTo(this.centerX - 100, lineY);
    ctx.stroke();
    
    // Year text
    ctx.font = 'bold 48px Outfit, sans-serif';
    ctx.fillStyle = this.colors.accent;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(yearText, this.centerX, y);
    
    // Decorative line right
    ctx.beginPath();
    ctx.moveTo(this.centerX + 100, lineY);
    ctx.lineTo(this.centerX + 100 + lineWidth, lineY);
    ctx.stroke();
    
    ctx.restore();
  }

  exit() {
    super.exit();
    this.burstEffect.clear();
  }
}

// Register scene
window.SceneIntro = SceneIntro;

