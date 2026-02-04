// ============================================
// ChatGPT Wrapped Video - Canvas Renderer
// ============================================
// Handles canvas setup, frame loop, and MediaRecorder integration

/**
 * VideoRenderer - Manages canvas rendering and video recording
 * 
 * Features:
 * - Canvas setup with double buffering
 * - Fixed timestep frame loop for consistent animations
 * - MediaRecorder integration with VP9/VP8 codec support
 * - Quality presets (low, medium, high)
 * - Progress tracking with time estimates
 * - Comprehensive error handling
 */
class VideoRenderer {
  constructor(options = {}) {
    // Canvas dimensions (default: portrait 9:16)
    this.width = options.width ?? 1080;
    this.height = options.height ?? 1920;
    this.fps = options.fps ?? 30;
    this.frameInterval = 1000 / this.fps; // ms per frame

    // Canvas elements
    this.canvas = null;
    this.ctx = null;
    this.offscreenCanvas = null;
    this.offscreenCtx = null;

    // Recording state
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.isRecording = false;
    this.isPreviewing = false;
    this.recordingState = 'idle'; // 'idle' | 'recording' | 'stopping' | 'complete' | 'error'

    // Animation state
    this.isRunning = false;
    this.startTime = 0;
    this.currentTime = 0;
    this.lastFrameTime = 0;
    this.frameCount = 0;
    this.animationFrameId = null;
    this.accumulator = 0; // For fixed timestep

    // Callbacks
    this.onFrame = options.onFrame ?? null; // (ctx, time, deltaTime) => void
    this.onProgress = options.onProgress ?? null; // (progress 0-1, timeRemaining) => void
    this.onComplete = options.onComplete ?? null; // (blob) => void
    this.onError = options.onError ?? null; // (error) => void
    this.onStateChange = options.onStateChange ?? null; // (state) => void

    // Duration (set externally by video generator)
    this.duration = options.duration ?? 30000; // ms

    // Quality presets
    this.qualityPresets = {
      low: { bitrate: 2500000, label: 'Low (2.5 Mbps)' },
      medium: { bitrate: 5000000, label: 'Medium (5 Mbps)' },
      high: { bitrate: 8000000, label: 'High (8 Mbps)' },
      ultra: { bitrate: 12000000, label: 'Ultra (12 Mbps)' },
    };
    this.quality = options.quality ?? 'high';

    // Recording stats
    this.recordingStats = {
      startTimestamp: 0,
      framesRendered: 0,
      droppedFrames: 0,
      estimatedSize: 0,
    };

    // Design system colors
    this.colors = {
      bg: '#0f0f0f',
      bgGradientStart: '#0d0d0d',
      bgGradientEnd: '#1a1a2e',
      accent: '#10a37f',
      accentGlow: 'rgba(16, 163, 127, 0.3)',
      text: '#ffffff',
      textMuted: '#888888',
    };

    // Error recovery
    this.maxRetries = options.maxRetries ?? 3;
    this.retryCount = 0;
  }

  /**
   * Initialize the renderer with a canvas element
   * @param {HTMLCanvasElement} canvas - Target canvas element
   */
  init(canvas) {
    this.canvas = canvas;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.ctx = this.canvas.getContext('2d', {
      alpha: false,
      desynchronized: true, // Better performance for recording
    });

    // Create offscreen canvas for double buffering (smoother rendering)
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCanvas.width = this.width;
    this.offscreenCanvas.height = this.height;
    this.offscreenCtx = this.offscreenCanvas.getContext('2d', { alpha: false });

    // Set default text rendering
    this.ctx.textBaseline = 'middle';
    this.ctx.textAlign = 'center';
    this.offscreenCtx.textBaseline = 'middle';
    this.offscreenCtx.textAlign = 'center';

    return this;
  }

  /**
   * Create a new canvas element (for modal/preview)
   * @returns {HTMLCanvasElement}
   */
  createCanvas() {
    const canvas = document.createElement('canvas');
    this.init(canvas);
    return canvas;
  }

  /**
   * Set canvas dimensions
   * @param {number} width
   * @param {number} height
   */
  setDimensions(width, height) {
    this.width = width;
    this.height = height;

    if (this.canvas) {
      this.canvas.width = width;
      this.canvas.height = height;
    }

    if (this.offscreenCanvas) {
      this.offscreenCanvas.width = width;
      this.offscreenCanvas.height = height;
    }

    return this;
  }

