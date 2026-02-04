// ============================================
// ChatGPT Wrapped Video - Base Scene Class
// ============================================
// Abstract base class for all video scenes

/**
 * SceneBase - Abstract base class for video scenes
 * 
 * Lifecycle:
 * 1. constructor() - Initialize with data and timeline
 * 2. enter() - Called once when scene becomes active
 * 3. update(sceneTime, deltaTime, progress) - Called every frame
 * 4. render(ctx, sceneTime, progress) - Draw to canvas
 * 5. exit() - Called when transitioning to next scene
 */
class SceneBase {
  constructor(options = {}) {
    // Reference to renderer
    this.renderer = options.renderer ?? null;
    
    // Timeline info for this scene
    this.timeline = options.timeline ?? { startTime: 0, duration: 4000, endTime: 4000 };
    this.id = this.timeline.id ?? 'unknown';
    
    // Data from ChatGPT analysis
    this.stats = options.stats ?? null;
    this.identityData = options.identityData ?? null;
    this.timePersonalityData = options.timePersonalityData ?? null;
    
    // Canvas dimensions (from renderer)
    this.width = this.renderer?.width ?? 1080;
    this.height = this.renderer?.height ?? 1920;
    
    // Scene state
    this.isActive = false;
    this.hasEntered = false;
    this.tweens = new (window.VideoTween?.TweenGroup ?? TweenGroup)();
    
    // Animation elements (subclasses populate this)
    this.elements = [];
    
    // Track scene start time for animations
    this.sceneStartTimestamp = 0;
    
    // Design system integration
    const ds = window.VideoDesignSystem;
    
    // Design system colors (with fallback)
    this.colors = ds ? {
      bg: ds.colors.bg.primary,
      bgGradientStart: ds.colors.gradients.darkStart,
      bgGradientEnd: ds.colors.gradients.darkEnd,
      accent: ds.colors.accent.primary,
      accentGlow: ds.colors.accent.glow,
      accentGlowStrong: ds.colors.accent.glowStrong,
      accentLight: ds.colors.accent.light,
      accentDark: ds.colors.accent.dark,
      text: ds.colors.text.primary,
      textSecondary: ds.colors.text.secondary,
      textMuted: ds.colors.text.muted,
      textDim: ds.colors.text.dim,
      // Celebration colors
      gold: ds.colors.celebration.gold,
      coral: ds.colors.celebration.coral,
      blue: ds.colors.celebration.blue,
      pink: ds.colors.celebration.pink,
    } : {
      bg: '#0f0f0f',
      bgGradientStart: '#0d0d0d',
      bgGradientEnd: '#1a1a2e',
      accent: '#10a37f',
      accentGlow: 'rgba(16, 163, 127, 0.4)',
      accentGlowStrong: 'rgba(16, 163, 127, 0.6)',
      accentLight: '#14c994',
      accentDark: '#0d8a6a',
      text: '#ffffff',
      textSecondary: '#e0e0e0',
      textMuted: '#888888',
      textDim: '#555555',
      gold: '#ffd700',
      coral: '#ff6b6b',
      blue: '#4d96ff',
      pink: '#ff85a1',
    };
    
    // Typography (with design system integration)
    this.fonts = ds ? {
      title: window.VideoDesign?.createFont('title') ?? 'bold 96px Outfit, sans-serif',
      titleLarge: window.VideoDesign?.createFont('titleLarge') ?? 'bold 144px Outfit, sans-serif',
      heroTitle: window.VideoDesign?.createFont('heroTitle') ?? 'bold 120px Outfit, sans-serif',
      subtitle: window.VideoDesign?.createFont('subtitle') ?? '500 48px Outfit, sans-serif',
      subtitleSmall: window.VideoDesign?.createFont('subtitleSmall') ?? '500 36px Outfit, sans-serif',
      body: window.VideoDesign?.createFont('body') ?? '400 36px Outfit, sans-serif',
      bodySmall: window.VideoDesign?.createFont('bodySmall') ?? '400 28px Outfit, sans-serif',
      number: window.VideoDesign?.createFont('numberGiant') ?? 'bold 200px Outfit, sans-serif',
      numberLarge: window.VideoDesign?.createFont('numberLarge') ?? 'bold 144px Outfit, sans-serif',
      numberMedium: window.VideoDesign?.createFont('numberMedium') ?? 'bold 120px Outfit, sans-serif',
      numberSmall: window.VideoDesign?.createFont('numberSmall') ?? 'bold 72px Outfit, sans-serif',
      label: window.VideoDesign?.createFont('label') ?? '600 32px Outfit, sans-serif',
      labelSmall: window.VideoDesign?.createFont('labelSmall') ?? '600 24px Outfit, sans-serif',
      small: window.VideoDesign?.createFont('caption') ?? '400 28px Outfit, sans-serif',
    } : {
      title: 'bold 96px Outfit, sans-serif',
      titleLarge: 'bold 144px Outfit, sans-serif',
      heroTitle: 'bold 120px Outfit, sans-serif',
      subtitle: '500 48px Outfit, sans-serif',
      subtitleSmall: '500 36px Outfit, sans-serif',
      body: '400 36px Outfit, sans-serif',
      bodySmall: '400 28px Outfit, sans-serif',
      number: 'bold 200px Outfit, sans-serif',
      numberLarge: 'bold 144px Outfit, sans-serif',
      numberMedium: 'bold 120px Outfit, sans-serif',
      numberSmall: 'bold 72px Outfit, sans-serif',
      label: '600 32px Outfit, sans-serif',
      labelSmall: '600 24px Outfit, sans-serif',
      small: '400 28px Outfit, sans-serif',
    };
    
    // Glow presets (from design system)
    this.glow = ds ? ds.glow.presets : {
      text: { color: 'rgba(255, 255, 255, 0.3)', blur: 20 },
      accent: { color: 'rgba(16, 163, 127, 0.5)', blur: 40 },
      accentStrong: { color: 'rgba(16, 163, 127, 0.7)', blur: 60 },
      number: { color: 'rgba(16, 163, 127, 0.4)', blur: 50 },
      celebration: { color: 'rgba(255, 215, 0, 0.4)', blur: 40 },
    };
    
    // Transition state (managed by transition system)
    this.transitionIn = { active: false, progress: 0, type: 'fade' };
    this.transitionOut = { active: false, progress: 0, type: 'fade' };
  }

