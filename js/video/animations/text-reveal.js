// ============================================
// ChatGPT Wrapped Video - Text Reveal Animations
// ============================================
// Character-by-character, word-by-word, and line reveals

/**
 * TextReveal - Animates text revealing character by character or word by word
 */
class TextReveal {
  constructor(options = {}) {
    this.text = options.text ?? '';
    this.mode = options.mode ?? 'character'; // 'character', 'word', 'line'
    this.duration = options.duration ?? 1000; // Total duration
    this.delay = options.delay ?? 0;
    this.stagger = options.stagger ?? null; // Auto-calculated if null
    this.easing = options.easing ?? 'easeOutCubic';
    
    // Split text into units
    this.units = this.splitText();
    this.unitCount = this.units.length;
    
    // Calculate stagger if not provided
    if (this.stagger === null) {
      this.stagger = this.duration / Math.max(this.unitCount, 1);
    }
    
    // State
    this.startTime = null;
    this.isRunning = false;
    this.isComplete = false;
    this.revealedCount = 0;
    this.unitStates = this.units.map(() => ({
      revealed: false,
      opacity: 0,
      y: 20, // Start offset
      scale: 0.8,
    }));
    
    // Callbacks
    this.onUpdate = options.onUpdate ?? null;
    this.onComplete = options.onComplete ?? null;
  }

  /**
   * Split text into animation units
   */
  splitText() {
    switch (this.mode) {
      case 'word':
        return this.text.split(/(\s+)/).filter(s => s.length > 0);
      case 'line':
        return this.text.split('\n');
      case 'character':
      default:
        return this.text.split('');
    }
  }

  /**
   * Start the reveal animation
   */
  start(currentTime = performance.now()) {
    this.startTime = currentTime + this.delay;
    this.isRunning = true;
    this.isComplete = false;
    this.revealedCount = 0;
    this.unitStates = this.units.map(() => ({
      revealed: false,
      opacity: 0,
      y: 20,
      scale: 0.8,
    }));
    return this;
  }

  /**
   * Update the reveal state
   */
  update(currentTime = performance.now()) {
    if (!this.isRunning || this.isComplete) return this;
    if (currentTime < this.startTime) return this;

    const elapsed = currentTime - this.startTime;
    const Easing = window.VideoTween?.Easing;

    let allComplete = true;
    
    this.unitStates = this.unitStates.map((state, index) => {
      const unitStart = index * this.stagger;
      const unitElapsed = Math.max(0, elapsed - unitStart);
      const unitDuration = this.stagger * 2; // Each unit takes 2x stagger to fully animate
      let progress = Math.min(unitElapsed / unitDuration, 1);
      
      if (Easing && Easing[this.easing]) {
        progress = Easing[this.easing](progress);
      }
      
      if (progress < 1) allComplete = false;
      
      return {
        revealed: progress > 0,
        opacity: progress,
        y: 20 * (1 - progress), // Animate from 20px down to 0
        scale: 0.8 + (0.2 * progress), // Scale from 0.8 to 1
      };
    });

    this.revealedCount = this.unitStates.filter(s => s.revealed).length;

    if (this.onUpdate) {
      this.onUpdate(this.revealedCount, this.unitCount);
    }

    if (allComplete) {
      this.isComplete = true;
      this.isRunning = false;
      if (this.onComplete) {
        this.onComplete();
      }
    }

    return this;
  }

  /**
   * Get the currently visible text
   */
  getVisibleText() {
    return this.units
      .filter((_, i) => this.unitStates[i]?.revealed)
      .join(this.mode === 'character' ? '' : ' ');
  }

  /**
   * Get reveal progress (0-1)
   */
  getProgress() {
    return this.revealedCount / Math.max(this.unitCount, 1);
  }

  /**
   * Reset the animation
   */
  reset() {
    this.startTime = null;
    this.isRunning = false;
    this.isComplete = false;
    this.revealedCount = 0;
    this.unitStates = this.units.map(() => ({
      revealed: false,
      opacity: 0,
      y: 20,
      scale: 0.8,
    }));
    return this;
  }
}

