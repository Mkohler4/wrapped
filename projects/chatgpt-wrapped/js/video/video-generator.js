// ============================================
// ChatGPT Wrapped Video - Main Generator
// ============================================
// Orchestrates scenes, timing, and video export

/**
 * VideoGenerator - Main orchestrator for video creation
 */
class VideoGenerator {
  constructor(options = {}) {
    // Format presets
    this.formats = {
      portrait: { width: 1080, height: 1920, label: '9:16 Portrait' },
      square: { width: 1080, height: 1080, label: '1:1 Square' },
    };

    // Duration presets (ms)
    this.durations = {
      short: 30000,  // 30 seconds
      medium: 45000, // 45 seconds
      long: 60000,   // 60 seconds
    };

    // Current settings
    this.format = options.format ?? 'portrait';
    this.duration = options.duration ?? 'short';
    this.fps = options.fps ?? 30;

    // Core components
    this.renderer = null;
    this.transitionManager = null;
    this.scenes = [];
    this.currentSceneIndex = 0;
    this.previousSceneIndex = -1;
    this.sceneStartTime = 0;

    // Data from ChatGPT analysis
    this.stats = null;
    this.identityData = null;
    this.timePersonalityData = null;

    // State
    this.isInitialized = false;
    this.isGenerating = false;
    this.videoBlob = null;

    // Transition settings
    this.transitionDuration = options.transitionDuration ?? 400; // ms
    this.transitionType = options.transitionType ?? 'fade'; // fade, crossfade, slideLeft, etc.

    // Callbacks
    this.onProgress = options.onProgress ?? null;
    this.onComplete = options.onComplete ?? null;
    this.onError = options.onError ?? null;
    this.onSceneChange = options.onSceneChange ?? null;

    // Timeline (populated when scenes are built)
    this.timeline = [];
  }

  /**
   * Initialize the generator with data
   * @param {Object} data - { stats, identityData, timePersonalityData }
   */
  init(data = {}) {
    // Get data from global state or provided data
    this.stats = data.stats ?? window.stats ?? null;
    this.identityData = data.identityData ?? window.identityData ?? null;
    this.timePersonalityData = data.timePersonalityData ?? window.timePersonalityData ?? null;

    // Create renderer
    const formatConfig = this.formats[this.format];
    this.renderer = new VideoRenderer({
      width: formatConfig.width,
      height: formatConfig.height,
      fps: this.fps,
      duration: this.durations[this.duration],
      onFrame: (ctx, time, deltaTime) => this.onFrame(ctx, time, deltaTime),
      onProgress: (progress) => this.handleProgress(progress),
      onComplete: (blob) => this.handleComplete(blob),
      onError: (error) => this.handleError(error),
    });

    // Create transition manager
    this.transitionManager = new TransitionManager({
      width: formatConfig.width,
      height: formatConfig.height,
      duration: this.transitionDuration,
      defaultType: this.transitionType,
    });

    // Build scene timeline
    this.buildTimeline();

    this.isInitialized = true;
    return this;
  }

  /**
   * Set video format
   * @param {'portrait' | 'square'} format
   */
  setFormat(format) {
    if (!this.formats[format]) {
      console.warn(`Unknown format: ${format}`);
      return this;
    }
    this.format = format;

    if (this.renderer) {
      const config = this.formats[format];
      this.renderer.setDimensions(config.width, config.height);
      
      // Update transition manager dimensions
      if (this.transitionManager) {
        this.transitionManager.setDimensions(config.width, config.height);
      }
      
      // Update scene dimensions
      this.scenes.forEach(scene => {
        if (scene.width !== undefined) scene.width = config.width;
        if (scene.height !== undefined) scene.height = config.height;
      });
    }

    return this;
  }

  /**
   * Set video duration
   * @param {'short' | 'medium' | 'long'} duration
   */
  setDuration(duration) {
    if (!this.durations[duration]) {
      console.warn(`Unknown duration: ${duration}`);
      return this;
    }
    this.duration = duration;

    if (this.renderer) {
      this.renderer.duration = this.durations[duration];
    }

    // Rebuild timeline for new duration
    if (this.isInitialized) {
      this.buildTimeline();
    }

    return this;
  }

