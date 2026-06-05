// ============================================
// ChatGPT Wrapped Video - Counter Animation
// ============================================
// Animated number counting with various effects

/**
 * CounterAnimation - Animates numbers counting up/down
 */
class CounterAnimation {
  constructor(options = {}) {
    this.from = options.from ?? 0;
    this.to = options.to ?? 100;
    this.duration = options.duration ?? 1500; // ms
    this.delay = options.delay ?? 0;
    this.easing = options.easing ?? 'easeOutCubic';
    
    // Formatting options
    this.format = options.format ?? true; // Add commas
    this.decimals = options.decimals ?? 0;
    this.prefix = options.prefix ?? '';
    this.suffix = options.suffix ?? '';
    
    // State
    this.startTime = null;
    this.isRunning = false;
    this.isComplete = false;
    this.currentValue = this.from;
    this.displayValue = this.formatValue(this.from);
    
    // Callbacks
    this.onUpdate = options.onUpdate ?? null;
    this.onComplete = options.onComplete ?? null;
  }

  /**
   * Start the counter animation
   * @param {number} currentTime - Current timestamp
   */
  start(currentTime = performance.now()) {
    this.startTime = currentTime + this.delay;
    this.isRunning = true;
    this.isComplete = false;
    this.currentValue = this.from;
    this.displayValue = this.formatValue(this.from);
    return this;
  }

  /**
   * Update the counter
   * @param {number} currentTime - Current timestamp
   * @returns {string} Formatted display value
   */
  update(currentTime = performance.now()) {
    if (!this.isRunning || this.isComplete) {
      return this.displayValue;
    }

    // Still in delay period
    if (currentTime < this.startTime) {
      return this.displayValue;
    }

    const elapsed = currentTime - this.startTime;
    let progress = Math.min(elapsed / this.duration, 1);
    
    // Apply easing
    const Easing = window.VideoTween?.Easing;
    if (Easing && Easing[this.easing]) {
      progress = Easing[this.easing](progress);
    }

    // Calculate current value
    this.currentValue = this.from + (this.to - this.from) * progress;
    this.displayValue = this.formatValue(this.currentValue);

    // Callback
    if (this.onUpdate) {
      this.onUpdate(this.currentValue, this.displayValue, progress);
    }

    // Check completion
    if (progress >= 1) {
      this.isComplete = true;
      this.isRunning = false;
      this.currentValue = this.to;
      this.displayValue = this.formatValue(this.to);
      
      if (this.onComplete) {
        this.onComplete(this.to, this.displayValue);
      }
    }

    return this.displayValue;
  }

  /**
   * Format the value for display
   */
  formatValue(value) {
    let num = this.decimals > 0 
      ? value.toFixed(this.decimals)
      : Math.round(value);
    
    if (this.format && this.decimals === 0) {
      num = Number(num).toLocaleString();
    }
    
    return `${this.prefix}${num}${this.suffix}`;
  }

  /**
   * Get raw numeric value
   */
  getValue() {
    return this.currentValue;
  }

  /**
   * Get formatted display value
   */
  getDisplayValue() {
    return this.displayValue;
  }

  /**
   * Reset the counter
   */
  reset() {
    this.startTime = null;
    this.isRunning = false;
    this.isComplete = false;
    this.currentValue = this.from;
    this.displayValue = this.formatValue(this.from);
    return this;
  }

  /**
   * Set new target value (for dynamic updates)
   */
  setTarget(to) {
    this.to = to;
    return this;
  }
}

/**
 * MultiCounter - Manages multiple counters with staggered starts
 */
class MultiCounter {
  constructor() {
    this.counters = [];
  }

  /**
   * Add a counter
   */
  add(options) {
    const counter = new CounterAnimation(options);
    this.counters.push(counter);
    return counter;
  }

  /**
   * Create counters with staggered delays
   */
  createStaggered(items, baseDelay = 0, stagger = 200) {
    return items.map((item, index) => {
      const options = typeof item === 'number' 
        ? { to: item, delay: baseDelay + (index * stagger) }
        : { ...item, delay: (item.delay ?? baseDelay) + (index * stagger) };
      return this.add(options);
    });
  }

  /**
   * Start all counters
   */
  startAll(currentTime = performance.now()) {
    this.counters.forEach(c => c.start(currentTime));
    return this;
  }

