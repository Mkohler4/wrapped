// ============================================
// ChatGPT Wrapped Video - Gallery Scene
// ============================================
// Scrolling angled image gallery with stats overlay

class SceneGallery extends SceneBase {
  constructor(options) {
    super(options);
    this.id = 'gallery';
    
    // Get gallery data from stats
    this.galleryData = this.stats?.gallery ?? this.generateSampleData();
    
    // Animation state
    this.bgOpacity = 0;
    this.overlayOpacity = 0;
    this.titleOpacity = 0;
    this.titleScale = 0.95;
    this.heroOpacity = 0;
    this.heroScale = 0.8;
    this.heroGlow = 0;
    this.statsOpacity = 0;
    this.statsY = 30;
    
    // Scrolling columns
    this.columns = [];
    this.rotationAngle = 12 * (Math.PI / 180); // 12 degrees in radians
    
    // Counters
    this.totalCounter = new CounterAnimation({
      from: 0,
      to: this.galleryData.total ?? 847,
      duration: 1500,
      delay: 400,
      format: true,
    });
    
    this.generatedCounter = new CounterAnimation({
      from: 0,
      to: this.galleryData.generated ?? 312,
      duration: 1200,
      delay: 1300,
      format: true,
    });
    
    this.uploadedCounter = new CounterAnimation({
      from: 0,
      to: this.galleryData.uploaded ?? 535,
      duration: 1200,
      delay: 1400,
      format: true,
    });
    
    // Particles
    this.particles = new ParticleSystem({ maxParticles: 60 });
    
    // Responsive layout
    this.isPortrait = this.height > this.width;
    this.setupLayout();
    this.setupColumns();
  }

  /**
   * Generate sample gallery data
   */
  generateSampleData() {
    return {
      total: 847,
      generated: 312,
      uploaded: 535,
    };
  }

  /**
   * Setup responsive layout
   */
  setupLayout() {
    if (this.isPortrait) {
      this.titleY = this.height * 0.12;
      this.heroY = this.height * 0.38;
      this.statsY_base = this.height * 0.62;
      this.cardWidth = 160;
      this.cardHeight = 215;
      this.columnCount = 12;
      this.heroFontSize = 140;
    } else {
      this.titleY = this.height * 0.14;
      this.heroY = this.height * 0.45;
      this.statsY_base = this.height * 0.72;
      this.cardWidth = 130;
      this.cardHeight = 175;
      this.columnCount = 26;
      this.heroFontSize = 180;
    }
  }

  /**
   * Setup scrolling columns with cards
   */
  setupColumns() {
    // Gradient presets for cards
    this.gradients = [
      { start: '#667eea', end: '#764ba2' }, // Purple
      { start: '#11998e', end: '#38ef7d' }, // Teal
      { start: '#ee0979', end: '#ff6a00' }, // Pink-Orange
      { start: '#4facfe', end: '#00f2fe' }, // Blue
      { start: '#f093fb', end: '#f5576c' }, // Pink
      { start: '#a8edea', end: '#fed6e3' }, // Pastel
      { start: '#5ee7df', end: '#b490ca' }, // Mint-Purple
    ];
    
    // Column scroll speeds (pixels per frame at 60fps)
    const speeds = [0.8, 1.2, 0.9, 1.3, 1.0, 1.1, 0.85];
    
    // Gap between cards (minimal for tight packing)
    const cardGap = 4;
    const columnGapSize = 4;
    
    // Calculate column positions to cover rotated canvas
    const extraHeight = this.height * 1.0; // Extra for rotation overflow
    const totalHeight = this.height + extraHeight * 2;
    const cardsPerColumn = Math.ceil(totalHeight / (this.cardHeight + cardGap)) + 4;
    
    // Column X positions (tightly packed to fill entire rotated area)
    // When rotated 12°, we need extra width to cover corners
    const totalWidth = this.width * 2.5; // Extra wide to fill rotated area completely
    const startX = -this.width * 0.6; // Start much further left
    const columnWidth = this.cardWidth + columnGapSize;
    
    this.columns = [];
    
    for (let col = 0; col < this.columnCount; col++) {
      const cards = [];
      const baseX = startX + col * columnWidth;
      // Stagger starting Y positions for visual variety
      const yOffset = (col % 3) * (this.cardHeight * 0.35);
      
      for (let i = 0; i < cardsPerColumn; i++) {
        cards.push({
          y: -extraHeight + yOffset + i * (this.cardHeight + cardGap),
          gradient: this.gradients[(col + i) % this.gradients.length],
          icon: Math.random() > 0.4 ? '🎨' : '📤',
        });
      }
      
      this.columns.push({
        x: baseX,
        speed: speeds[col % speeds.length],
        cards,
      });
    }
    
    this.cardGap = cardGap;
    this.columnTotalHeight = cardsPerColumn * (this.cardHeight + cardGap);
  }