/**
 * Draw revealing text to canvas
 */
function drawRevealingText(ctx, reveal, x, y, options = {}) {
  const {
    font = '500 48px Outfit, sans-serif',
    color = '#ffffff',
    align = 'center',
    baseline = 'middle',
    letterSpacing = 0,
    lineHeight = 1.2,
  } = options;

  ctx.save();
  ctx.font = font;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;

  if (reveal.mode === 'line') {
    // Draw each line
    const fontSize = parseInt(font.match(/(\d+)px/)?.[1] ?? 48);
    reveal.units.forEach((line, i) => {
      const state = reveal.unitStates[i];
      if (!state.revealed) return;
      
      ctx.save();
      ctx.globalAlpha = state.opacity;
      ctx.translate(0, state.y);
      ctx.fillStyle = color;
      ctx.fillText(line, x, y + (i * fontSize * lineHeight));
      ctx.restore();
    });
  } else if (reveal.mode === 'word') {
    // Draw words with spacing
    ctx.fillStyle = color;
    let currentX = x;
    
    // Calculate total width for centering (use ALL units, not just visible)
    if (align === 'center') {
      const fullText = reveal.units.join('');
      const totalWidth = ctx.measureText(fullText).width;
      currentX = x - totalWidth / 2;
    }
    
    // Use left alignment for individual word positioning
    ctx.textAlign = 'left';
    
    reveal.units.forEach((word, i) => {
      const state = reveal.unitStates[i];
      const wordWidth = ctx.measureText(word).width;
      
      // Only draw if visible, but ALWAYS advance position
      if (state.opacity > 0) {
        ctx.save();
        ctx.globalAlpha = state.opacity;
        
        // Apply transform
        ctx.translate(currentX + wordWidth / 2, y + state.y);
        ctx.scale(state.scale, state.scale);
        ctx.translate(-(currentX + wordWidth / 2), -(y + state.y));
        
        ctx.fillText(word, currentX, y);
        ctx.restore();
      }
      
      // Always advance position to maintain proper spacing
      currentX += wordWidth;
    });
  } else {
    // Character mode
    ctx.fillStyle = color;
    
    // Pre-calculate all character widths for consistent positioning
    const charWidths = reveal.units.map(char => ctx.measureText(char).width);
    const totalWidth = charWidths.reduce((sum, w) => sum + w, 0) + (letterSpacing * (reveal.unitCount - 1));
    
    let currentX = x;
    if (align === 'center') {
      currentX = x - totalWidth / 2;
    }
    
    // Use left alignment for individual character positioning
    ctx.textAlign = 'left';
    
    reveal.units.forEach((char, i) => {
      const state = reveal.unitStates[i];
      const charWidth = charWidths[i];
      
      // Only draw if visible, but ALWAYS advance position
      if (state.opacity > 0) {
        ctx.save();
        ctx.globalAlpha = state.opacity;
        
        // Apply transform
        ctx.translate(currentX + charWidth / 2, y + state.y);
        ctx.scale(state.scale, state.scale);
        ctx.translate(-(currentX + charWidth / 2), -(y + state.y));
        
        ctx.fillText(char, currentX, y);
        ctx.restore();
      }
      
      currentX += charWidth + letterSpacing;
    });
  }

  ctx.restore();
}

/**
 * TypewriterReveal - Classic typewriter effect with cursor
 */
class TypewriterReveal {
  constructor(options = {}) {
    this.text = options.text ?? '';
    this.speed = options.speed ?? 50; // ms per character
    this.delay = options.delay ?? 0;
    this.cursorBlink = options.cursorBlink ?? true;
    this.cursorChar = options.cursorChar ?? '|';
    
    this.characters = this.text.split('');
    this.charCount = this.characters.length;
    
    // State
    this.startTime = null;
    this.isRunning = false;
    this.isComplete = false;
    this.currentIndex = 0;
    this.cursorVisible = true;
    this.lastCursorBlink = 0;
    
    this.onUpdate = options.onUpdate ?? null;
    this.onComplete = options.onComplete ?? null;
  }

