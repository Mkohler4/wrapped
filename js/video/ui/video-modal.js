// ============================================
// ChatGPT Wrapped Video - Modal UI Controller
// ============================================
// Handles video generation modal interactions

/**
 * VideoModal - Controls the video generation modal UI
 */
class VideoModal {
  constructor() {
    // State
    this.isOpen = false;
    this.format = 'portrait'; // 'portrait' | 'square'
    this.duration = 'short';  // 'short' | 'medium' | 'long'
    this.state = 'idle';      // 'idle' | 'previewing' | 'paused' | 'recording' | 'complete' | 'error'
    
    // Video generator instance
    this.generator = null;
    this.videoBlob = null;
    
    // Preview state
    this.previewStarted = false;
    this.currentSceneIndex = 0;
    this.totalScenes = 8;
    this.isLooping = true; // Auto-restart preview when complete
    
    // DOM elements (populated on init)
    this.modal = null;
    this.previewContainer = null;
    this.previewCanvas = null;
    this.placeholder = null;
    this.progressSection = null;
    this.progressBar = null;
    this.progressText = null;
    this.downloadSection = null;
    this.recordingIndicator = null;
    this.sceneIndicator = null;
    this.generateBtn = null;
    this.previewBtn = null;
    this.downloadBtn = null;
    
    // Preview controls
    this.previewControls = null;
    this.playPauseBtn = null;
    this.restartBtn = null;
    this.timelineScrubber = null;
    this.timelineProgress = null;
    this.timeDisplay = null;
    this.sceneMarkers = null;
    
    // Bind methods
    this.open = this.open.bind(this);
    this.close = this.close.bind(this);
    this.setFormat = this.setFormat.bind(this);
    this.setDuration = this.setDuration.bind(this);
    this.startPreview = this.startPreview.bind(this);
    this.pausePreview = this.pausePreview.bind(this);
    this.resumePreview = this.resumePreview.bind(this);
    this.restartPreview = this.restartPreview.bind(this);
    this.startRecording = this.startRecording.bind(this);
    this.downloadVideo = this.downloadVideo.bind(this);
    this.seekToPosition = this.seekToPosition.bind(this);
  }

  /**
   * Initialize the modal (call after DOM is ready)
   */
  init() {
    // Get modal elements
    this.modal = document.getElementById('videoModal');
    if (!this.modal) {
      console.warn('Video modal element not found');
      return false;
    }

    // Get child elements
    this.previewContainer = this.modal.querySelector('.video-preview-container');
    this.previewCanvas = this.modal.querySelector('.video-preview-canvas');
    this.placeholder = this.modal.querySelector('.video-preview-placeholder');
    this.progressSection = this.modal.querySelector('.video-progress');
    this.progressBar = this.modal.querySelector('.video-progress-fill');
    this.progressText = this.modal.querySelector('.video-progress-text');
    this.downloadSection = this.modal.querySelector('.video-download');
    this.recordingIndicator = this.modal.querySelector('.video-recording-indicator');
    this.sceneIndicator = this.modal.querySelector('.video-scene-indicator');
    this.generateBtn = this.modal.querySelector('[data-action="generate"]');
    this.previewBtn = this.modal.querySelector('[data-action="preview"]');
    this.downloadBtn = this.modal.querySelector('[data-action="download"]');
    this.unsupportedSection = this.modal.querySelector('.video-unsupported');
    this.supportedContent = this.modal.querySelector('.video-supported-content');
    
    // Preview controls
    this.previewControls = this.modal.querySelector('.video-preview-controls');
    this.playPauseBtn = this.modal.querySelector('[data-action="play-pause"]');
    this.restartBtn = this.modal.querySelector('[data-action="restart"]');
    this.timelineScrubber = this.modal.querySelector('.video-timeline-scrubber');
    this.timelineTrack = this.modal.querySelector('.video-timeline-track');
    this.timelineProgress = this.modal.querySelector('.video-timeline-progress');
    this.timelineHandle = this.modal.querySelector('.video-timeline-handle');
    this.timeDisplay = this.modal.querySelector('.video-time-display');
    this.sceneMarkers = this.modal.querySelector('.video-scene-markers');

    // Setup event listeners
    this.setupEventListeners();

    // Check browser support
    this.checkSupport();

    return true;
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Close button
    const closeBtn = this.modal.querySelector('.video-modal-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', this.close);
    }