  /**
   * Build the scene timeline based on duration
   */
  buildTimeline() {
    const totalDuration = this.durations[this.duration];
    this.scenes = [];
    this.timeline = [];

    // Calculate scene durations proportionally
    // Scene weight determines relative duration
    const sceneWeights = [
      { id: 'intro', weight: 1.0 },       // Title
      { id: 'conversations', weight: 1.2 }, // Conversations count
      { id: 'messages', weight: 1.2 },    // Messages count
      { id: 'topics', weight: 1.3 },      // Top topics
      { id: 'personality', weight: 1.3 }, // Identity/personality
      { id: 'journey', weight: 1.3 },     // Peak month/evolution
      { id: 'achievements', weight: 1.2 }, // Badges
      { id: 'outro', weight: 0.8 },       // Outro
    ];

    const totalWeight = sceneWeights.reduce((sum, s) => sum + s.weight, 0);
    let currentTime = 0;

    for (const sceneConfig of sceneWeights) {
      const sceneDuration = (sceneConfig.weight / totalWeight) * totalDuration;
      
      this.timeline.push({
        id: sceneConfig.id,
        startTime: currentTime,
        duration: sceneDuration,
        endTime: currentTime + sceneDuration,
      });

      currentTime += sceneDuration;
    }

    // Initialize scene instances (will be populated by scene files)
    this.initializeScenes();

    return this;
  }

  /**
   * Initialize scene instances
   * This creates placeholder scenes - actual scenes are loaded from scene files
   */
  initializeScenes() {
    this.scenes = this.timeline.map((timelineEntry) => {
      // Check if scene class exists
      const sceneClassName = `Scene${this.capitalize(timelineEntry.id)}`;
      const SceneClass = window[sceneClassName];

      if (SceneClass) {
        return new SceneClass({
          renderer: this.renderer,
          stats: this.stats,
          identityData: this.identityData,
          timePersonalityData: this.timePersonalityData,
          timeline: timelineEntry,
        });
      }

      // Return placeholder scene if class not found
      return {
        id: timelineEntry.id,
        timeline: timelineEntry,
        enter: () => {},
        update: () => {},
        render: (ctx) => this.renderPlaceholderScene(ctx, timelineEntry.id),
        exit: () => {},
      };
    });
  }