  start(currentTime = performance.now()) {
    this.startTime = currentTime + this.delay;
    this.isRunning = true;
    this.isComplete = false;
    this.currentIndex = 0;
    this.cursorVisible = true;
    this.lastCursorBlink = currentTime;
    return this;
  }

  update(currentTime = performance.now()) {
    if (!this.isRunning) return this;
    
    // Handle cursor blink
    if (this.cursorBlink && currentTime - this.lastCursorBlink > 500) {
      this.cursorVisible = !this.cursorVisible;
      this.lastCursorBlink = currentTime;
    }
    
    if (this.isComplete) return this;
    if (currentTime < this.startTime) return this;

    const elapsed = currentTime - this.startTime;
    const newIndex = Math.min(Math.floor(elapsed / this.speed), this.charCount);
    
    if (newIndex !== this.currentIndex) {
      this.currentIndex = newIndex;
      if (this.onUpdate) {
        this.onUpdate(this.getCurrentText(), this.currentIndex);
      }
    }

    if (this.currentIndex >= this.charCount) {
      this.isComplete = true;
      // Keep running for cursor blink
      if (this.onComplete) {
        this.onComplete(this.text);
      }
    }

    return this;
  }

  getCurrentText() {
    return this.characters.slice(0, this.currentIndex).join('');
  }

  getDisplayText() {
    const text = this.getCurrentText();
    if (this.cursorVisible && !this.isComplete) {
      return text + this.cursorChar;
    }
    return text;
  }

  reset() {
    this.startTime = null;
    this.isRunning = false;
    this.isComplete = false;
    this.currentIndex = 0;
    this.cursorVisible = true;
    return this;
  }
}

/**
 * ScrambleReveal - Text scrambles then resolves to final text
 */
class ScrambleReveal {
  constructor(options = {}) {
    this.text = options.text ?? '';
    this.duration = options.duration ?? 1500;
    this.delay = options.delay ?? 0;
    this.scrambleChars = options.scrambleChars ?? 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    
    this.characters = this.text.split('');
    this.charCount = this.characters.length;
    
    // State
    this.startTime = null;
    this.isRunning = false;
    this.isComplete = false;
    this.currentText = '';
    
    this.onUpdate = options.onUpdate ?? null;
    this.onComplete = options.onComplete ?? null;
  }

  start(currentTime = performance.now()) {
    this.startTime = currentTime + this.delay;
    this.isRunning = true;
    this.isComplete = false;
    this.currentText = this.text.split('').map(c => c === ' ' ? ' ' : this.randomChar()).join('');
    return this;
  }

  randomChar() {
    return this.scrambleChars[Math.floor(Math.random() * this.scrambleChars.length)];
  }

  update(currentTime = performance.now()) {
    if (!this.isRunning || this.isComplete) return this;
    if (currentTime < this.startTime) return this;

    const elapsed = currentTime - this.startTime;
    const progress = Math.min(elapsed / this.duration, 1);
    
    // Characters resolve left to right
    const resolvedCount = Math.floor(progress * this.charCount);
    
    this.currentText = this.characters.map((char, i) => {
      if (char === ' ') return ' ';
      if (i < resolvedCount) return char;
      // Still scrambling
      if (Math.random() < 0.3) { // 30% chance to change each frame
        return this.randomChar();
      }
      return this.currentText[i] || this.randomChar();
    }).join('');

    if (this.onUpdate) {
      this.onUpdate(this.currentText, progress);
    }

    if (progress >= 1) {
      this.isComplete = true;
      this.isRunning = false;
      this.currentText = this.text;
      if (this.onComplete) {
        this.onComplete(this.text);
      }
    }

    return this;
  }