  /**
   * Clear the canvas with background gradient
   */
  clear() {
    const ctx = this.offscreenCtx || this.ctx;
    const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, this.colors.bgGradientStart);
    gradient.addColorStop(1, this.colors.bgGradientEnd);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  /**
   * Render a single frame using fixed timestep for consistent animations
   * @param {number} timestamp - Current timestamp from requestAnimationFrame
   */
  renderFrame(timestamp) {
    if (!this.isRunning) return;

    // Initialize timing on first frame
    if (this.startTime === 0) {
      this.startTime = timestamp;
      this.lastFrameTime = timestamp;
      this.accumulator = 0;
      this.recordingStats.startTimestamp = Date.now();
    }

    const realDeltaTime = timestamp - this.lastFrameTime;
    this.lastFrameTime = timestamp;

    // Fixed timestep accumulator for consistent frame rate
    this.accumulator += realDeltaTime;

    // Render frames at fixed intervals
    let framesThisTick = 0;
    const maxFramesPerTick = 2; // Prevent spiral of death

    while (this.accumulator >= this.frameInterval && framesThisTick < maxFramesPerTick) {
      this.accumulator -= this.frameInterval;
      this.currentTime += this.frameInterval;
      framesThisTick++;
      
      // Clear and render to offscreen canvas
      this.clear();

      // Call frame callback for scene rendering
      if (this.onFrame) {
        try {
          this.onFrame(this.offscreenCtx, this.currentTime, this.frameInterval);
        } catch (error) {
          console.error('Frame render error:', error);
          if (this.onError) {
            this.onError(new Error(`Frame render failed: ${error.message}`));
          }
        }
      }

      this.frameCount++;
      this.recordingStats.framesRendered++;
    }

    // Track dropped frames
    if (this.accumulator > this.frameInterval * 2) {
      this.recordingStats.droppedFrames++;
      this.accumulator = 0; // Reset to prevent falling behind
    }

    // Copy offscreen to main canvas (only once per tick)
    if (framesThisTick > 0) {
      this.ctx.drawImage(this.offscreenCanvas, 0, 0);
    }

    // Report progress with time estimate
    if (this.onProgress && this.duration > 0) {
      const progress = Math.min(this.currentTime / this.duration, 1);
      const elapsed = Date.now() - this.recordingStats.startTimestamp;
      const estimatedTotal = progress > 0 ? elapsed / progress : this.duration;
      const timeRemaining = Math.max(0, estimatedTotal - elapsed);
      
      this.onProgress(progress, timeRemaining);
    }

    // Check if duration reached
    if (this.currentTime >= this.duration) {
      this.stop();
      return;
    }

    // Continue loop
    this.animationFrameId = requestAnimationFrame((t) => this.renderFrame(t));
  }

  /**
   * Start the render loop (preview mode, no recording)
   */
  startPreview() {
    if (this.isRunning) return;

    this.isRunning = true;
    this.isPreviewing = true;
    this.isRecording = false;
    this.startTime = 0;
    this.currentTime = 0;
    this.frameCount = 0;

    this.animationFrameId = requestAnimationFrame((t) => this.renderFrame(t));
    return this;
  }

  /**
   * Set recording quality
   * @param {'low' | 'medium' | 'high' | 'ultra'} quality
   */
  setQuality(quality) {
    if (this.qualityPresets[quality]) {
      this.quality = quality;
    }
    return this;
  }

  /**
   * Set frame rate
   * @param {number} fps - Frames per second (15, 24, 30, or 60)
   */
  setFrameRate(fps) {
    const validFps = [15, 24, 30, 60];
    if (validFps.includes(fps)) {
      this.fps = fps;
      this.frameInterval = 1000 / fps;
    }
    return this;
  }

  /**
   * Update recording state and notify listeners
   */
  setRecordingState(state) {
    this.recordingState = state;
    if (this.onStateChange) {
      this.onStateChange(state);
    }
  }