  /**
   * Setup animations
   */
  setupAnimations() {
    // Background fade in (0-800ms)
    this.createTween({
      from: 0,
      to: 0.65,
      duration: 800,
      easing: Easing.easeOutCubic,
      onUpdate: (v) => { this.bgOpacity = v; },
    });
    
    // Overlay fade in (200-600ms)
    this.createTween({
      from: 0,
      to: 1,
      duration: 400,
      delay: 200,
      easing: Easing.easeOutCubic,
      onUpdate: (v) => { this.overlayOpacity = v; },
    });
    
    // Title fade in + scale (0-600ms)
    this.createTween({
      from: 0,
      to: 1,
      duration: 600,
      easing: Easing.easeOutCubic,
      onUpdate: (v) => { 
        this.titleOpacity = v;
        this.titleScale = 0.95 + v * 0.05;
      },
    });
    
    // Hero number scale up (300-900ms)
    this.createTween({
      from: 0,
      to: 1,
      duration: 600,
      delay: 300,
      easing: Easing.easeOutBack,
      onUpdate: (v) => {
        this.heroOpacity = v;
        this.heroScale = 0.8 + v * 0.2;
        this.heroGlow = v;
      },
      onComplete: () => {
        // Particle burst
        this.particles.burst(this.centerX, this.heroY, 25, {
          colors: ['#a855f7', '#c084fc', '#ffffff', '#10a37f'],
          speed: 3,
          spread: Math.PI * 2,
        });
      },
    });
    
    // Stats cards slide up (1200-1700ms)
    this.createTween({
      from: 0,
      to: 1,
      duration: 500,
      delay: 1200,
      easing: Easing.easeOutCubic,
      onUpdate: (v) => {
        this.statsOpacity = v;
        this.statsY = 30 - v * 30;
      },
    });
    
    // Start counters
    this.totalCounter.start(performance.now());
    this.generatedCounter.start(performance.now());
    this.uploadedCounter.start(performance.now());
  }

  /**
   * Update animations
   */
  updateElements(sceneTime, deltaTime, progress) {
    // Update counters
    this.totalCounter.update(performance.now());
    this.generatedCounter.update(performance.now());
    this.uploadedCounter.update(performance.now());
    
    // Update particles
    this.particles.update(performance.now());
    
    // Update scrolling columns (continuous)
    const frameSpeed = deltaTime / 16.67; // Normalize to 60fps
    
    this.columns.forEach((column) => {
      column.cards.forEach((card) => {
        card.y -= column.speed * frameSpeed;
        
        // Wrap around when card goes above visible area
        if (card.y < -this.height * 1.0) {
          card.y += this.columnTotalHeight;
        }
      });
    });
  }

  /**
   * Render scene
   */
  renderContent(ctx, sceneTime, progress) {
    // Dark base
    ctx.fillStyle = '#0d0d0f';
    ctx.fillRect(0, 0, this.width, this.height);
    
    // Draw scrolling columns (background)
    this.drawScrollingColumns(ctx);
    
    // Dark overlay for text readability
    this.drawOverlay(ctx);
    
    // Foreground content
    this.drawTitle(ctx);
    this.drawHeroNumber(ctx, sceneTime);
    this.drawStatsCards(ctx);
    
    // Particles on top
    this.particles.draw(ctx);
  }

  /**
   * Draw scrolling angled columns
   */
  drawScrollingColumns(ctx) {
    if (this.bgOpacity <= 0) return;
    
    ctx.save();
    
    // Move to center, rotate, then draw
    ctx.translate(this.centerX, this.centerY);
    ctx.rotate(this.rotationAngle);
    ctx.translate(-this.centerX, -this.centerY);
    
    ctx.globalAlpha = this.bgOpacity;
    
    this.columns.forEach((column) => {
      column.cards.forEach((card) => {
        this.drawCard(ctx, column.x, card.y, card.gradient, card.icon);
      });
    });
    
    ctx.restore();
  }

  /**
   * Draw a single gallery card
   */
  drawCard(ctx, x, y, gradient, icon) {
    const w = this.cardWidth;
    const h = this.cardHeight;
    const radius = 16;
    
    // Create gradient
    const grad = ctx.createLinearGradient(x, y, x + w, y + h);
    grad.addColorStop(0, gradient.start);
    grad.addColorStop(1, gradient.end);
    
    // Card background
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, radius);
    ctx.fill();
    
