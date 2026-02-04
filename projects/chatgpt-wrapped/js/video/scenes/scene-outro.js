// ============================================
// ChatGPT Wrapped Video - Outro Scene
// ============================================
// "That's a wrap!" closing with celebration

class SceneOutro extends SceneBase {
  constructor(options) {
    super(options);
    this.id = 'outro';
    
    // Get year for display
    this.year = '2024';
    if (this.stats?.basic?.dateRange) {
      const match = this.stats.basic.dateRange.match(/(\d{4})$/);
      if (match) this.year = match[1];
    }
    
    // Animation state
    this.wrapOpacity = 0;
    this.wrapScale = 0.5;
    this.wrapGlow = 0;
    this.yearOpacity = 0;
    this.ctaOpacity = 0;
    this.logoOpacity = 0;
    
    // Confetti particles
    this.confetti = new ParticleSystem({
      maxParticles: 200,
      bounds: { x: 0, y: 0, width: this.width, height: this.height },
    });
    
    // Ambient particles
    this.ambient = new AmbientParticles({
      width: this.width,
      height: this.height,
      density: 0.5,
    });
    
    this.confettiBurst = false;
  }

  setupAnimations() {
    const duration = this.timeline.duration;
    
    // "That's a wrap!" zoom in
    this.createTween({
      from: 0.5,
      to: 1,
      duration: 800,
      delay: 100,
      easing: Easing.easeOutBack,
      onUpdate: (v) => { this.wrapScale = v; },
    });
    
    this.createTween({
      from: 0,
      to: 1,
      duration: 500,
      delay: 100,
      easing: Easing.easeOutCubic,
      onUpdate: (v) => { this.wrapOpacity = v; },
    });
    
    // Glow effect
    this.createTween({
      from: 0,
      to: 1,
      duration: 600,
      delay: 400,
      easing: Easing.easeOutCubic,
      onUpdate: (v) => { this.wrapGlow = v; },
      onComplete: () => {
        // Trigger confetti celebration
        this.triggerConfetti();
      },
    });
    
    // Year badge
    this.createTween({
      from: 0,
      to: 1,
      duration: 400,
      delay: 800,
      easing: Easing.easeOutCubic,
      onUpdate: (v) => { this.yearOpacity = v; },
    });
    
    // CTA text
    this.createTween({
      from: 0,
      to: 1,
      duration: 400,
      delay: 1200,
      easing: Easing.easeOutCubic,
      onUpdate: (v) => { this.ctaOpacity = v; },
    });
    
    // Logo/branding
    this.createTween({
      from: 0,
      to: 1,
      duration: 400,
      delay: 1400,
      easing: Easing.easeOutCubic,
      onUpdate: (v) => { this.logoOpacity = v; },
    });
  }

  triggerConfetti() {
    if (this.confettiBurst) return;
    this.confettiBurst = true;
    
    // Multiple bursts across the screen
    const burstPoints = [
      { x: this.width * 0.2, y: this.height * 0.3 },
      { x: this.width * 0.5, y: this.height * 0.25 },
      { x: this.width * 0.8, y: this.height * 0.3 },
      { x: this.width * 0.3, y: this.height * 0.5 },
      { x: this.width * 0.7, y: this.height * 0.5 },
    ];
    
    burstPoints.forEach((point, i) => {
      setTimeout(() => {
        this.confetti.confetti(point.x, point.y, 25, {
          spread: Math.PI * 0.8,
          speed: 10,
          gravity: 0.12,
          colors: ['#10a37f', '#ffd700', '#ff6b6b', '#4d96ff', '#ff85a1', '#6bcb77'],
          life: 3000,
        });
      }, i * 100);
    });
  }

  updateElements(sceneTime, deltaTime, progress) {
    this.confetti.update(performance.now());
    this.ambient.update(performance.now());
  }

  renderContent(ctx, sceneTime, progress) {
    // Draw gradient background
    this.drawGradientBackground(ctx, ['#0a0a0a', '#1a1a2e', '#0a0a0a']);
    
    // Draw ambient particles
    this.ambient.draw(ctx);
    
    // Draw center glow
    this.drawCenterGlow(ctx);
    
    // Draw confetti
    this.confetti.draw(ctx);
    
    // Draw main text
    this.drawMainText(ctx);
    
    // Draw year badge
    this.drawYearBadge(ctx);
    
    // Draw CTA
    this.drawCTA(ctx);
    
    // Draw logo/branding
    this.drawBranding(ctx);
  }

