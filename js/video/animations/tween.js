// ============================================
// ChatGPT Wrapped Video - Tween & Easing Library
// ============================================

/**
 * Easing functions for smooth animations
 * All functions take t (progress 0-1) and return eased value (0-1)
 */
const Easing = {
  // Linear (no easing)
  linear: (t) => t,

  // Quad
  easeInQuad: (t) => t * t,
  easeOutQuad: (t) => t * (2 - t),
  easeInOutQuad: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),

  // Cubic
  easeInCubic: (t) => t * t * t,
  easeOutCubic: (t) => (--t) * t * t + 1,
  easeInOutCubic: (t) =>
    t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,

  // Quart
  easeInQuart: (t) => t * t * t * t,
  easeOutQuart: (t) => 1 - (--t) * t * t * t,
  easeInOutQuart: (t) =>
    t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t,

  // Quint
  easeInQuint: (t) => t * t * t * t * t,
  easeOutQuint: (t) => 1 + (--t) * t * t * t * t,
  easeInOutQuint: (t) =>
    t < 0.5 ? 16 * t * t * t * t * t : 1 + 16 * (--t) * t * t * t * t,

  // Sine
  easeInSine: (t) => 1 - Math.cos((t * Math.PI) / 2),
  easeOutSine: (t) => Math.sin((t * Math.PI) / 2),
  easeInOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,

  // Expo
  easeInExpo: (t) => (t === 0 ? 0 : Math.pow(2, 10 * t - 10)),
  easeOutExpo: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  easeInOutExpo: (t) => {
    if (t === 0) return 0;
    if (t === 1) return 1;
    if (t < 0.5) return Math.pow(2, 20 * t - 10) / 2;
    return (2 - Math.pow(2, -20 * t + 10)) / 2;
  },

  // Circ
  easeInCirc: (t) => 1 - Math.sqrt(1 - t * t),
  easeOutCirc: (t) => Math.sqrt(1 - (--t) * t),
  easeInOutCirc: (t) =>
    t < 0.5
      ? (1 - Math.sqrt(1 - 4 * t * t)) / 2
      : (Math.sqrt(1 - Math.pow(-2 * t + 2, 2)) + 1) / 2,

  // Back (overshoots)
  easeInBack: (t) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return c3 * t * t * t - c1 * t * t;
  },
  easeOutBack: (t) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  easeInOutBack: (t) => {
    const c1 = 1.70158;
    const c2 = c1 * 1.525;
    return t < 0.5
      ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
      : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2;
  },

  // Elastic
  easeInElastic: (t) => {
    if (t === 0) return 0;
    if (t === 1) return 1;
    const c4 = (2 * Math.PI) / 3;
    return -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * c4);
  },
  easeOutElastic: (t) => {
    if (t === 0) return 0;
    if (t === 1) return 1;
    const c4 = (2 * Math.PI) / 3;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  },
  easeInOutElastic: (t) => {
    if (t === 0) return 0;
    if (t === 1) return 1;
    const c5 = (2 * Math.PI) / 4.5;
    return t < 0.5
      ? -(Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * c5)) / 2
      : (Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * c5)) / 2 + 1;
  },

  // Bounce
  easeInBounce: (t) => 1 - Easing.easeOutBounce(1 - t),
  easeOutBounce: (t) => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) {
      return n1 * t * t;
    } else if (t < 2 / d1) {
      return n1 * (t -= 1.5 / d1) * t + 0.75;
    } else if (t < 2.5 / d1) {
      return n1 * (t -= 2.25 / d1) * t + 0.9375;
    } else {
      return n1 * (t -= 2.625 / d1) * t + 0.984375;
    }
  },
  easeInOutBounce: (t) =>
    t < 0.5
      ? (1 - Easing.easeOutBounce(1 - 2 * t)) / 2
      : (1 + Easing.easeOutBounce(2 * t - 1)) / 2,
};

/**
 * Tween class for animating values over time
 */
