// ============================================
// ChatGPT Wrapped Video - Scene Transitions
// ============================================
// Handles transitions between scenes

/**
 * TransitionManager - Manages transitions between scenes
 */
class TransitionManager {
  constructor(options = {}) {
    this.duration = options.duration ?? 300; // Default transition duration (ms)
    this.defaultType = options.defaultType ?? 'fade';
    
    // Canvas dimensions
    this.width = options.width ?? 1080;
    this.height = options.height ?? 1920;
    
    // Transition state
    this.isTransitioning = false;
    this.currentTransition = null;
    this.transitionStartTime = 0;
    this.transitionProgress = 0;
    
    // Scenes involved in transition
    this.outgoingScene = null;
    this.incomingScene = null;
    
    // Offscreen canvases for complex transitions
    this.outgoingCanvas = null;
    this.incomingCanvas = null;
    
    // Available transition types
    this.transitions = {
      fade: new FadeTransition(),
      crossfade: new CrossfadeTransition(),
      slideLeft: new SlideTransition('left'),
      slideRight: new SlideTransition('right'),
      slideUp: new SlideTransition('up'),
      slideDown: new SlideTransition('down'),
      zoom: new ZoomTransition(),
      wipe: new WipeTransition(),
    };
  }

  /**
   * Set canvas dimensions
   */
  setDimensions(width, height) {
    this.width = width;
    this.height = height;
    
    // Update offscreen canvases if they exist
    if (this.outgoingCanvas) {
      this.outgoingCanvas.width = width;
      this.outgoingCanvas.height = height;
    }
    if (this.incomingCanvas) {
      this.incomingCanvas.width = width;
      this.incomingCanvas.height = height;
    }
  }

  /**
   * Start a transition between two scenes
   * @param {SceneBase} outgoingScene - Scene that's leaving
   * @param {SceneBase} incomingScene - Scene that's entering
   * @param {string} type - Transition type
   * @param {number} duration - Transition duration (ms)
   */
  start(outgoingScene, incomingScene, type = null, duration = null) {
    this.outgoingScene = outgoingScene;
    this.incomingScene = incomingScene;
    this.currentTransition = this.transitions[type ?? this.defaultType] ?? this.transitions.fade;
    this.duration = duration ?? this.duration;
    
    this.isTransitioning = true;
    this.transitionStartTime = performance.now();
    this.transitionProgress = 0;
    
    // Notify scenes
    if (outgoingScene) {
      outgoingScene.transitionOut = { active: true, progress: 0, type };
    }
    if (incomingScene) {
      incomingScene.transitionIn = { active: true, progress: 0, type };
    }
    
    // Initialize transition
    this.currentTransition.init?.(this);
  }

  /**
   * Update transition state
   * @param {number} currentTime - Current timestamp
   * @returns {boolean} True if transition is complete
   */
  update(currentTime) {
    if (!this.isTransitioning) return true;
    
    const elapsed = currentTime - this.transitionStartTime;
    this.transitionProgress = Math.min(elapsed / this.duration, 1);
    
    // Apply easing
    const Easing = window.VideoTween?.Easing;
    const easedProgress = Easing ? Easing.easeInOutCubic(this.transitionProgress) : this.transitionProgress;
    
    // Update scene transition states
    if (this.outgoingScene) {
      this.outgoingScene.transitionOut.progress = easedProgress;
    }
    if (this.incomingScene) {
      this.incomingScene.transitionIn.progress = easedProgress;
    }
    
    // Check if complete
    if (this.transitionProgress >= 1) {
      this.complete();
      return true;
    }
    
    return false;
  }

  /**
   * Render the transition
   * @param {CanvasRenderingContext2D} ctx - Main canvas context
   * @param {Function} renderOutgoing - Function to render outgoing scene
   * @param {Function} renderIncoming - Function to render incoming scene
   */
  render(ctx, renderOutgoing, renderIncoming) {
    if (!this.isTransitioning || !this.currentTransition) {
      // No transition, just render incoming
      if (renderIncoming) renderIncoming(ctx);
      return;
    }
    
    const Easing = window.VideoTween?.Easing;
    const easedProgress = Easing ? Easing.easeInOutCubic(this.transitionProgress) : this.transitionProgress;
    
    this.currentTransition.render(ctx, {
      progress: easedProgress,
      width: this.width,
      height: this.height,
      renderOutgoing,
      renderIncoming,
    });
  }

  /**
   * Complete the transition
   */
  complete() {
    // Reset scene transition states
    if (this.outgoingScene) {
      this.outgoingScene.transitionOut = { active: false, progress: 0, type: null };
    }
    if (this.incomingScene) {
      this.incomingScene.transitionIn = { active: false, progress: 0, type: null };
    }
    
    this.isTransitioning = false;
    this.currentTransition = null;
    this.outgoingScene = null;
    this.incomingScene = null;
  }

  /**
   * Cancel current transition
   */
  cancel() {
    this.complete();
  }
}

/**
 * Base Transition class
 */
class BaseTransition {
  constructor() {
    this.name = 'base';
  }
  