  /**
   * Called when scene becomes active
   * Override in subclasses to setup animations
   */
  enter() {
    this.isActive = true;
    this.hasEntered = true;
    this.sceneStartTimestamp = performance.now();
    this.tweens.clear();
    
    // Setup scene-specific animations
    this.setupAnimations();
  }

  /**
   * Setup animations - override in subclasses
   */
  setupAnimations() {
    // Subclasses implement this
  }

  /**
   * Called every frame while scene is active
   * @param {number} sceneTime - Time since scene started (ms)
   * @param {number} deltaTime - Time since last frame (ms)
   * @param {number} progress - Scene progress 0-1
   */
  update(sceneTime, deltaTime, progress) {
    // Update all tweens
    const currentTime = performance.now();
    this.tweens.updateAll(currentTime);
    
    // Update elements
    this.updateElements(sceneTime, deltaTime, progress);
  }

  /**
   * Update scene elements - override in subclasses
   */
  updateElements(sceneTime, deltaTime, progress) {
    // Subclasses implement this
  }

  /**
   * Render the scene to canvas
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {number} sceneTime - Time since scene started (ms)
   * @param {number} progress - Scene progress 0-1
   */
  render(ctx, sceneTime, progress) {
    ctx.save();
    
    // Apply transition effects
    this.applyTransition(ctx);
    
    // Render scene content
    this.renderContent(ctx, sceneTime, progress);
    
    ctx.restore();
  }

  /**
   * Render scene content - override in subclasses
   */
  renderContent(ctx, sceneTime, progress) {
    // Subclasses implement this
  }

  /**
   * Apply transition effects
   */
  applyTransition(ctx) {
    if (this.transitionIn.active) {
      ctx.globalAlpha = this.transitionIn.progress;
    }
    if (this.transitionOut.active) {
      ctx.globalAlpha = 1 - this.transitionOut.progress;
    }
  }

  /**
   * Called when scene is exiting
   */
  exit() {
    this.isActive = false;
    this.tweens.clear();
  }

  // ============================================
  // Helper Methods for Subclasses
  // ============================================

  /**
   * Get center X coordinate
   */
  get centerX() {
    return this.width / 2;
  }

  /**
   * Get center Y coordinate
   */
  get centerY() {
    return this.height / 2;
  }

  /**
   * Create a tween and add to the group
   */
  createTween(options) {
    const tween = this.tweens.create(options);
    tween.start(performance.now());
    return tween;
  }

  /**
   * Create a staggered set of tweens
   */
  createStaggeredTweens(items, tweenFactory, staggerDelay = 100) {
    return items.map((item, index) => {
      const options = tweenFactory(item, index);
      options.delay = (options.delay ?? 0) + (index * staggerDelay);
      return this.createTween(options);
    });
  }