class Tween {
  constructor(options = {}) {
    this.from = options.from ?? 0;
    this.to = options.to ?? 1;
    this.duration = options.duration ?? 1000; // ms
    this.easing = options.easing ?? Easing.easeOutCubic;
    this.onUpdate = options.onUpdate ?? null;
    this.onComplete = options.onComplete ?? null;
    this.delay = options.delay ?? 0;

    this.startTime = null;
    this.isRunning = false;
    this.isComplete = false;
    this.currentValue = this.from;
  }

  /**
   * Start the tween
   * @param {number} currentTime - Current timestamp in ms
   */
  start(currentTime) {
    this.startTime = currentTime + this.delay;
    this.isRunning = true;
    this.isComplete = false;
    this.currentValue = this.from;
    return this;
  }

  /**
   * Update the tween
   * @param {number} currentTime - Current timestamp in ms
   * @returns {number} Current interpolated value
   */
  update(currentTime) {
    if (!this.isRunning || this.isComplete) {
      return this.currentValue;
    }

    // Still in delay period
    if (currentTime < this.startTime) {
      return this.from;
    }

    const elapsed = currentTime - this.startTime;
    let progress = Math.min(elapsed / this.duration, 1);
    const easedProgress = this.easing(progress);

    this.currentValue = this.from + (this.to - this.from) * easedProgress;

    if (this.onUpdate) {
      this.onUpdate(this.currentValue, progress);
    }

    if (progress >= 1) {
      this.isComplete = true;
      this.isRunning = false;
      if (this.onComplete) {
        this.onComplete();
      }
    }

    return this.currentValue;
  }

  /**
   * Get current value without updating
   */
  getValue() {
    return this.currentValue;
  }

  /**
   * Reset tween to initial state
   */
  reset() {
    this.startTime = null;
    this.isRunning = false;
    this.isComplete = false;
    this.currentValue = this.from;
    return this;
  }
}

/**
 * TweenGroup - Manages multiple tweens
 */
class TweenGroup {
  constructor() {
    this.tweens = [];
  }

  /**
   * Add a tween to the group
   */
  add(tween) {
    this.tweens.push(tween);
    return tween;
  }

  /**
   * Create and add a new tween
   */
  create(options) {
    const tween = new Tween(options);
    this.tweens.push(tween);
    return tween;
  }

  /**
   * Start all tweens
   */
  startAll(currentTime) {
    this.tweens.forEach((t) => t.start(currentTime));
    return this;
  }

  /**
   * Update all tweens
   */
  updateAll(currentTime) {
    this.tweens.forEach((t) => t.update(currentTime));
    return this;
  }

  /**
   * Check if all tweens are complete
   */
  isAllComplete() {
    return this.tweens.every((t) => t.isComplete);
  }

  /**
   * Reset all tweens
   */
  resetAll() {
    this.tweens.forEach((t) => t.reset());
    return this;
  }

  /**
   * Clear all tweens
   */
  clear() {
    this.tweens = [];
    return this;
  }
}

/**
 * Utility: Interpolate between two values
 */
function lerp(start, end, t) {
  return start + (end - start) * t;
}

/**
 * Utility: Interpolate between colors (hex strings)
 */
function lerpColor(color1, color2, t) {
  const r1 = parseInt(color1.slice(1, 3), 16);
  const g1 = parseInt(color1.slice(3, 5), 16);
  const b1 = parseInt(color1.slice(5, 7), 16);

  const r2 = parseInt(color2.slice(1, 3), 16);
  const g2 = parseInt(color2.slice(3, 5), 16);
  const b2 = parseInt(color2.slice(5, 7), 16);

  const r = Math.round(lerp(r1, r2, t));
  const g = Math.round(lerp(g1, g2, t));
  const b = Math.round(lerp(b1, b2, t));

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Utility: Clamp value between min and max
 */
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Utility: Map value from one range to another
 */
function mapRange(value, inMin, inMax, outMin, outMax) {
  return ((value - inMin) / (inMax - inMin)) * (outMax - outMin) + outMin;
}

// Export for use in other modules
window.VideoTween = {
  Easing,
  Tween,
  TweenGroup,
  lerp,
  lerpColor,
  clamp,
  mapRange,
};