    // Subtle border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // Icon in center (subtle)
    ctx.globalAlpha = this.bgOpacity * 0.3;
    ctx.font = `${this.isPortrait ? 36 : 48}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(icon, x + w / 2, y + h / 2);
    ctx.globalAlpha = this.bgOpacity;
  }

  /**
   * Draw dark radial overlay for text readability
   */
  drawOverlay(ctx) {
    if (this.overlayOpacity <= 0) return;
    
    ctx.save();
    ctx.globalAlpha = this.overlayOpacity;
    
    // Radial gradient from center
    const grad = ctx.createRadialGradient(
      this.centerX, this.centerY, 0,
      this.centerX, this.centerY, this.width * 0.7
    );
    grad.addColorStop(0, 'rgba(13, 13, 15, 0.85)');
    grad.addColorStop(0.5, 'rgba(13, 13, 15, 0.6)');
    grad.addColorStop(1, 'rgba(13, 13, 15, 0.3)');
    
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.width, this.height);
    
    ctx.restore();
  }

  /**
   * Draw title
   */
  drawTitle(ctx) {
    if (this.titleOpacity <= 0) return;
    
    ctx.save();
    ctx.globalAlpha = this.titleOpacity;
    
    // Apply scale from center
    ctx.translate(this.centerX, this.titleY);
    ctx.scale(this.titleScale, this.titleScale);
    ctx.translate(-this.centerX, -this.titleY);
    
    const titleSize = this.isPortrait ? 48 : 56;
    const subtitleSize = this.isPortrait ? 20 : 24;
    
    // Main title
    this.drawGlowText(ctx, 'Your Creations', this.centerX, this.titleY, {
      font: `bold ${titleSize}px Outfit, sans-serif`,
      color: this.colors.text,
      glowColor: 'rgba(168, 85, 247, 0.4)',
      glowBlur: 20,
    });
    
    // Subtitle
    this.drawText(ctx, 'Images made with ChatGPT', this.centerX, this.titleY + titleSize * 0.9, {
      font: `${subtitleSize}px Outfit, sans-serif`,
      color: this.colors.textMuted,
    });
    
    ctx.restore();
  }

  /**
   * Draw hero number with glow
   */
  drawHeroNumber(ctx, sceneTime) {
    if (this.heroOpacity <= 0) return;
    
    ctx.save();
    ctx.globalAlpha = this.heroOpacity;
    
    // Apply scale from center
    ctx.translate(this.centerX, this.heroY);
    ctx.scale(this.heroScale, this.heroScale);
    ctx.translate(-this.centerX, -this.heroY);
    
    // Pulsing glow behind number
    const pulseIntensity = 0.15 + Math.sin(sceneTime / 500) * 0.05;
    this.drawPulsingGlow(ctx, this.centerX, this.heroY, {
      baseRadius: this.heroFontSize * 1.2,
      color: 'rgba(168, 85, 247, 0.5)',
      intensity: this.heroGlow * pulseIntensity,
      time: sceneTime,
    });
    
    // Hero number
    const value = this.totalCounter.getDisplayValue();
    this.drawGlowText(ctx, value, this.centerX, this.heroY, {
      font: `bold ${this.heroFontSize}px Outfit, sans-serif`,
      color: this.colors.text,
      glowColor: 'rgba(168, 85, 247, 0.6)',
      glowBlur: 30,
    });
    
    // Label below
    const labelSize = this.isPortrait ? 28 : 32;
    this.drawText(ctx, 'images', this.centerX, this.heroY + this.heroFontSize * 0.55, {
      font: `${labelSize}px Outfit, sans-serif`,
      color: this.colors.textMuted,
    });
    
    ctx.restore();
  }

  /**
   * Draw stats cards
   */
  drawStatsCards(ctx) {
    if (this.statsOpacity <= 0) return;
    
    ctx.save();
    ctx.globalAlpha = this.statsOpacity;
    
    const cardWidth = this.isPortrait ? 200 : 240;
    const cardHeight = this.isPortrait ? 80 : 90;
    const gap = this.isPortrait ? 20 : 30;
    const totalWidth = cardWidth * 2 + gap;
    const startX = this.centerX - totalWidth / 2;
    const y = this.statsY_base + this.statsY;
    
    const stats = [
      {
        icon: '🎨',
        value: this.generatedCounter.getDisplayValue(),
        label: 'Generated',
        accentColor: 'rgba(168, 85, 247, 0.5)', // Purple
      },
      {
        icon: '📤',
        value: this.uploadedCounter.getDisplayValue(),
        label: 'Uploaded',
        accentColor: 'rgba(16, 163, 127, 0.5)', // Teal
      },
    ];
    
    stats.forEach((stat, i) => {
      const x = startX + i * (cardWidth + gap);
      
      // Card background (glass effect)
      ctx.fillStyle = 'rgba(22, 24, 30, 0.9)';
      ctx.beginPath();
      ctx.roundRect(x, y, cardWidth, cardHeight, 16);
      ctx.fill();
      
      // Accent border
      ctx.strokeStyle = stat.accentColor;
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Icon
      const iconSize = this.isPortrait ? 24 : 28;
      ctx.font = `${iconSize}px sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(stat.icon, x + 18, y + cardHeight / 2 - 5);
      
      // Value
      const valueSize = this.isPortrait ? 26 : 32;
      ctx.font = `bold ${valueSize}px Outfit, sans-serif`;
      ctx.fillStyle = this.colors.text;
      ctx.fillText(stat.value, x + 55, y + cardHeight / 2 - 5);
      
      // Label
      const labelSize = this.isPortrait ? 14 : 16;
      ctx.font = `${labelSize}px Outfit, sans-serif`;
      ctx.fillStyle = this.colors.textMuted;
      ctx.fillText(stat.label, x + 55, y + cardHeight / 2 + 20);
    });
    
    ctx.restore();
  }

  exit() {
    super.exit();
    this.particles.clear();
  }
}

// Register scene
window.SceneGallery = SceneGallery;