  /**
   * Start recording video
   * @param {object} options - Recording options
   */
  startRecording(options = {}) {
    if (this.isRunning) {
      console.warn('Renderer is already running');
      return this;
    }

    // Check MediaRecorder support
    const support = this.getRecordingSupport();
    if (!support.supported) {
      const error = new Error(support.reason || 'MediaRecorder not supported in this browser');
      this.setRecordingState('error');
      if (this.onError) {
        this.onError(error);
      }
      return this;
    }

    // Reset state
    this.recordedChunks = [];
    this.isRunning = true;
    this.isRecording = true;
    this.isPreviewing = false;
    this.startTime = 0;
    this.currentTime = 0;
    this.frameCount = 0;
    this.accumulator = 0;
    this.retryCount = 0;
    this.recordingStats = {
      startTimestamp: 0,
      framesRendered: 0,
      droppedFrames: 0,
      estimatedSize: 0,
    };

    // Apply options
    if (options.quality) this.setQuality(options.quality);
    if (options.fps) this.setFrameRate(options.fps);

    this.setRecordingState('recording');

    try {
      // Create media stream from canvas
      const stream = this.canvas.captureStream(this.fps);

      // Setup MediaRecorder with best available codec and quality
      const mimeType = this.getBestMimeType();
      const bitrate = this.qualityPresets[this.quality]?.bitrate ?? 8000000;
      
      const recorderOptions = {
        mimeType,
        videoBitsPerSecond: bitrate,
      };

      try {
        this.mediaRecorder = new MediaRecorder(stream, recorderOptions);
        console.log(`Recording started: ${mimeType} @ ${bitrate / 1000000}Mbps, ${this.fps}fps`);
      } catch (codecError) {
        // Fallback to default options if codec not supported
        console.warn('Codec not supported, falling back to defaults:', codecError);
        this.mediaRecorder = new MediaRecorder(stream);
      }

      // Handle data chunks
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.recordedChunks.push(event.data);
          // Update estimated size
          this.recordingStats.estimatedSize = this.recordedChunks.reduce(
            (total, chunk) => total + chunk.size, 0
          );
        }
      };

      // Handle recording stop
      this.mediaRecorder.onstop = () => {
        this.setRecordingState('stopping');
        this.finalizeRecording();
      };