  getCurrentText() {
    return this.currentText;
  }

  reset() {
    this.startTime = null;
    this.isRunning = false;
    this.isComplete = false;
    this.currentText = '';
    return this;
  }
}

/**
 * GlitchReveal - Text appears with glitch effect
 */
class GlitchReveal {
  constructor(options = {}) {
    this.text = options.text ?? '';
    this.duration = options.duration ?? 800;
    this.delay = options.delay ?? 0;
    this.glitchIntensity = options.glitchIntensity ?? 1;
    
    // State
    this.startTime = null;
    this.isRunning = false;
    this.isComplete = false;
    this.offset = { x: 0, y: 0 };
    this.opacity = 0;
    this.rgbSplit = 0;
    
    this.onComplete = options.onComplete ?? null;
  }

  start(currentTime = performance.now()) {
    this.startTime = currentTime + this.delay;
    this.isRunning = true;
    this.isComplete = false;
    this.offset = { x: 0, y: 0 };
    this.opacity = 0;
    this.rgbSplit = 0;
    return this;
  }

  update(currentTime = performance.now()) {
    if (!this.isRunning || this.isComplete) return this;
    if (currentTime < this.startTime) return this;

    const elapsed = currentTime - this.startTime;
    const progress = Math.min(elapsed / this.duration, 1);
    
    // Glitch reduces over time
    const glitchFactor = (1 - progress) * this.glitchIntensity;
    
    // Random glitch offsets
    if (Math.random() < 0.3 * glitchFactor) {
      this.offset.x = (Math.random() - 0.5) * 20 * glitchFactor;
      this.offset.y = (Math.random() - 0.5) * 10 * glitchFactor;
    } else {
      this.offset.x *= 0.8;
      this.offset.y *= 0.8;
    }
    
    // RGB split effect
    this.rgbSplit = 5 * glitchFactor;
    
    // Opacity increases
    this.opacity = Math.min(progress * 2, 1);

    if (progress >= 1) {
      this.isComplete = true;
      this.isRunning = false;
      this.offset = { x: 0, y: 0 };
      this.rgbSplit = 0;
      this.opacity = 1;
      if (this.onComplete) {
        this.onComplete(this.text);
      }
    }

    return this;
  }

  reset() {
    this.startTime = null;
    this.isRunning = false;
    this.isComplete = false;
    this.offset = { x: 0, y: 0 };
    this.opacity = 0;
    this.rgbSplit = 0;
    return this;
  }
}

/**
 * Draw text with glitch effect
 */
function drawGlitchText(ctx, glitch, x, y, options = {}) {
  const {
    font = 'bold 72px Outfit, sans-serif',
    color = '#ffffff',
    align = 'center',
    baseline = 'middle',
  } = options;

  ctx.save();
  ctx.font = font;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;

  const finalX = x + glitch.offset.x;
  const finalY = y + glitch.offset.y;

  // RGB split effect (draw offset colored versions)
  if (glitch.rgbSplit > 0) {
    ctx.globalAlpha = glitch.opacity * 0.7;
    
    // Red channel (offset left)
    ctx.fillStyle = '#ff0000';
    ctx.fillText(glitch.text, finalX - glitch.rgbSplit, finalY);
    
    // Blue channel (offset right)
    ctx.fillStyle = '#0000ff';
    ctx.fillText(glitch.text, finalX + glitch.rgbSplit, finalY);
  }

  // Main text
  ctx.globalAlpha = glitch.opacity;
  ctx.fillStyle = color;
  ctx.fillText(glitch.text, finalX, finalY);

  ctx.restore();
}

// Export for use in other modules
window.TextReveal = TextReveal;
window.TypewriterReveal = TypewriterReveal;
window.ScrambleReveal = ScrambleReveal;
window.GlitchReveal = GlitchReveal;
window.drawRevealingText = drawRevealingText;
window.drawGlitchText = drawGlitchText;