  /**
   * Draw text with optional effects
   */
  drawText(ctx, text, x, y, options = {}) {
    const {
      font = this.fonts.body,
      color = this.colors.text,
      align = 'center',
      baseline = 'middle',
      maxWidth = null,
      opacity = 1,
    } = options;

    ctx.save();
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = baseline;
    ctx.globalAlpha = opacity;

    if (maxWidth) {
      ctx.fillText(text, x, y, maxWidth);
    } else {
      ctx.fillText(text, x, y);
    }

    ctx.restore();
  }

  /**
   * Draw text with glow effect
   */
  drawGlowText(ctx, text, x, y, options = {}) {
    const {
      font = this.fonts.title,
      color = this.colors.text,
      glowColor = this.colors.accentGlow,
      glowBlur = 30,
      align = 'center',
      baseline = 'middle',
      opacity = 1,
      pulsing = false,
      pulseAmount = 0.15,
      pulseSpeed = 2000,
      time = performance.now() - this.sceneStartTimestamp,
    } = options;

    ctx.save();
    ctx.font = font;
    ctx.textAlign = align;
    ctx.textBaseline = baseline;
    ctx.globalAlpha = opacity;

    // Calculate pulsing glow if enabled
    let actualGlowBlur = glowBlur;
    let glowOpacity = 1;
    
    if (pulsing && time > 0) {
      const pulse = window.VideoDesign?.getPulsingGlow(time, 1, pulseAmount, pulseSpeed) 
                    ?? (1 + Math.sin(time / pulseSpeed * Math.PI * 2) * pulseAmount);
      actualGlowBlur = glowBlur * pulse;
      glowOpacity = pulse;
    }

    // Glow layer (multiple passes for stronger effect)
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = actualGlowBlur;
    ctx.fillStyle = color;
    ctx.globalAlpha = opacity * glowOpacity;
    ctx.fillText(text, x, y);
    
    // Second glow pass for stronger effect
    if (actualGlowBlur > 20) {
      ctx.shadowBlur = actualGlowBlur * 0.5;
      ctx.fillText(text, x, y);
    }

    // Sharp text on top
    ctx.globalAlpha = opacity;
    ctx.shadowBlur = 0;
    ctx.fillText(text, x, y);

    ctx.restore();
  }

  /**
   * Draw text with breathing scale animation
   */
  drawBreathingText(ctx, text, x, y, options = {}) {
    const {
      font = this.fonts.title,
      color = this.colors.text,
      glowColor = this.colors.accentGlow,
      glowBlur = 30,
      align = 'center',
      baseline = 'middle',
      opacity = 1,
      breatheAmount = 0.02,
      breatheSpeed = 3000,
      time = performance.now() - this.sceneStartTimestamp,
    } = options;

    const scale = window.VideoDesign?.getBreathingScale(time, 1, breatheAmount, breatheSpeed)
                  ?? (1 + Math.sin(time / breatheSpeed * Math.PI * 2) * breatheAmount);

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.translate(-x, -y);

    this.drawGlowText(ctx, text, x, y, {
      font,
      color,
      glowColor,
      glowBlur,
      align,
      baseline,
      opacity,
    });

    ctx.restore();
  }

  /**
   * Draw a number with counting animation support
   */
  drawNumber(ctx, value, x, y, options = {}) {
    const {
      font = this.fonts.number,
      color = this.colors.text,
      glowColor = this.colors.accentGlow,
      glow = true,
      format = true, // Add commas
      opacity = 1,
    } = options;

    let displayValue = Math.round(value);
    if (format) {
      displayValue = displayValue.toLocaleString();
    }

    if (glow) {
      this.drawGlowText(ctx, displayValue.toString(), x, y, {
        font,
        color,
        glowColor,
        opacity,
      });
    } else {
      this.drawText(ctx, displayValue.toString(), x, y, {
        font,
        color,
        opacity,
      });
    }
  }