    // Click outside to close
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.close();
      }
    });

    // Escape key to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });

    // Format buttons
    this.modal.querySelectorAll('[data-format]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.setFormat(btn.dataset.format);
      });
    });

    // Duration buttons
    this.modal.querySelectorAll('[data-duration]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.setDuration(btn.dataset.duration);
      });
    });

    // Action buttons
    if (this.previewBtn) {
      this.previewBtn.addEventListener('click', this.startPreview);
    }
    if (this.generateBtn) {
      this.generateBtn.addEventListener('click', this.startRecording);
    }
    if (this.downloadBtn) {
      this.downloadBtn.addEventListener('click', this.downloadVideo);
    }
    
    // Preview controls
    if (this.playPauseBtn) {
      this.playPauseBtn.addEventListener('click', () => {
        if (this.state === 'previewing') {
          this.pausePreview();
        } else if (this.state === 'paused') {
          this.resumePreview();
        } else {
          this.startPreview();
        }
      });
    }
    
    if (this.restartBtn) {
      this.restartBtn.addEventListener('click', this.restartPreview);
    }
    
    // Timeline scrubber interactions
    if (this.timelineScrubber) {
      this.setupTimelineScrubber();
    }
    
    // Keyboard shortcuts for preview
    document.addEventListener('keydown', (e) => {
      if (!this.isOpen) return;
      
      // Space to play/pause (only when not recording)
      if (e.code === 'Space' && this.state !== 'recording') {
        e.preventDefault();
        if (this.state === 'previewing') {
          this.pausePreview();
        } else if (this.state === 'paused' || this.previewStarted) {
          this.resumePreview();
        }
      }
      
      // R to restart
      if (e.code === 'KeyR' && this.state !== 'recording') {
        e.preventDefault();
        this.restartPreview();
      }
    });
  }
  
  /**
   * Setup timeline scrubber drag functionality
   */
  setupTimelineScrubber() {
    let isDragging = false;
    
    const getPositionFromEvent = (e) => {
      const rect = this.timelineScrubber.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    };
    
    const startDrag = (e) => {
      if (this.state === 'recording') return;
      isDragging = true;
      this.timelineScrubber.classList.add('dragging');
      handleDrag(e);
    };
    
    const handleDrag = (e) => {
      if (!isDragging) return;
      e.preventDefault();
      const position = getPositionFromEvent(e);
      this.seekToPosition(position);
    };
    
    const endDrag = () => {
      if (isDragging) {
        isDragging = false;
        this.timelineScrubber.classList.remove('dragging');
      }
    };
    
    // Mouse events
    this.timelineScrubber.addEventListener('mousedown', startDrag);
    document.addEventListener('mousemove', handleDrag);
    document.addEventListener('mouseup', endDrag);
    
    // Touch events
    this.timelineScrubber.addEventListener('touchstart', startDrag, { passive: false });
    document.addEventListener('touchmove', handleDrag, { passive: false });
    document.addEventListener('touchend', endDrag);
    
    // Click to seek
    this.timelineScrubber.addEventListener('click', (e) => {
      if (this.state === 'recording') return;
      const position = getPositionFromEvent(e);
      this.seekToPosition(position);
    });
  }

  /**
   * Check browser support for video recording
   */
  checkSupport() {
    // Check if VideoGenerator exists
    if (typeof VideoGenerator === 'undefined') {
      this.showUnsupported('Video generation scripts not loaded. Please refresh the page.');
      return false;
    }

    // Create temporary generator to check support
    const tempGenerator = new VideoGenerator();
    const support = tempGenerator.getSupportInfo();

    if (!support.supported) {
      let reason = 'Video recording is not supported in your browser.';
      if (support.browser === 'Safari' || support.browser === 'iOS Safari') {
        reason = 'Safari has limited video recording support. Please use Chrome, Firefox, or Edge for best results.';
      }
      this.showUnsupported(reason);
      return false;
    }

    // Show supported content
    if (this.unsupportedSection) {
      this.unsupportedSection.style.display = 'none';
    }
    if (this.supportedContent) {
      this.supportedContent.style.display = 'block';
    }

    return true;
  }

  /**
   * Show unsupported browser message
   */
  showUnsupported(reason) {
    if (this.unsupportedSection) {
      this.unsupportedSection.style.display = 'block';
      const textEl = this.unsupportedSection.querySelector('.video-unsupported-text');
      if (textEl) {
        textEl.textContent = reason;
      }
    }
    if (this.supportedContent) {
      this.supportedContent.style.display = 'none';
    }
  }

  /**
   * Open the modal
   */
  open() {
    if (!this.modal) {
      this.init();
    }
    if (!this.modal) return;

    this.isOpen = true;
    this.modal.classList.add('active');
    document.body.style.overflow = 'hidden'; // Prevent scroll

    // Reset state
    this.reset();

    // Initialize generator with current data
    this.initGenerator();
  }

  /**
   * Close the modal
   */
  close() {
    if (!this.modal) return;

    this.isOpen = false;
    this.modal.classList.remove('active');
    document.body.style.overflow = '';

    // Stop any running preview/recording
    if (this.generator) {
      this.generator.stop();
    }
  }

  /**
   * Reset modal state
   */
  reset() {
    this.state = 'idle';
    this.videoBlob = null;

    // Reset UI
    if (this.placeholder) {
      this.placeholder.style.display = 'flex';
    }
    if (this.progressSection) {
      this.progressSection.classList.remove('active');
    }
    if (this.downloadSection) {
      this.downloadSection.classList.remove('active');
    }
    if (this.recordingIndicator) {
      this.recordingIndicator.classList.remove('active');
    }
    if (this.generateBtn) {
      this.generateBtn.disabled = false;
      this.generateBtn.innerHTML = '<span>🎬</span><span>Generate Video</span>';
    }
    if (this.previewBtn) {
      this.previewBtn.disabled = false;
    }

    // Update format/duration button states
    this.updateOptionButtons();
  }

  /**
   * Initialize video generator
   */
  initGenerator() {
    // Create generator instance
    this.generator = new VideoGenerator({
      format: this.format,
      duration: this.duration,
    });

    // Initialize with current data
    this.generator.init({
      stats: window.stats,
      identityData: window.identityData,
      timePersonalityData: window.timePersonalityData,
    });

    // Set callbacks
    this.generator.onProgress = (progress, timeRemaining) => {
      this.updateProgress(progress, timeRemaining);
    };

    this.generator.onComplete = (blob) => {
      this.handleComplete(blob);
    };

    this.generator.onError = (error) => {
      this.handleError(error);
    };

    this.generator.onSceneChange = (index, scene) => {
      this.updateSceneIndicator(scene, index);
    };

    // Attach canvas
    if (this.previewCanvas) {
      this.generator.attachToCanvas(this.previewCanvas);
    }
  }

  /**
   * Set video format
   */
  setFormat(format) {
    if (format !== 'portrait' && format !== 'square') return;
    
    this.format = format;
    this.updateOptionButtons();

    // Update preview container aspect ratio
    if (this.previewContainer) {
      this.previewContainer.classList.toggle('square', format === 'square');
    }

    // Update generator if exists
    if (this.generator) {
      this.generator.setFormat(format);
    }
  }

  /**
   * Set video duration
   */
  setDuration(duration) {
    if (duration !== 'short' && duration !== 'medium' && duration !== 'long') return;
    
    this.duration = duration;
    this.updateOptionButtons();

    // Update generator if exists
    if (this.generator) {
      this.generator.setDuration(duration);
    }
  }

  /**
   * Update option button active states
   */
  updateOptionButtons() {
    // Format buttons
    this.modal?.querySelectorAll('[data-format]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.format === this.format);
    });

    // Duration buttons
    this.modal?.querySelectorAll('[data-duration]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.duration === this.duration);
    });
  }

  /**
   * Start preview mode
   */
  startPreview() {
    if (!this.generator) {
      this.initGenerator();
    }

    this.state = 'previewing';
    this.previewStarted = true;

    // Hide placeholder
    if (this.placeholder) {
      this.placeholder.style.display = 'none';
    }

    // Show preview controls
    if (this.previewControls) {
      this.previewControls.classList.add('active');
    }

    // Show progress
    if (this.progressSection) {
      this.progressSection.classList.add('active');
    }

    // Update button states
    this.updatePreviewButtons();
    
    if (this.previewBtn) {
      this.previewBtn.innerHTML = '<span>⏹️</span><span>Stop</span>';
      this.previewBtn.onclick = () => this.stopPreview();
    }
    if (this.generateBtn) {
      this.generateBtn.disabled = true;
    }

    // Build scene markers if timeline exists
    this.buildSceneMarkers();

    // Start preview
    this.generator.startPreview();
  }

  /**
   * Pause preview
   */
  pausePreview() {
    if (this.state !== 'previewing') return;
    
    this.state = 'paused';
    
    if (this.generator?.renderer) {
      this.generator.renderer.pause();
    }
    
    this.updatePreviewButtons();
  }

  /**
   * Resume preview from paused state
   */
  resumePreview() {
    if (this.state !== 'paused') return;
    
    this.state = 'previewing';
    
    if (this.generator?.renderer) {
      this.generator.renderer.resume();
    }
    
    this.updatePreviewButtons();
  }

  /**
   * Restart preview from beginning
   */
  restartPreview() {
    if (!this.generator) {
      this.initGenerator();
    }

    // Reset generator state
    this.generator.reset();
    
    // Re-initialize and start fresh
    this.state = 'previewing';
    this.previewStarted = true;
    
    // Hide placeholder
    if (this.placeholder) {
      this.placeholder.style.display = 'none';
    }
    
    // Show controls
    if (this.previewControls) {
      this.previewControls.classList.add('active');
    }
    if (this.progressSection) {
      this.progressSection.classList.add('active');
    }
    
    this.updatePreviewButtons();
    
    // Start preview
    this.generator.startPreview();
  }

  /**
   * Stop preview mode completely
   */
  stopPreview() {
    if (this.generator) {
      this.generator.stop();
    }

    this.state = 'idle';
    this.previewStarted = false;

    // Hide preview controls
    if (this.previewControls) {
      this.previewControls.classList.remove('active');
    }

    // Reset button states
    if (this.previewBtn) {
      this.previewBtn.innerHTML = '<span>▶️</span><span>Preview</span>';
      this.previewBtn.onclick = this.startPreview;
    }
    if (this.generateBtn) {
      this.generateBtn.disabled = false;
    }
    if (this.progressSection) {
      this.progressSection.classList.remove('active');
    }
    
    // Reset timeline
    this.updateTimelinePosition(0);
  }

  /**
   * Seek to a specific position (0-1)
   */
  seekToPosition(position) {
    if (!this.generator) return;
    
    const totalDuration = this.generator.durations[this.duration] || 30000;
    const targetTime = position * totalDuration;
    
    // Currently, we need to restart and skip to position
    // A more sophisticated implementation would allow frame-accurate seeking
    // For now, we'll update the visual and note this as a future enhancement
    
    // Update timeline visually
    this.updateTimelinePosition(position);
    
    // If paused, show the preview frame at this position (future enhancement)
    // For now, just track the position
    console.log(`Seek to ${Math.round(position * 100)}% (${(targetTime / 1000).toFixed(1)}s)`);
  }

  /**
   * Update preview control button states
   */
  updatePreviewButtons() {
    if (this.playPauseBtn) {
      if (this.state === 'previewing') {
        this.playPauseBtn.innerHTML = '<span class="video-control-icon">⏸</span>';
        this.playPauseBtn.title = 'Pause (Space)';
      } else {
        this.playPauseBtn.innerHTML = '<span class="video-control-icon">▶</span>';
        this.playPauseBtn.title = 'Play (Space)';
      }
    }
  }

  /**
   * Update timeline position
   */
  updateTimelinePosition(progress) {
    if (this.timelineProgress) {
      this.timelineProgress.style.width = `${progress * 100}%`;
    }
    if (this.timelineHandle) {
      this.timelineHandle.style.left = `${progress * 100}%`;
    }
  }

  /**
   * Build scene markers on timeline
   */
  buildSceneMarkers() {
    if (!this.sceneMarkers || !this.generator) return;
    
    // Clear existing markers
    this.sceneMarkers.innerHTML = '';
    
    const timeline = this.generator.timeline;
    if (!timeline || timeline.length === 0) return;
    
    const totalDuration = this.generator.durations[this.duration] || 30000;
    
    timeline.forEach((scene, index) => {
      const position = (scene.startTime / totalDuration) * 100;
      
      const marker = document.createElement('div');
      marker.className = 'video-scene-marker';
      marker.style.left = `${position}%`;
      marker.title = scene.id.charAt(0).toUpperCase() + scene.id.slice(1);
      marker.dataset.sceneIndex = index;
      
      // Click to jump to scene
      marker.addEventListener('click', (e) => {
        e.stopPropagation();
        this.seekToPosition(scene.startTime / totalDuration);
      });
      
      this.sceneMarkers.appendChild(marker);
    });
    
    this.totalScenes = timeline.length;
  }

  /**
   * Format time for display (mm:ss)
   */
  formatTime(ms) {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Start recording
   */
  startRecording() {
    if (!this.generator) {
      this.initGenerator();
    }

    // Stop any preview first
    if (this.state === 'previewing') {
      this.generator.stop();
    }

    this.state = 'recording';

    // Hide placeholder
    if (this.placeholder) {
      this.placeholder.style.display = 'none';
    }

    // Show progress
    if (this.progressSection) {
      this.progressSection.classList.add('active');
    }

    // Show recording indicator
    if (this.recordingIndicator) {
      this.recordingIndicator.classList.add('active');
    }

    // Update button states
    if (this.generateBtn) {
      this.generateBtn.disabled = true;
      this.generateBtn.innerHTML = '<span>⏺️</span><span>Recording...</span>';
    }
    if (this.previewBtn) {
      this.previewBtn.disabled = true;
    }

    // Disable format/duration changes during recording
    this.modal?.querySelectorAll('[data-format], [data-duration]').forEach(btn => {
      btn.disabled = true;
    });

    // Start recording
    this.generator.startRecording();
  }

  /**
   * Update progress bar and timeline
   */
  updateProgress(progress, timeRemaining) {
    const percent = Math.round(progress * 100);
    const totalDuration = this.generator?.durations?.[this.duration] || 30000;
    const currentTime = progress * totalDuration;

    // Update main progress bar (for recording)
    if (this.progressBar) {
      this.progressBar.style.width = `${percent}%`;
    }

    // Update progress text
    if (this.progressText) {
      if (this.state === 'recording' && timeRemaining !== undefined) {
        const seconds = Math.ceil(timeRemaining / 1000);
        this.progressText.textContent = `${percent}% complete • ~${seconds}s remaining`;
      } else if (this.state === 'previewing' || this.state === 'paused') {
        this.progressText.textContent = `${this.formatTime(currentTime)} / ${this.formatTime(totalDuration)}`;
      } else {
        this.progressText.textContent = `${percent}%`;
      }
    }

    // Update timeline scrubber (for preview)
    if (this.state === 'previewing' || this.state === 'paused') {
      this.updateTimelinePosition(progress);
    }

    // Update time display
    if (this.timeDisplay) {
      this.timeDisplay.textContent = `${this.formatTime(currentTime)} / ${this.formatTime(totalDuration)}`;
    }

    // Handle preview loop when complete
    if (progress >= 1 && this.state === 'previewing' && this.isLooping) {
      setTimeout(() => {
        if (this.state === 'previewing') {
          this.restartPreview();
        }
      }, 500);
    }
  }

  /**
   * Update scene indicator
   */
  updateSceneIndicator(scene, index) {
    this.currentSceneIndex = index ?? this.currentSceneIndex;
    
    if (this.sceneIndicator && scene) {
      const sceneName = scene.id.charAt(0).toUpperCase() + scene.id.slice(1);
      this.sceneIndicator.textContent = `Scene ${this.currentSceneIndex + 1}/${this.totalScenes}: ${sceneName}`;
    }
    
    // Highlight current scene marker
    if (this.sceneMarkers) {
      this.sceneMarkers.querySelectorAll('.video-scene-marker').forEach((marker, i) => {
        marker.classList.toggle('active', i === this.currentSceneIndex);
      });
    }
  }

  /**
   * Handle recording complete
   */
  handleComplete(blob) {
    this.state = 'complete';
    this.videoBlob = blob;

    // Hide recording indicator
    if (this.recordingIndicator) {
      this.recordingIndicator.classList.remove('active');
    }

    // Update progress to 100%
    this.updateProgress(1, 0);
    if (this.progressText) {
      this.progressText.textContent = 'Complete! 🎉';
    }

    // Show download section
    if (this.downloadSection) {
      this.downloadSection.classList.add('active');
      
      // Update file size
      const sizeEl = this.downloadSection.querySelector('.video-download-size');
      if (sizeEl && this.generator) {
        sizeEl.textContent = this.generator.getFormattedVideoSize();
      }
    }

    // Update buttons
    if (this.generateBtn) {
      this.generateBtn.disabled = false;
      this.generateBtn.innerHTML = '<span>🔄</span><span>Create New Video</span>';
    }
    if (this.previewBtn) {
      this.previewBtn.disabled = false;
    }

    // Re-enable options
    this.modal?.querySelectorAll('[data-format], [data-duration]').forEach(btn => {
      btn.disabled = false;
    });
  }

  /**
   * Handle recording error
   */
  handleError(error) {
    this.state = 'error';

    console.error('Video generation error:', error);

    // Hide recording indicator
    if (this.recordingIndicator) {
      this.recordingIndicator.classList.remove('active');
    }

    // Show error in progress text
    if (this.progressText) {
      this.progressText.textContent = `Error: ${error.message}`;
      this.progressText.style.color = '#ff6b6b';
    }

    // Reset buttons
    if (this.generateBtn) {
      this.generateBtn.disabled = false;
      this.generateBtn.innerHTML = '<span>🎬</span><span>Try Again</span>';
    }
    if (this.previewBtn) {
      this.previewBtn.disabled = false;
    }

    // Re-enable options
    this.modal?.querySelectorAll('[data-format], [data-duration]').forEach(btn => {
      btn.disabled = false;
    });
  }

  /**
   * Download the generated video
   */
  downloadVideo() {
    if (!this.generator || !this.videoBlob) {
      console.warn('No video to download');
      return;
    }

    this.generator.downloadVideo();
  }
}

// ============================================
// Global Functions & Initialization
// ============================================

// Global modal instance
let videoModal = null;

/**
 * Open video modal (called from share slide button)
 */
function openVideoModal() {
  if (!videoModal) {
    videoModal = new VideoModal();
    videoModal.init();
  }
  videoModal.open();
}

/**
 * Close video modal
 */
function closeVideoModal() {
  if (videoModal) {
    videoModal.close();
  }
}

// Export for global access
window.VideoModal = VideoModal;
window.videoModal = null;
window.openVideoModal = openVideoModal;
window.closeVideoModal = closeVideoModal;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Pre-create modal instance for faster opening
  videoModal = new VideoModal();
  window.videoModal = videoModal;
});