      // Handle recording errors with retry logic
      this.mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        this.handleRecordingError(event.error || new Error('Recording error'));
      };

      // Start recording with periodic data capture
      // Smaller intervals = more responsive progress, larger = more efficient
      const captureInterval = this.duration > 30000 ? 500 : 100;
      this.mediaRecorder.start(captureInterval);

      // Start render loop
      this.animationFrameId = requestAnimationFrame((t) => this.renderFrame(t));

    } catch (error) {
      this.handleRecordingError(error);
    }

    return this;
  }

  /**
   * Handle recording errors with optional retry
   */
  handleRecordingError(error) {
    console.error('Recording error:', error);
    
    // Try to recover
    if (this.retryCount < this.maxRetries && this.isRecording) {
      this.retryCount++;
      console.log(`Attempting recovery (${this.retryCount}/${this.maxRetries})...`);
      
      // Stop current recording attempt
      if (this.mediaRecorder?.state !== 'inactive') {
        try {
          this.mediaRecorder.stop();
        } catch (e) {
          // Ignore stop errors during recovery
        }
      }
      
      // Don't retry - just report the error
      // Future: could implement recovery logic here
    }

    this.isRecording = false;
    this.setRecordingState('error');
    
    if (this.onError) {
      this.onError(error);
    }
  }

  /**
   * Stop rendering/recording
   */
  stop() {
    this.isRunning = false;

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.isRecording && this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }

    this.isPreviewing = false;
    return this;
  }

  /**
   * Pause rendering
   */
  pause() {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    return this;
  }

  /**
   * Resume rendering (preview only)
   */
  resume() {
    if (this.isRecording) return; // Can't resume recording
    if (this.isRunning) return;

    this.isRunning = true;
    // Adjust start time to account for pause
    const pausedAt = this.currentTime;
    this.startTime = 0;
    this.animationFrameId = requestAnimationFrame((t) => {
      this.startTime = t - pausedAt;
      this.renderFrame(t);
    });
    return this;
  }

  /**
   * Reset renderer state
   */
  reset() {
    this.stop();
    this.startTime = 0;
    this.currentTime = 0;
    this.frameCount = 0;
    this.recordedChunks = [];
    this.isRecording = false;
    this.isPreviewing = false;
    this.clear();
    this.ctx.drawImage(this.offscreenCanvas, 0, 0);
    return this;
  }

  /**
   * Finalize recording and create video blob
   */
  finalizeRecording() {
    // Validate we have data
    if (this.recordedChunks.length === 0) {
      this.setRecordingState('error');
      if (this.onError) {
        this.onError(new Error('No video data recorded. The recording may have failed to capture any frames.'));
      }
      return;
    }

    try {
      const mimeType = this.mediaRecorder?.mimeType || 'video/webm';
      const blob = new Blob(this.recordedChunks, { type: mimeType });

      // Validate blob size
      if (blob.size < 1000) {
        this.setRecordingState('error');
        if (this.onError) {
          this.onError(new Error('Recording produced an invalid file (too small). Please try again.'));
        }
        return;
      }

      this.isRecording = false;
      this.setRecordingState('complete');

      // Log recording stats
      console.log('Recording complete:', {
        duration: `${(this.currentTime / 1000).toFixed(1)}s`,
        frames: this.recordingStats.framesRendered,
        droppedFrames: this.recordingStats.droppedFrames,
        fileSize: this.formatFileSize(blob.size),
        mimeType,
      });

      if (this.onComplete) {
        this.onComplete(blob);
      }
    } catch (error) {
      this.setRecordingState('error');
      if (this.onError) {
        this.onError(new Error(`Failed to create video file: ${error.message}`));
      }
    }
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Check if MediaRecorder is supported (simple check)
   */
  isRecordingSupported() {
    return typeof MediaRecorder !== 'undefined' && 
           typeof HTMLCanvasElement.prototype.captureStream === 'function';
  }

  /**
   * Get detailed recording support info
   */
  getRecordingSupport() {
    const result = {
      supported: false,
      reason: null,
      browser: this.detectBrowser(),
      hasMediaRecorder: typeof MediaRecorder !== 'undefined',
      hasCaptureStream: typeof HTMLCanvasElement.prototype.captureStream === 'function',
      supportedCodecs: [],
      recommendedCodec: null,
    };

    // Check MediaRecorder
    if (!result.hasMediaRecorder) {
      result.reason = 'Your browser does not support MediaRecorder. Please use Chrome, Firefox, or Edge.';
      return result;
    }

    // Check captureStream
    if (!result.hasCaptureStream) {
      result.reason = 'Your browser does not support canvas video capture. Please use Chrome, Firefox, or Edge.';
      return result;
    }

    // Check supported codecs
    const codecs = [
      { mime: 'video/webm;codecs=vp9', name: 'VP9' },
      { mime: 'video/webm;codecs=vp8', name: 'VP8' },
      { mime: 'video/webm', name: 'WebM' },
      { mime: 'video/mp4', name: 'MP4' },
    ];

    for (const codec of codecs) {
      if (MediaRecorder.isTypeSupported(codec.mime)) {
        result.supportedCodecs.push(codec);
        if (!result.recommendedCodec) {
          result.recommendedCodec = codec;
        }
      }
    }

    if (result.supportedCodecs.length === 0) {
      result.reason = 'No supported video codecs found. Please try a different browser.';
      return result;
    }

    // Check for Safari/iOS limitations
    if (result.browser === 'Safari' || result.browser === 'iOS Safari') {
      if (!result.supportedCodecs.some(c => c.mime.includes('mp4'))) {
        result.reason = 'Safari has limited video recording support. For best results, use Chrome or Firefox.';
        result.supported = true; // Still allow attempt
        return result;
      }
    }

    result.supported = true;
    return result;
  }

  /**
   * Detect browser name
   */
  detectBrowser() {
    const ua = navigator.userAgent;
    if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS Safari';
    if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
    if (ua.includes('Edg')) return 'Edge';
    return 'Unknown';
  }

  /**
   * Get best available MIME type for recording
   */
  getBestMimeType() {
    // Prefer VP9 for quality, VP8 for compatibility
    const types = [
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
      'video/mp4;codecs=h264',
      'video/mp4',
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    return 'video/webm'; // Fallback
  }

  /**
   * Get recording statistics
   */
  getRecordingStats() {
    return {
      ...this.recordingStats,
      currentTime: this.currentTime,
      progress: this.duration > 0 ? this.currentTime / this.duration : 0,
      fps: this.fps,
      quality: this.quality,
      state: this.recordingState,
    };
  }

  /**
   * Download recorded video
   * @param {Blob} blob - Video blob
   * @param {string} filename - Download filename
   */
  downloadVideo(blob, filename = 'chatgpt-wrapped.webm') {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ============================================
  // Drawing Utilities
  // ============================================

  /**
   * Draw text with glow effect
   */
  drawGlowText(text, x, y, options = {}) {
    const ctx = this.offscreenCtx;
    const {
      font = 'bold 72px Outfit, sans-serif',
      color = this.colors.text,
      glowColor = this.colors.accentGlow,
      glowBlur = 20,
    } = options;

    ctx.save();
    ctx.font = font;
    ctx.textAlign = options.align || 'center';
    ctx.textBaseline = options.baseline || 'middle';

    // Glow
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = glowBlur;
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);

    // Sharp text on top
    ctx.shadowBlur = 0;
    ctx.fillText(text, x, y);

    ctx.restore();
  }

  /**
   * Draw rounded rectangle
   */
  drawRoundedRect(x, y, width, height, radius, fill, stroke) {
    const ctx = this.offscreenCtx;
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.stroke();
    }
    ctx.restore();
  }

  /**
   * Get context for external drawing
   */
  getContext() {
    return this.offscreenCtx;
  }

  /**
   * Get current time in ms
   */
  getCurrentTime() {
    return this.currentTime;
  }
}

// Export for use in other modules
window.VideoRenderer = VideoRenderer;

