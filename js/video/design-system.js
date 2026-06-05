// ============================================
// ChatGPT Wrapped Video - Design System
// ============================================
// Centralized visual design constants and utilities

/**
 * VideoDesignSystem - Core visual design constants
 */
const VideoDesignSystem = {
  // ============================================
  // COLOR PALETTE
  // ============================================
  colors: {
    // Primary backgrounds
    bg: {
      primary: '#0a0a0a',
      secondary: '#0f0f0f',
      tertiary: '#1a1a1a',
      elevated: '#242424',
    },
    
    // Gradient colors
    gradients: {
      darkStart: '#0a0a0a',
      darkMid: '#0d0d0d',
      darkEnd: '#1a1a2e',
      accentStart: '#10a37f',
      accentMid: '#0d8a6a',
      accentEnd: '#087a5c',
      warmStart: '#1a1a2e',
      warmEnd: '#2d1a3d',
      coolStart: '#0d1a2e',
      coolEnd: '#1a2e3d',
    },
    
    // Accent colors
    accent: {
      primary: '#10a37f',      // ChatGPT green
      light: '#14c994',
      dark: '#0d8a6a',
      darker: '#087a5c',
      glow: 'rgba(16, 163, 127, 0.4)',
      glowStrong: 'rgba(16, 163, 127, 0.6)',
      glowSubtle: 'rgba(16, 163, 127, 0.2)',
    },
    
    // Text colors
    text: {
      primary: '#ffffff',
      secondary: '#e0e0e0',
      muted: '#888888',
      dim: '#555555',
      accent: '#10a37f',
    },
    
    // Celebration colors (confetti, achievements)
    celebration: {
      gold: '#ffd700',
      coral: '#ff6b6b',
      blue: '#4d96ff',
      pink: '#ff85a1',
      green: '#6bcb77',
      purple: '#a855f7',
      cyan: '#22d3ee',
      orange: '#fb923c',
    },
    
    // Status colors
    status: {
      success: '#10a37f',
      warning: '#ffd700',
      error: '#ff6b6b',
      info: '#4d96ff',
    },
  },

  // ============================================
  // GRADIENT PRESETS
  // ============================================
  gradientPresets: {
    // Standard dark gradient (default)
    dark: {
      type: 'linear',
      angle: 180,
      stops: [
        { offset: 0, color: '#0a0a0a' },
        { offset: 0.5, color: '#0d0d0d' },
        { offset: 1, color: '#1a1a2e' },
      ],
    },
    
    // Dark with accent glow
    darkAccent: {
      type: 'linear',
      angle: 180,
      stops: [
        { offset: 0, color: '#0a0a0a' },
        { offset: 0.4, color: '#0d0f0e' },
        { offset: 0.7, color: '#0a1210' },
        { offset: 1, color: '#0f1a18' },
      ],
    },
    
    // Warm purple tint
    warmDark: {
      type: 'linear',
      angle: 135,
      stops: [
        { offset: 0, color: '#0a0a0a' },
        { offset: 0.5, color: '#1a1a2e' },
        { offset: 1, color: '#2d1a3d' },
      ],
    },
    
    // Cool blue tint
    coolDark: {
      type: 'linear',
      angle: 135,
      stops: [
        { offset: 0, color: '#0a0a0a' },
        { offset: 0.5, color: '#0d1a2e' },
        { offset: 1, color: '#1a2e3d' },
      ],
    },
    
    // Celebration gradient
    celebration: {
      type: 'linear',
      angle: 180,
      stops: [
        { offset: 0, color: '#0a0a0a' },
        { offset: 0.3, color: '#1a1a2e' },
        { offset: 0.7, color: '#1a1a2e' },
        { offset: 1, color: '#0a0a0a' },
      ],
    },
    
    // Radial accent glow
    radialAccent: {
      type: 'radial',
      centerX: 0.5,
      centerY: 0.4,
      innerRadius: 0,
      outerRadius: 0.8,
      stops: [
        { offset: 0, color: 'rgba(16, 163, 127, 0.15)' },
        { offset: 0.5, color: 'rgba(16, 163, 127, 0.05)' },
        { offset: 1, color: 'rgba(16, 163, 127, 0)' },
      ],
    },
  },

  // ============================================
  // TYPOGRAPHY
  // ============================================
  typography: {
    // Font family
    fontFamily: 'Outfit, -apple-system, BlinkMacSystemFont, sans-serif',
    
    // Font weights
    weights: {
      light: 300,
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    
    // Font sizes (portrait 1080x1920 base)
    sizes: {
      xs: 24,
      sm: 28,
      md: 36,
      lg: 48,
      xl: 64,
      xxl: 96,
      hero: 120,
      mega: 144,
      giant: 200,
    },
    
    // Preset font styles
    presets: {
      // Titles
      heroTitle: { weight: 700, size: 120, letterSpacing: -2 },
      title: { weight: 700, size: 96, letterSpacing: -1 },
      titleLarge: { weight: 700, size: 144, letterSpacing: -2 },
      
      // Subtitles
      subtitle: { weight: 500, size: 48, letterSpacing: 0 },
      subtitleSmall: { weight: 500, size: 36, letterSpacing: 0 },
      
      // Body
      body: { weight: 400, size: 36, letterSpacing: 0 },
      bodySmall: { weight: 400, size: 28, letterSpacing: 0 },
      
      // Numbers
      numberGiant: { weight: 700, size: 200, letterSpacing: -4 },
      numberLarge: { weight: 700, size: 144, letterSpacing: -2 },
      numberMedium: { weight: 700, size: 120, letterSpacing: -1 },
      numberSmall: { weight: 700, size: 72, letterSpacing: 0 },
      
      // Labels
      label: { weight: 600, size: 32, letterSpacing: 1 },
      labelSmall: { weight: 600, size: 24, letterSpacing: 1 },
      
      // Small text
      caption: { weight: 400, size: 24, letterSpacing: 0 },
    },
  },

  // ============================================
  // SPACING & LAYOUT
  // ============================================
  spacing: {
    // Base unit
    unit: 8,
    
    // Preset spacings
    xs: 8,
    sm: 16,
    md: 24,
    lg: 32,
    xl: 48,
    xxl: 64,
    xxxl: 96,
    
    // Canvas margins (for 1080 width)
    canvasMargin: 80,
    canvasMarginSmall: 48,
  },

  // ============================================
  // ANIMATION TIMING
  // ============================================
  timing: {
    // Durations (ms)
    instant: 100,
    fast: 200,
    normal: 400,
    slow: 600,
    slower: 800,
    slowest: 1000,
    
    // Scene-specific timing
    counterDuration: 1800,
    textRevealDuration: 800,
    glowPulseDuration: 2000,
    particleBurstLife: 1200,
    
    // Stagger delays
    staggerSmall: 50,
    staggerMedium: 100,
    staggerLarge: 150,
  },

  // ============================================
  // GLOW EFFECTS
  // ============================================
  glow: {
    // Blur amounts
    subtle: 15,
    normal: 30,
    strong: 50,
    intense: 80,
    
    // Preset glow configs
    presets: {
      text: {
        color: 'rgba(255, 255, 255, 0.3)',
        blur: 20,
      },
      accent: {
        color: 'rgba(16, 163, 127, 0.5)',
        blur: 40,
      },
      accentStrong: {
        color: 'rgba(16, 163, 127, 0.7)',
        blur: 60,
      },
      number: {
        color: 'rgba(16, 163, 127, 0.4)',
        blur: 50,
      },
      celebration: {
        color: 'rgba(255, 215, 0, 0.4)',
        blur: 40,
      },
    },
  },

  // ============================================
  // PARTICLE PRESETS
  // ============================================
  particles: {
    // Default colors by effect type
    colors: {
      accent: ['#10a37f', '#14c994', '#0d8a6a', '#ffffff'],
      celebration: ['#10a37f', '#ffd700', '#ff6b6b', '#4d96ff', '#ff85a1', '#6bcb77'],
      sparkle: ['#ffffff', '#ffffcc', '#10a37f', '#14c994'],
      subtle: ['rgba(16, 163, 127, 0.6)', 'rgba(255, 255, 255, 0.4)'],
    },
    
    // Size presets
    sizes: {
      tiny: [2, 3],
      small: [3, 4, 5],
      medium: [4, 6, 8],
      large: [6, 8, 10, 12],
    },
    
    // Physics presets
    physics: {
      // Floating ambient
      ambient: {
        gravity: -0.01,
        friction: 0.995,
        life: 3000,
        speed: 1,
      },
      // Burst explosion
      burst: {
        gravity: 0.05,
        friction: 0.98,
        life: 1200,
        speed: 6,
      },
      // Confetti
      confetti: {
        gravity: 0.12,
        friction: 0.99,
        life: 2500,
        speed: 8,
      },
      // Sparkle
      sparkle: {
        gravity: 0,
        friction: 0.95,
        life: 600,
        speed: 3,
      },
      // Rising bubbles
      rise: {
        gravity: -0.02,
        friction: 0.99,
        life: 2000,
        speed: 2,
      },
    },
  },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Create a font string from typography preset
 */
function createFont(preset, scale = 1) {
  const config = VideoDesignSystem.typography.presets[preset];
  if (!config) {
    console.warn(`Unknown typography preset: ${preset}`);
    return '400 36px Outfit, sans-serif';
  }
  
  const size = Math.round(config.size * scale);
  return `${config.weight} ${size}px ${VideoDesignSystem.typography.fontFamily}`;
}

/**
 * Create a linear gradient on canvas
 */
function createLinearGradient(ctx, preset, width, height, time = 0) {
  const config = VideoDesignSystem.gradientPresets[preset];
  if (!config || config.type !== 'linear') {
    // Default fallback
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, VideoDesignSystem.colors.gradients.darkStart);
    gradient.addColorStop(1, VideoDesignSystem.colors.gradients.darkEnd);
    return gradient;
  }
  
  // Calculate gradient coordinates based on angle
  const angleRad = (config.angle * Math.PI) / 180;
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  
  // Add subtle animation offset based on time
  const animOffset = time > 0 ? Math.sin(time / 5000) * 0.05 : 0;
  
  const x0 = width / 2 - cos * width;
  const y0 = height / 2 - sin * height;
  const x1 = width / 2 + cos * width;
  const y1 = height / 2 + sin * height;
  
  const gradient = ctx.createLinearGradient(x0, y0, x1, y1);
  
  config.stops.forEach(stop => {
    const offset = Math.max(0, Math.min(1, stop.offset + animOffset));
    gradient.addColorStop(offset, stop.color);
  });
  
  return gradient;
}

/**
 * Create a radial gradient on canvas
 */
function createRadialGradient(ctx, preset, width, height, time = 0) {
  const config = VideoDesignSystem.gradientPresets[preset];
  if (!config || config.type !== 'radial') {
    // Default fallback
    const cx = width / 2;
    const cy = height * 0.4;
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, height * 0.8);
    gradient.addColorStop(0, 'rgba(16, 163, 127, 0.15)');
    gradient.addColorStop(1, 'rgba(16, 163, 127, 0)');
    return gradient;
  }
  
  // Add subtle breathing animation based on time
  const breathe = time > 0 ? 1 + Math.sin(time / 2000) * 0.05 : 1;
  
  const cx = width * config.centerX;
  const cy = height * config.centerY;
  const inner = Math.max(width, height) * config.innerRadius;
  const outer = Math.max(width, height) * config.outerRadius * breathe;
  
  const gradient = ctx.createRadialGradient(cx, cy, inner, cx, cy, outer);
  
  config.stops.forEach(stop => {
    gradient.addColorStop(stop.offset, stop.color);
  });
  
  return gradient;
}