  /**
   * Update all counters
   */
  updateAll(currentTime = performance.now()) {
    this.counters.forEach(c => c.update(currentTime));
    return this;
  }

  /**
   * Check if all counters are complete
   */
  isAllComplete() {
    return this.counters.every(c => c.isComplete);
  }

  /**
   * Reset all counters
   */
  resetAll() {
    this.counters.forEach(c => c.reset());
    return this;
  }

  /**
   * Clear all counters
   */
  clear() {
    this.counters = [];
    return this;
  }
}

/**
 * Draw a counting number to canvas with effects
 */
function drawCountingNumber(ctx, counter, x, y, options = {}) {
  const {
    font = 'bold 144px Outfit, sans-serif',
    color = '#ffffff',
    glowColor = 'rgba(16, 163, 127, 0.4)',
    glowBlur = 30,
    align = 'center',
    baseline = 'middle',
    scale = 1,
    opacity = 1,
  } = options;

  const displayValue = counter.getDisplayValue();
  
  ctx.save();
  
  // Position and scale
  ctx.translate(x, y);
  if (scale !== 1) {
    ctx.scale(scale, scale);
  }
  ctx.translate(-x, -y);
  
  // Text settings
  ctx.font = font;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  ctx.globalAlpha = opacity;
  
  // Glow effect
  if (glowBlur > 0) {
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = glowBlur;
  }
  
  ctx.fillStyle = color;
  ctx.fillText(displayValue, x, y);
  
  // Sharp text on top (no shadow)
  ctx.shadowBlur = 0;
  ctx.fillText(displayValue, x, y);
  
  ctx.restore();
}

/**
 * Create a "slot machine" style counter that spins digits
 */
class SlotCounter {
  constructor(options = {}) {
    this.target = options.target ?? 0;
    this.duration = options.duration ?? 2000;
    this.delay = options.delay ?? 0;
    this.digitDelay = options.digitDelay ?? 100; // Stagger per digit
    
    this.startTime = null;
    this.isRunning = false;
    this.isComplete = false;
    
    // Parse target into digits
    this.targetDigits = this.target.toString().split('').map(d => d === ',' ? ',' : parseInt(d));
    this.currentDigits = this.targetDigits.map(d => d === ',' ? ',' : 0);
    
    this.onComplete = options.onComplete ?? null;
  }

  start(currentTime = performance.now()) {
    this.startTime = currentTime + this.delay;
    this.isRunning = true;
    this.isComplete = false;
    this.currentDigits = this.targetDigits.map(d => d === ',' ? ',' : 0);
    return this;
  }

  update(currentTime = performance.now()) {
    if (!this.isRunning || this.isComplete) return this.currentDigits;
    if (currentTime < this.startTime) return this.currentDigits;

    const elapsed = currentTime - this.startTime;
    const Easing = window.VideoTween?.Easing;

    // Update each digit with stagger
    let allComplete = true;
    this.currentDigits = this.targetDigits.map((target, index) => {
      if (target === ',') return ',';
      
      const digitStart = index * this.digitDelay;
      const digitElapsed = Math.max(0, elapsed - digitStart);
      let progress = Math.min(digitElapsed / this.duration, 1);
      
      if (Easing?.easeOutCubic) {
        progress = Easing.easeOutCubic(progress);
      }
      
      if (progress < 1) allComplete = false;
      
      // Spin through digits before landing
      const spins = 2; // Number of full rotations
      const totalProgress = progress * (spins * 10 + target);
      return Math.floor(totalProgress) % 10;
    });

    if (allComplete) {
      this.isComplete = true;
      this.isRunning = false;
      this.currentDigits = this.targetDigits;
      if (this.onComplete) this.onComplete();
    }

    return this.currentDigits;
  }

  getDisplayValue() {
    return this.currentDigits.join('');
  }

  reset() {
    this.startTime = null;
    this.isRunning = false;
    this.isComplete = false;
    this.currentDigits = this.targetDigits.map(d => d === ',' ? ',' : 0);
    return this;
  }
}

// Export for use in other modules
window.CounterAnimation = CounterAnimation;
window.MultiCounter = MultiCounter;
window.SlotCounter = SlotCounter;
window.drawCountingNumber = drawCountingNumber;