  init(manager) {
    // Override in subclasses
  }
  
  render(ctx, options) {
    // Override in subclasses
  }
}

/**
 * Fade Transition - Simple opacity fade
 */
class FadeTransition extends BaseTransition {
  constructor() {
    super();
    this.name = 'fade';
  }
  
  render(ctx, { progress, renderOutgoing, renderIncoming }) {
    ctx.save();
    
    // Render outgoing with decreasing opacity
    if (renderOutgoing && progress < 1) {
      ctx.globalAlpha = 1 - progress;
      renderOutgoing(ctx);
    }
    
    // Render incoming with increasing opacity
    if (renderIncoming && progress > 0) {
      ctx.globalAlpha = progress;
      renderIncoming(ctx);
    }
    
    ctx.restore();
  }
}

/**
 * Crossfade Transition - Both scenes visible during transition
 */
class CrossfadeTransition extends BaseTransition {
  constructor() {
    super();
    this.name = 'crossfade';
  }
  
  render(ctx, { progress, renderOutgoing, renderIncoming }) {
    ctx.save();
    
    // Render incoming first (behind)
    if (renderIncoming) {
      ctx.globalAlpha = progress;
      renderIncoming(ctx);
    }
    
    // Render outgoing on top with decreasing opacity
    if (renderOutgoing) {
      ctx.globalAlpha = 1 - progress;
      renderOutgoing(ctx);
    }
    
    ctx.restore();
  }
}

/**
 * Slide Transition - Scene slides in from direction
 */
class SlideTransition extends BaseTransition {
  constructor(direction = 'left') {
    super();
    this.name = `slide-${direction}`;
    this.direction = direction;
  }
  
  render(ctx, { progress, width, height, renderOutgoing, renderIncoming }) {
    ctx.save();
    
    let outX = 0, outY = 0, inX = 0, inY = 0;
    
    switch (this.direction) {
      case 'left':
        outX = -width * progress;
        inX = width * (1 - progress);
        break;
      case 'right':
        outX = width * progress;
        inX = -width * (1 - progress);
        break;
      case 'up':
        outY = -height * progress;
        inY = height * (1 - progress);
        break;
      case 'down':
        outY = height * progress;
        inY = -height * (1 - progress);
        break;
    }
    
    // Render outgoing (sliding out)
    if (renderOutgoing) {
      ctx.save();
      ctx.translate(outX, outY);
      renderOutgoing(ctx);
      ctx.restore();
    }
    
    // Render incoming (sliding in)
    if (renderIncoming) {
      ctx.save();
      ctx.translate(inX, inY);
      renderIncoming(ctx);
      ctx.restore();
    }
    
    ctx.restore();
  }
}

/**
 * Zoom Transition - Outgoing zooms out, incoming zooms in
 */
class ZoomTransition extends BaseTransition {
  constructor() {
    super();
    this.name = 'zoom';
  }
  
  render(ctx, { progress, width, height, renderOutgoing, renderIncoming }) {
    const centerX = width / 2;
    const centerY = height / 2;
    
    ctx.save();
    
    // Render incoming (scaling up from center)
    if (renderIncoming && progress > 0) {
      ctx.save();
      const inScale = 0.8 + (0.2 * progress); // Scale from 0.8 to 1.0
      ctx.globalAlpha = progress;
      ctx.translate(centerX, centerY);
      ctx.scale(inScale, inScale);
      ctx.translate(-centerX, -centerY);
      renderIncoming(ctx);
      ctx.restore();
    }
    
    // Render outgoing (scaling up and fading out)
    if (renderOutgoing && progress < 1) {
      ctx.save();
      const outScale = 1 + (0.2 * progress); // Scale from 1.0 to 1.2
      ctx.globalAlpha = 1 - progress;
      ctx.translate(centerX, centerY);
      ctx.scale(outScale, outScale);
      ctx.translate(-centerX, -centerY);
      renderOutgoing(ctx);
      ctx.restore();
    }
    
    ctx.restore();
  }
}

/**
 * Wipe Transition - Horizontal wipe reveal
 */
class WipeTransition extends BaseTransition {
  constructor() {
    super();
    this.name = 'wipe';
  }
  
  render(ctx, { progress, width, height, renderOutgoing, renderIncoming }) {
    const wipeX = width * progress;
    
    ctx.save();
    
    // Render outgoing (clipped to right side)
    if (renderOutgoing) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(wipeX, 0, width - wipeX, height);
      ctx.clip();
      renderOutgoing(ctx);
      ctx.restore();
    }
    
    // Render incoming (clipped to left side)
    if (renderIncoming) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, wipeX, height);
      ctx.clip();
      renderIncoming(ctx);
      ctx.restore();
    }
    
    ctx.restore();
  }
}

// Export for use in other modules
window.TransitionManager = TransitionManager;
window.Transitions = {
  Base: BaseTransition,
  Fade: FadeTransition,
  Crossfade: CrossfadeTransition,
  Slide: SlideTransition,
  Zoom: ZoomTransition,
  Wipe: WipeTransition,
};