/**
 * Draw animated gradient background
 */
function drawAnimatedBackground(ctx, width, height, time, options = {}) {
  const {
    preset = 'dark',
    overlayPreset = null,
    intensity = 1,
  } = options;
  
  // Base gradient
  ctx.fillStyle = createLinearGradient(ctx, preset, width, height, time);
  ctx.fillRect(0, 0, width, height);
  
  // Optional overlay (radial glow)
  if (overlayPreset) {
    ctx.save();
    ctx.globalAlpha = intensity;
    ctx.fillStyle = createRadialGradient(ctx, overlayPreset, width, height, time);
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }
}

/**
 * Get pulsing glow intensity
 */
function getPulsingGlow(time, baseIntensity = 1, pulseAmount = 0.15, speed = 2000) {
  return baseIntensity + Math.sin(time / speed * Math.PI * 2) * pulseAmount;
}

/**
 * Get breathing scale
 */
function getBreathingScale(time, baseScale = 1, amount = 0.02, speed = 3000) {
  return baseScale + Math.sin(time / speed * Math.PI * 2) * amount;
}

/**
 * Interpolate between colors
 */
function lerpColor(color1, color2, t) {
  // Parse hex colors
  const c1 = parseInt(color1.slice(1), 16);
  const c2 = parseInt(color2.slice(1), 16);
  
  const r1 = (c1 >> 16) & 255;
  const g1 = (c1 >> 8) & 255;
  const b1 = c1 & 255;
  
  const r2 = (c2 >> 16) & 255;
  const g2 = (c2 >> 8) & 255;
  const b2 = c2 & 255;
  
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/**
 * Create RGBA color with opacity
 */
function rgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Get particle preset configuration
 */
function getParticlePreset(type = 'burst') {
  const physics = VideoDesignSystem.particles.physics[type] || VideoDesignSystem.particles.physics.burst;
  
  let colors = VideoDesignSystem.particles.colors.accent;
  let sizes = VideoDesignSystem.particles.sizes.medium;
  
  switch (type) {
    case 'sparkle':
      colors = VideoDesignSystem.particles.colors.sparkle;
      sizes = VideoDesignSystem.particles.sizes.small;
      break;
    case 'confetti':
      colors = VideoDesignSystem.particles.colors.celebration;
      sizes = VideoDesignSystem.particles.sizes.large;
      break;
    case 'ambient':
      colors = VideoDesignSystem.particles.colors.subtle;
      sizes = VideoDesignSystem.particles.sizes.tiny;
      break;
    case 'burst':
    default:
      colors = VideoDesignSystem.particles.colors.accent;
      sizes = VideoDesignSystem.particles.sizes.medium;
  }
  
  return { ...physics, colors, sizes };
}

// ============================================
// EXPORTS
// ============================================
window.VideoDesignSystem = VideoDesignSystem;
window.VideoDesign = {
  system: VideoDesignSystem,
  createFont,
  createLinearGradient,
  createRadialGradient,
  drawAnimatedBackground,
  getPulsingGlow,
  getBreathingScale,
  lerpColor,
  rgba,
  getParticlePreset,
};