  /**
   * Render placeholder scene (for scenes not yet implemented)
   */
  renderPlaceholderScene(ctx, sceneId) {
    const { width, height } = this.renderer;

    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`Scene: ${sceneId}`, width / 2, height / 2);
    ctx.font = '24px Outfit, sans-serif';
    ctx.fillStyle = '#888888';
    ctx.fillText('(Coming soon)', width / 2, height / 2 + 60);
    ctx.restore();
  }

  /**
   * Capitalize first letter
   */
  capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Get canvas element for preview
   */
  getCanvas() {
    if (!this.renderer) {
      this.init();
    }
    return this.renderer.createCanvas();
  }

  /**
   * Attach to existing canvas
   */
  attachToCanvas(canvas) {
    if (!this.renderer) {
      this.init();
    }
    this.renderer.init(canvas);
    return this;
  }

  /**
   * Start preview (no recording)
   */
  startPreview() {
    if (!this.isInitialized) {
      this.init();
    }

    this.currentSceneIndex = 0;
    this.sceneStartTime = 0;
    this.enterCurrentScene();
    this.renderer.startPreview();

    return this;
  }

  /**
   * Start recording video
   */
  startRecording() {
    if (!this.isInitialized) {
      this.init();
    }

    if (!this.renderer.isRecordingSupported()) {
      this.handleError(new Error('Video recording is not supported in this browser. Please use Chrome, Firefox, or Edge.'));
      return this;
    }

    this.isGenerating = true;
    this.currentSceneIndex = 0;
    this.sceneStartTime = 0;
    this.enterCurrentScene();
    this.renderer.startRecording();

    return this;
  }

  /**
   * Stop preview or recording
   */
  stop() {
    this.renderer?.stop();
    this.isGenerating = false;
    return this;
  }

  /**
   * Reset generator
   */
  reset() {
    this.renderer?.reset();
    this.transitionManager?.cancel();
    this.currentSceneIndex = 0;
    this.previousSceneIndex = -1;
    this.sceneStartTime = 0;
    this.isGenerating = false;
    this.videoBlob = null;
    
    // Reset all scenes
    this.scenes.forEach(scene => {
      if (scene?.exit) scene.exit();
    });
    
    return this;
  }

  /**
   * Frame callback - called each frame by renderer
   */
  onFrame(ctx, time, deltaTime) {
    // Find current scene based on time
    const newSceneIndex = this.getSceneIndexForTime(time);

    // Scene transition triggered
    if (newSceneIndex !== this.currentSceneIndex) {
      this.previousSceneIndex = this.currentSceneIndex;
      this.currentSceneIndex = newSceneIndex;
      this.sceneStartTime = time;
      
      // Start transition between scenes
      const outgoingScene = this.scenes[this.previousSceneIndex];
      const incomingScene = this.scenes[this.currentSceneIndex];
      
      // Exit outgoing scene
      if (outgoingScene?.exit) {
        outgoingScene.exit();
      }
      
      // Enter incoming scene
      if (incomingScene?.enter) {
        incomingScene.enter();
      }
      
      // Start transition
      this.transitionManager?.start(
        outgoingScene,
        incomingScene,
        this.getTransitionForScene(this.currentSceneIndex),
        this.transitionDuration
      );
      
      // Notify callback
      if (this.onSceneChange) {
        this.onSceneChange(this.currentSceneIndex, this.timeline[this.currentSceneIndex]);
      }
    }

    // Update transition
    const isTransitioning = this.transitionManager?.isTransitioning;
    if (isTransitioning) {
      this.transitionManager.update(performance.now());
    }

    // Get current scene info
    const currentScene = this.scenes[this.currentSceneIndex];
    const sceneTime = time - this.sceneStartTime;
    const sceneDuration = this.timeline[this.currentSceneIndex]?.duration ?? 0;
    const sceneProgress = sceneDuration > 0 ? sceneTime / sceneDuration : 0;

    // Update current scene
    if (currentScene?.update) {
      currentScene.update(sceneTime, deltaTime, sceneProgress);
    }

    // Render with or without transition
    if (isTransitioning && this.transitionManager) {
      // Get previous scene info for transition
      const prevScene = this.scenes[this.previousSceneIndex];
      const prevSceneTime = time - (this.timeline[this.previousSceneIndex]?.startTime ?? 0);
      const prevSceneDuration = this.timeline[this.previousSceneIndex]?.duration ?? 0;
      const prevSceneProgress = prevSceneDuration > 0 ? prevSceneTime / prevSceneDuration : 1;

      this.transitionManager.render(
        ctx,
        // Render outgoing scene
        (transitionCtx) => {
          if (prevScene?.render) {
            prevScene.render(transitionCtx, prevSceneTime, prevSceneProgress);
          }
        },
        // Render incoming scene
        (transitionCtx) => {
          if (currentScene?.render) {
            currentScene.render(transitionCtx, sceneTime, sceneProgress);
          }
        }
      );
    } else {
      // No transition, just render current scene
      if (currentScene?.render) {
        currentScene.render(ctx, sceneTime, sceneProgress);
      }
    }
  }

  /**
   * Get transition type for a specific scene
   * Can be customized per scene
   */
  getTransitionForScene(sceneIndex) {
    // Scene-specific transitions (can be customized)
    const sceneTransitions = {
      0: 'fade',      // intro
      1: 'fade',      // conversations  
      2: 'fade',      // messages
      3: 'fade',      // topics
      4: 'crossfade', // personality
      5: 'fade',      // journey
      6: 'zoom',      // achievements
      7: 'fade',      // outro
    };
    
    return sceneTransitions[sceneIndex] ?? this.transitionType;
  }

  /**
   * Get scene index for current time
   */
  getSceneIndexForTime(time) {
    for (let i = this.timeline.length - 1; i >= 0; i--) {
      if (time >= this.timeline[i].startTime) {
        return i;
      }
    }
    return 0;
  }

  /**
   * Enter current scene (for initial scene only)
   */
  enterCurrentScene() {
    const scene = this.scenes[this.currentSceneIndex];
    if (scene?.enter) {
      scene.enter();
    }

    if (this.onSceneChange) {
      this.onSceneChange(this.currentSceneIndex, this.timeline[this.currentSceneIndex]);
    }
  }

  /**
   * Exit current scene
   */
  exitCurrentScene() {
    const scene = this.scenes[this.currentSceneIndex];
    if (scene?.exit) {
      scene.exit();
    }
  }

  /**
   * Set transition settings
   * @param {string} type - Transition type (fade, crossfade, slideLeft, etc.)
   * @param {number} duration - Transition duration in ms
   */
  setTransition(type, duration = null) {
    this.transitionType = type;
    if (duration !== null) {
      this.transitionDuration = duration;
    }
    
    if (this.transitionManager) {
      this.transitionManager.defaultType = type;
      if (duration !== null) {
        this.transitionManager.duration = duration;
      }
    }
    
    return this;
  }

  /**
   * Get available transition types
   */
  getTransitionTypes() {
    return ['fade', 'crossfade', 'slideLeft', 'slideRight', 'slideUp', 'slideDown', 'zoom', 'wipe'];
  }

  /**
   * Handle progress updates
   */
  handleProgress(progress) {
    if (this.onProgress) {
      this.onProgress(progress);
    }
  }

  /**
   * Handle recording complete
   */
  handleComplete(blob) {
    this.videoBlob = blob;
    this.isGenerating = false;

    if (this.onComplete) {
      this.onComplete(blob);
    }
  }

  /**
   * Handle errors
   */
  handleError(error) {
    this.isGenerating = false;
    console.error('VideoGenerator error:', error);

    if (this.onError) {
      this.onError(error);
    }
  }

  /**
   * Download the generated video
   */
  downloadVideo(filename) {
    if (!this.videoBlob) {
      console.warn('No video to download');
      return;
    }

    const timestamp = new Date().toISOString().slice(0, 10);
    const defaultFilename = `chatgpt-wrapped-${timestamp}.webm`;
    this.renderer.downloadVideo(this.videoBlob, filename ?? defaultFilename);
  }

  /**
   * Get video blob URL for preview
   */
  getVideoBlobUrl() {
    if (!this.videoBlob) return null;
    return URL.createObjectURL(this.videoBlob);
  }

  /**
   * Get video file size
   */
  getVideoSize() {
    if (!this.videoBlob) return 0;
    return this.videoBlob.size;
  }

  /**
   * Get formatted video file size
   */
  getFormattedVideoSize() {
    const bytes = this.getVideoSize();
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Check if recording is supported
   */
  isSupported() {
    return typeof MediaRecorder !== 'undefined' && 
           typeof HTMLCanvasElement.prototype.captureStream === 'function';
  }

  /**
   * Get browser support info
   */
  getSupportInfo() {
    const hasMediaRecorder = typeof MediaRecorder !== 'undefined';
    const hasCaptureStream = typeof HTMLCanvasElement.prototype.captureStream === 'function';

    return {
      supported: hasMediaRecorder && hasCaptureStream,
      mediaRecorder: hasMediaRecorder,
      captureStream: hasCaptureStream,
      browser: this.detectBrowser(),
    };
  }

  /**
   * Detect browser
   */
  detectBrowser() {
    const ua = navigator.userAgent;
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari')) return 'Safari';
    if (ua.includes('Edge')) return 'Edge';
    return 'Unknown';
  }

  /**
   * Get data summary for debugging
   */
  getDataSummary() {
    return {
      hasStats: !!this.stats,
      hasIdentityData: !!this.identityData,
      hasTimePersonalityData: !!this.timePersonalityData,
      format: this.format,
      duration: this.duration,
      durationMs: this.durations[this.duration],
      sceneCount: this.scenes.length,
      timeline: this.timeline.map(t => ({ id: t.id, duration: Math.round(t.duration / 1000) + 's' })),
    };
  }
}

// Export for use in other modules
window.VideoGenerator = VideoGenerator;

// Create global instance for easy access
window.videoGenerator = null;

/**
 * Initialize video generator with current data
 * Call this after data is loaded
 */
function initVideoGenerator(options = {}) {
  window.videoGenerator = new VideoGenerator(options);
  window.videoGenerator.init();
  return window.videoGenerator;
}

window.initVideoGenerator = initVideoGenerator;