  drawCenterGlow(ctx) {
    if (this.wrapGlow <= 0) return;
    
    const gradient = ctx.createRadialGradient(
      this.centerX, this.centerY - 100,
      0,
      this.centerX, this.centerY - 100,
      this.width * 0.5 * this.wrapGlow
    );
    
    gradient.addColorStop(0, `rgba(16, 163, 127, ${0.3 * this.wrapGlow})`);
    gradient.addColorStop(0.4, `rgba(16, 163, 127, ${0.1 * this.wrapGlow})`);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  drawMainText(ctx) {
    if (this.wrapOpacity <= 0) return;
    
    ctx.save();
    
    // Apply scale transform
    const y = this.centerY - 100;
    ctx.translate(this.centerX, y);
    ctx.scale(this.wrapScale, this.wrapScale);
    ctx.translate(-this.centerX, -y);
    ctx.globalAlpha = this.wrapOpacity;
    
    // "That's a wrap!" with glow
    this.drawGlowText(ctx, "That's a wrap!", this.centerX, y, {
      font: 'bold 96px Outfit, sans-serif',
      color: this.colors.text,
      glowColor: `rgba(16, 163, 127, ${0.6 * this.wrapGlow})`,
      glowBlur: 50 * this.wrapGlow,
    });
    
    ctx.restore();
  }

  drawYearBadge(ctx) {
    if (this.yearOpacity <= 0) return;
    
    const y = this.centerY + 50;
    
    ctx.save();
    ctx.globalAlpha = this.yearOpacity;
    
    // Badge background
    const badgeWidth = 200;
    const badgeHeight = 60;
    
    const gradient = ctx.createLinearGradient(
      this.centerX - badgeWidth / 2, y,
      this.centerX + badgeWidth / 2, y
    );
    gradient.addColorStop(0, '#10a37f');
    gradient.addColorStop(1, '#0d8a6a');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(
      this.centerX - badgeWidth / 2,
      y - badgeHeight / 2,
      badgeWidth,
      badgeHeight,
      30
    );
    ctx.fill();
    
    // Year text
    ctx.font = 'bold 36px Outfit, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.year, this.centerX, y);
    
    ctx.restore();
  }

  drawCTA(ctx) {
    if (this.ctaOpacity <= 0) return;
    
    const y = this.centerY + 180;
    
    ctx.save();
    ctx.globalAlpha = this.ctaOpacity;
    
    // Main CTA
    ctx.font = '400 32px Outfit, sans-serif';
    ctx.fillStyle = this.colors.textMuted;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Thanks for chatting with AI!', this.centerX, y);
    
    // Secondary text
    ctx.font = '300 24px Outfit, sans-serif';
    ctx.fillText("See you next year! 🚀", this.centerX, y + 50);
    
    ctx.restore();
  }

  drawBranding(ctx) {
    if (this.logoOpacity <= 0) return;
    
    ctx.save();
    ctx.globalAlpha = this.logoOpacity;
    
    const y = this.height - 120;
    
    // ChatGPT Wrapped branding
    ctx.font = '600 24px Outfit, sans-serif';
    ctx.fillStyle = this.colors.textMuted;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ChatGPT Wrapped', this.centerX, y);
    
    // Decorative elements
    const lineWidth = 40;
    ctx.strokeStyle = this.colors.accent;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    
    // Left line
    ctx.beginPath();
    ctx.moveTo(this.centerX - 130 - lineWidth, y);
    ctx.lineTo(this.centerX - 130, y);
    ctx.stroke();
    
    // Right line
    ctx.beginPath();
    ctx.moveTo(this.centerX + 130, y);
    ctx.lineTo(this.centerX + 130 + lineWidth, y);
    ctx.stroke();
    
    ctx.restore();
  }

  exit() {
    super.exit();
    this.confetti.clear();
  }
}

// Register scene
window.SceneOutro = SceneOutro;