  /**
   * Draw a rounded rectangle
   */
  drawRoundedRect(ctx, x, y, width, height, radius, options = {}) {
    const {
      fill = null,
      stroke = null,
      strokeWidth = 2,
      opacity = 1,
    } = options;

    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);

    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = strokeWidth;
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * Draw a circle
   */
  drawCircle(ctx, x, y, radius, options = {}) {
    const {
      fill = null,
      stroke = null,
      strokeWidth = 2,
      opacity = 1,
    } = options;

    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);

    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = strokeWidth;
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * Draw a gradient background
   * @param {CanvasRenderingContext2D} ctx
   * @param {string[]|string} colors - Array of colors or preset name ('dark', 'darkAccent', 'warmDark', 'coolDark')
   * @param {object} options - Animation options
   */
  drawGradientBackground(ctx, colors = null, options = {}) {
    const {
      animated = false,
      time = performance.now() - this.sceneStartTimestamp,
    } = options;
    
    // Check if using a preset name
    if (typeof colors === 'string' && window.VideoDesign) {
      window.VideoDesign.drawAnimatedBackground(ctx, this.width, this.height, animated ? time : 0, {
        preset: colors,
        intensity: 1,
      });
      return;
    }
    
    // Legacy: array of colors
    const gradientColors = colors ?? [this.colors.bgGradientStart, this.colors.bgGradientEnd];
    
    // Add subtle animation offset if animated
    let offset = 0;
    if (animated && time > 0) {
      offset = Math.sin(time / 5000) * 0.05;
    }
    
    const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
    
    gradientColors.forEach((color, index) => {
      const stop = Math.max(0, Math.min(1, (index / (gradientColors.length - 1)) + offset));
      gradient.addColorStop(stop, color);
    });

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  /**
   * Draw animated gradient background with preset
   * @param {CanvasRenderingContext2D} ctx
   * @param {string} preset - Gradient preset name
   * @param {number} sceneTime - Current scene time for animation
   */
  drawAnimatedGradient(ctx, preset = 'dark', sceneTime = 0) {
    if (window.VideoDesign) {
      window.VideoDesign.drawAnimatedBackground(ctx, this.width, this.height, sceneTime, {
        preset,
        overlayPreset: 'radialAccent',
        intensity: 0.5,
      });
    } else {
      // Fallback to basic gradient
      this.drawGradientBackground(ctx);
    }
  }

  /**
   * Draw radial gradient overlay (for depth)
   */
  drawRadialOverlay(ctx, options = {}) {
    const {
      x = this.centerX,
      y = this.centerY,
      innerRadius = 0,
      outerRadius = this.height * 0.8,
      innerColor = 'rgba(16, 163, 127, 0.1)',
      outerColor = 'rgba(0, 0, 0, 0)',
      animated = false,
      time = 0,
    } = options;

    // Add breathing animation if enabled
    let animatedOuterRadius = outerRadius;
    if (animated && time > 0) {
      animatedOuterRadius = outerRadius * (1 + Math.sin(time / 2000) * 0.05);
    }

    const gradient = ctx.createRadialGradient(x, y, innerRadius, x, y, animatedOuterRadius);
    gradient.addColorStop(0, innerColor);
    gradient.addColorStop(1, outerColor);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  /**
   * Draw animated radial glow (pulsing)
   */
  drawPulsingGlow(ctx, x, y, options = {}) {
    const {
      baseRadius = this.width * 0.4,
      color = this.colors.accentGlow,
      intensity = 0.3,
      pulseAmount = 0.1,
      pulseSpeed = 2000,
      time = performance.now() - this.sceneStartTimestamp,
    } = options;

    const pulse = window.VideoDesign?.getPulsingGlow(time, 1, pulseAmount, pulseSpeed) ?? 1;
    const radius = baseRadius * pulse;
    
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, this.adjustAlpha(color, intensity * pulse));
    gradient.addColorStop(0.5, this.adjustAlpha(color, intensity * 0.5 * pulse));
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  /**
   * Adjust alpha value of an rgba color
   */
  adjustAlpha(color, newAlpha) {
    if (color.startsWith('rgba')) {
      return color.replace(/[\d.]+\)$/, `${newAlpha})`);
    }
    if (color.startsWith('rgb')) {
      return color.replace('rgb', 'rgba').replace(')', `, ${newAlpha})`);
    }
    // Hex color - convert to rgba
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${newAlpha})`;
  }

  /**
   * Ease a value (helper for manual animations)
   */
  ease(t, type = 'easeOutCubic') {
    const Easing = window.VideoTween?.Easing;
    if (Easing && Easing[type]) {
      return Easing[type](t);
    }
    // Fallback easeOutCubic
    return 1 - Math.pow(1 - t, 3);
  }

  /**
   * Clamp a value between min and max
   */
  clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  /**
   * Map a value from one range to another
   */
  map(value, inMin, inMax, outMin, outMax) {
    return ((value - inMin) / (inMax - inMin)) * (outMax - outMin) + outMin;
  }

  /**
   * Get progress within a time window
   * @param {number} sceneTime - Current scene time
   * @param {number} start - Start time of window
   * @param {number} duration - Duration of window
   * @returns {number} Progress 0-1, clamped
   */
  getWindowProgress(sceneTime, start, duration) {
    if (sceneTime < start) return 0;
    if (sceneTime >= start + duration) return 1;
    return (sceneTime - start) / duration;
  }

  /**
   * Check if we're within a time window
   */
  isInWindow(sceneTime, start, duration) {
    return sceneTime >= start && sceneTime < start + duration;
  }
}

// Export for use in other modules
window.SceneBase = SceneBase;

