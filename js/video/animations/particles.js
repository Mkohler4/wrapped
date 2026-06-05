// ============================================
// ChatGPT Wrapped Video - Particle System
// ============================================
// Sparkles, confetti, and particle effects

/**
 * Particle - Individual particle with physics
 */
class Particle {
  constructor(options = {}) {
    // Position
    this.x = options.x ?? 0;
    this.y = options.y ?? 0;
    
    // Velocity
    this.vx = options.vx ?? (Math.random() - 0.5) * 4;
    this.vy = options.vy ?? (Math.random() - 0.5) * 4;
    
    // Physics
    this.gravity = options.gravity ?? 0;
    this.friction = options.friction ?? 0.98;
    
    // Appearance
    this.size = options.size ?? 4;
    this.color = options.color ?? '#ffffff';
    this.opacity = options.opacity ?? 1;
    this.rotation = options.rotation ?? Math.random() * Math.PI * 2;
    this.rotationSpeed = options.rotationSpeed ?? (Math.random() - 0.5) * 0.2;
    
    // Lifecycle
    this.life = options.life ?? 1000; // ms
    this.maxLife = this.life;
    this.fadeOut = options.fadeOut ?? true;
    this.scaleOut = options.scaleOut ?? false;
    
    // Shape
    this.shape = options.shape ?? 'circle'; // 'circle', 'square', 'star', 'confetti'
    
    // State
    this.isAlive = true;
  }

  /**
   * Update particle physics
   * @param {number} deltaTime - Time since last update (ms)
   */
  update(deltaTime) {
    if (!this.isAlive) return;
    
    const dt = deltaTime / 16.67; // Normalize to 60fps
    
    // Apply velocity
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    
    // Apply gravity
    this.vy += this.gravity * dt;
    
    // Apply friction
    this.vx *= this.friction;
    this.vy *= this.friction;
    
    // Rotate
    this.rotation += this.rotationSpeed * dt;
    
    // Decrease life
    this.life -= deltaTime;
    
    // Update opacity based on life
    if (this.fadeOut) {
      this.opacity = Math.max(0, this.life / this.maxLife);
    }
    
    // Check if dead
    if (this.life <= 0) {
      this.isAlive = false;
    }
  }

  /**
   * Draw particle to canvas
   */
  draw(ctx) {
    if (!this.isAlive || this.opacity <= 0) return;
    
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.globalAlpha = this.opacity;
    
    const size = this.scaleOut 
      ? this.size * (this.life / this.maxLife)
      : this.size;
    
    ctx.fillStyle = this.color;
    
    switch (this.shape) {
      case 'square':
        ctx.fillRect(-size / 2, -size / 2, size, size);
        break;
      case 'star':
        this.drawStar(ctx, 0, 0, 5, size, size / 2);
        break;
      case 'confetti':
        ctx.fillRect(-size / 2, -size / 4, size, size / 2);
        break;
      case 'circle':
      default:
        ctx.beginPath();
        ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
        ctx.fill();
        break;
    }
    
    ctx.restore();
  }

  /**
   * Draw a star shape
   */
  drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
    let rot = Math.PI / 2 * 3;
    let step = Math.PI / spikes;
    
    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    
    for (let i = 0; i < spikes; i++) {
      ctx.lineTo(cx + Math.cos(rot) * outerRadius, cy + Math.sin(rot) * outerRadius);
      rot += step;
      ctx.lineTo(cx + Math.cos(rot) * innerRadius, cy + Math.sin(rot) * innerRadius);
      rot += step;
    }
    
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.fill();
  }
}

/**
 * ParticleSystem - Manages multiple particles
 */
class ParticleSystem {
  constructor(options = {}) {
    this.particles = [];
    this.maxParticles = options.maxParticles ?? 500;
    
    // Default particle options
    this.defaults = {
      gravity: options.gravity ?? 0.1,
      friction: options.friction ?? 0.98,
      life: options.life ?? 1000,
      fadeOut: options.fadeOut ?? true,
      scaleOut: options.scaleOut ?? false,
    };
    
    // Bounds for removing particles
    this.bounds = options.bounds ?? null; // { x, y, width, height }
    
    // State
    this.isRunning = true;
    this.lastUpdate = performance.now();
  }

  /**
   * Add a single particle
   */
  add(options = {}) {
    if (this.particles.length >= this.maxParticles) {
      // Remove oldest particle
      this.particles.shift();
    }
    
    const particle = new Particle({
      ...this.defaults,
      ...options,
    });
    
    this.particles.push(particle);
    return particle;
  }

  /**
   * Emit multiple particles from a point
   */
  emit(x, y, count = 10, options = {}) {
    for (let i = 0; i < count; i++) {
      this.add({
        x,
        y,
        ...options,
      });
    }
    return this;
  }

  /**
   * Emit particles in a burst pattern
   */
  burst(x, y, count = 20, options = {}) {
    // Get preset from design system if available
    const preset = window.VideoDesign?.getParticlePreset('burst') ?? {};
    
    const {
      speed = preset.speed ?? 6,
      spread = Math.PI * 2, // Full circle
      angle = -Math.PI / 2, // Up
      colors = preset.colors ?? ['#10a37f', '#14c994', '#ffffff', '#ffd700'],
      sizes = preset.sizes ?? [4, 6, 8],
      shapes = ['circle', 'star'],
      gravity = preset.gravity ?? 0.05,
      friction = preset.friction ?? 0.98,
      life = preset.life ?? 1200,
      fadeOut = true,
      scaleOut = true,
      ...rest
    } = options;

    for (let i = 0; i < count; i++) {
      const particleAngle = angle + (Math.random() - 0.5) * spread;
      const particleSpeed = speed * (0.5 + Math.random() * 0.5);
      
      this.add({
        x,
        y,
        vx: Math.cos(particleAngle) * particleSpeed,
        vy: Math.sin(particleAngle) * particleSpeed,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: sizes[Math.floor(Math.random() * sizes.length)],
        shape: shapes[Math.floor(Math.random() * shapes.length)],
        gravity,
        friction,
        life: life * (0.8 + Math.random() * 0.4), // Vary life by ±20%
        fadeOut,
        scaleOut,
        ...rest,
      });
    }
    return this;
  }

  /**
   * Emit sparkles (small glowing particles)
   */
  sparkle(x, y, count = 15, options = {}) {
    // Get preset from design system if available
    const preset = window.VideoDesign?.getParticlePreset('sparkle') ?? {};
    
    return this.burst(x, y, count, {
      speed: preset.speed ?? 3,
      gravity: preset.gravity ?? 0,
      friction: preset.friction ?? 0.95,
      life: preset.life ?? 600,
      sizes: preset.sizes ?? [2, 3, 4],
      colors: preset.colors ?? ['#ffffff', '#ffffcc', '#10a37f', '#14c994'],
      shapes: ['circle', 'star'],
      fadeOut: true,
      scaleOut: true,
      ...options,
    });
  }

  /**
   * Emit confetti
   */
  confetti(x, y, count = 30, options = {}) {
    // Get preset from design system if available
    const preset = window.VideoDesign?.getParticlePreset('confetti') ?? {};
    const ds = window.VideoDesignSystem;
    
    // Get celebration colors from design system
    const defaultColors = ds?.colors?.celebration 
      ? Object.values(ds.colors.celebration)
      : ['#10a37f', '#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff85a1'];
    
    for (let i = 0; i < count; i++) {
      const particleAngle = -Math.PI / 2 + (Math.random() - 0.5) * (Math.PI * 0.8);
      const particleSpeed = (preset.speed ?? 8) * (0.6 + Math.random() * 0.4);
      
      this.add({
        x,
        y,
        vx: Math.cos(particleAngle) * particleSpeed,
        vy: Math.sin(particleAngle) * particleSpeed,
        gravity: preset.gravity ?? 0.12,
        friction: preset.friction ?? 0.99,
        life: (preset.life ?? 2500) * (0.8 + Math.random() * 0.4),
        size: options.sizes?.[Math.floor(Math.random() * options.sizes.length)] 
              ?? [6, 8, 10, 12][Math.floor(Math.random() * 4)],
        color: options.colors?.[Math.floor(Math.random() * options.colors.length)]
               ?? defaultColors[Math.floor(Math.random() * defaultColors.length)],
        shape: ['confetti', 'square'][Math.floor(Math.random() * 2)],
        rotationSpeed: (Math.random() - 0.5) * 0.3,
        fadeOut: true,
        ...(options.gravity !== undefined && { gravity: options.gravity }),
        ...(options.friction !== undefined && { friction: options.friction }),
        ...(options.life !== undefined && { life: options.life }),
      });
    }
    return this;
  }
  
  /**
   * Emit celebration burst (confetti + sparkles)
   */
  celebrate(x, y, intensity = 1, options = {}) {
    const confettiCount = Math.floor(25 * intensity);
    const sparkleCount = Math.floor(15 * intensity);
    
    this.confetti(x, y, confettiCount, {
      speed: 10 * intensity,
      ...options,
    });
    
    setTimeout(() => {
      this.sparkle(x, y, sparkleCount, {
        speed: 4 * intensity,
      });
    }, 100);
    
    return this;
  }

  /**
   * Emit rising particles (like bubbles)
   */
  rise(x, y, count = 10, options = {}) {
    for (let i = 0; i < count; i++) {
      this.add({
        x: x + (Math.random() - 0.5) * 100,
        y,
        vx: (Math.random() - 0.5) * 0.5,
        vy: -2 - Math.random() * 2,
        gravity: -0.02, // Negative gravity = rise
        friction: 0.99,
        life: 1500 + Math.random() * 500,
        size: 3 + Math.random() * 4,
        color: options.color ?? 'rgba(16, 163, 127, 0.6)',
        shape: 'circle',
        fadeOut: true,
        ...options,
      });
    }
    return this;
  }

  /**
   * Update all particles
   */
  update(currentTime = performance.now()) {
    if (!this.isRunning) return this;
    
    const deltaTime = currentTime - this.lastUpdate;
    this.lastUpdate = currentTime;
    
    // Update each particle
    this.particles.forEach(p => p.update(deltaTime));
    
    // Remove dead particles and out-of-bounds
    this.particles = this.particles.filter(p => {
      if (!p.isAlive) return false;
      
      if (this.bounds) {
        const { x, y, width, height } = this.bounds;
        if (p.x < x - 50 || p.x > x + width + 50 ||
            p.y < y - 50 || p.y > y + height + 50) {
          return false;
        }
      }
      
      return true;
    });
    
    return this;
  }

  /**
   * Draw all particles
   */
  draw(ctx) {
    this.particles.forEach(p => p.draw(ctx));
    return this;
  }

  /**
   * Get particle count
   */
  get count() {
    return this.particles.length;
  }

  /**
   * Check if system has active particles
   */
  get hasParticles() {
    return this.particles.length > 0;
  }

  /**
   * Clear all particles
   */
  clear() {
    this.particles = [];
    return this;
  }

  /**
   * Pause the system
   */
  pause() {
    this.isRunning = false;
    return this;
  }

  /**
   * Resume the system
   */
  resume() {
    this.isRunning = true;
    this.lastUpdate = performance.now();
    return this;
  }
}

/**
 * GlowParticle - Particle with glow effect
 */
class GlowParticle extends Particle {
  constructor(options = {}) {
    super(options);
    this.glowColor = options.glowColor ?? this.color;
    this.glowSize = options.glowSize ?? this.size * 3;
  }

  draw(ctx) {
    if (!this.isAlive || this.opacity <= 0) return;
    
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.globalAlpha = this.opacity;
    
    const size = this.scaleOut 
      ? this.size * (this.life / this.maxLife)
      : this.size;
    
    // Glow
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.glowSize);
    gradient.addColorStop(0, this.glowColor);
    gradient.addColorStop(0.5, this.glowColor.replace(')', ', 0.3)').replace('rgb', 'rgba'));
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, this.glowSize, 0, Math.PI * 2);
    ctx.fill();
    
    // Core
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  }
}

/**
 * TrailParticle - Particle that leaves a trail
 */
class TrailParticle extends Particle {
  constructor(options = {}) {
    super(options);
    this.trail = [];
    this.trailLength = options.trailLength ?? 10;
  }

  update(deltaTime) {
    // Store position before update
    this.trail.unshift({ x: this.x, y: this.y, opacity: this.opacity });
    
    // Limit trail length
    if (this.trail.length > this.trailLength) {
      this.trail.pop();
    }
    
    super.update(deltaTime);
  }

  draw(ctx) {
    if (!this.isAlive) return;
    
    ctx.save();
    
    // Draw trail
    this.trail.forEach((point, i) => {
      const trailOpacity = point.opacity * (1 - i / this.trailLength) * 0.5;
      const trailSize = this.size * (1 - i / this.trailLength);
      
      ctx.globalAlpha = trailOpacity;
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(point.x, point.y, trailSize / 2, 0, Math.PI * 2);
      ctx.fill();
    });
    
    // Draw main particle
    ctx.globalAlpha = this.opacity;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size / 2, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  }
}

/**
 * NumberBurstEffect - Burst effect specifically for number completions
 */
class NumberBurstEffect {
  constructor(options = {}) {
    this.system = new ParticleSystem({
      maxParticles: options.maxParticles ?? 150,
    });
    
    // Get colors from design system
    const ds = window.VideoDesignSystem;
    this.colors = options.colors ?? ds?.particles?.colors?.accent ?? ['#10a37f', '#14c994', '#ffffff', '#ffd700'];
  }

  trigger(x, y, intensity = 1) {
    const count = Math.floor(25 * intensity);
    
    // Main burst - radiating outward
    this.system.burst(x, y, count, {
      speed: 7 * intensity,
      spread: Math.PI * 2,
      colors: this.colors,
      sizes: [4, 5, 6, 8].map(s => s * Math.sqrt(intensity)),
      shapes: ['circle', 'star'],
      life: 1000 * intensity,
      gravity: 0.03,
      fadeOut: true,
      scaleOut: true,
    });
    
    // Delayed sparkle ring
    setTimeout(() => {
      this.system.sparkle(x, y, Math.floor(count * 0.6), {
        speed: 4 * intensity,
        life: 700,
      });
    }, 50);
    
    // Inner glow particles (slower, larger)
    for (let i = 0; i < Math.floor(count * 0.3); i++) {
      const angle = (i / (count * 0.3)) * Math.PI * 2;
      this.system.add({
        x,
        y,
        vx: Math.cos(angle) * 2 * intensity,
        vy: Math.sin(angle) * 2 * intensity,
        size: 8 + Math.random() * 4,
        color: this.colors[0], // Primary accent color
        shape: 'circle',
        life: 600,
        gravity: 0,
        friction: 0.92,
        fadeOut: true,
        scaleOut: true,
      });
    }
    
    return this;
  }

  update(currentTime) {
    this.system.update(currentTime);
    return this;
  }

  draw(ctx) {
    // Draw glow halos for larger particles
    ctx.save();
    this.system.particles.forEach(p => {
      if (!p.isAlive || p.opacity <= 0 || p.size < 6) return;
      
      const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2);
      gradient.addColorStop(0, `rgba(16, 163, 127, ${p.opacity * 0.4})`);
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
    
    this.system.draw(ctx);
    return this;
  }

  get hasParticles() {
    return this.system.hasParticles;
  }

  clear() {
    this.system.clear();
    return this;
  }
}

/**
 * AmbientParticles - Continuous ambient particle effect
 */
class AmbientParticles {
  constructor(options = {}) {
    this.width = options.width ?? 1080;
    this.height = options.height ?? 1920;
    this.density = options.density ?? 0.5; // Particles per frame
    
    // Get preset from design system
    const preset = window.VideoDesign?.getParticlePreset('ambient') ?? {};
    const ds = window.VideoDesignSystem;
    
    // Support multiple colors
    this.colors = options.colors ?? preset.colors ?? [
      'rgba(16, 163, 127, 0.4)',
      'rgba(20, 201, 148, 0.3)',
      'rgba(255, 255, 255, 0.2)',
    ];
    this.color = options.color ?? this.colors[0];
    
    // Physics from preset
    this.gravity = options.gravity ?? preset.gravity ?? -0.01;
    this.friction = options.friction ?? preset.friction ?? 0.995;
    this.baseLife = options.life ?? preset.life ?? 3000;
    
    this.system = new ParticleSystem({
      maxParticles: options.maxParticles ?? 60,
      bounds: { x: 0, y: 0, width: this.width, height: this.height },
    });
    
    this.lastSpawn = 0;
    this.spawnInterval = 100 / this.density;
    
    // Spawn from edges (bottom and sides)
    this.edgeSpawnChance = options.edgeSpawnChance ?? 0.15;
  }

  update(currentTime) {
    // Spawn new particles periodically
    if (currentTime - this.lastSpawn > this.spawnInterval) {
      // Choose spawn position (mostly bottom, sometimes sides)
      let x, y, vx, vy;
      
      if (Math.random() < this.edgeSpawnChance) {
        // Spawn from sides
        const side = Math.random() < 0.5 ? 0 : this.width;
        x = side + (side === 0 ? -20 : 20);
        y = Math.random() * this.height * 0.8;
        vx = side === 0 ? 0.5 + Math.random() * 0.5 : -0.5 - Math.random() * 0.5;
        vy = -0.3 - Math.random() * 0.5;
      } else {
        // Spawn from bottom
        x = Math.random() * this.width;
        y = this.height + 20;
        vx = (Math.random() - 0.5) * 0.8;
        vy = -0.5 - Math.random() * 1.2;
      }
      
      // Pick random color from palette
      const color = Array.isArray(this.colors) 
        ? this.colors[Math.floor(Math.random() * this.colors.length)]
        : this.color;
      
      this.system.add({
        x,
        y,
        vx,
        vy,
        gravity: this.gravity,
        friction: this.friction,
        life: this.baseLife + Math.random() * 2000,
        size: 2 + Math.random() * 3,
        color,
        shape: 'circle',
        fadeOut: true,
        scaleOut: false,
      });
      this.lastSpawn = currentTime;
    }
    
    this.system.update(currentTime);
    return this;
  }

  draw(ctx) {
    // Add subtle glow to ambient particles
    ctx.save();
    this.system.particles.forEach(p => {
      if (!p.isAlive || p.opacity <= 0) return;
      
      // Draw glow halo
      const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
      gradient.addColorStop(0, p.color.replace(/[\d.]+\)$/, `${p.opacity * 0.5})`));
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
    
    // Draw main particles
    this.system.draw(ctx);
    return this;
  }

  setDimensions(width, height) {
    this.width = width;
    this.height = height;
    this.system.bounds = { x: 0, y: 0, width, height };
    return this;
  }
  
  setColors(colors) {
    this.colors = colors;
    return this;
  }
  
  setDensity(density) {
    this.density = density;
    this.spawnInterval = 100 / density;
    return this;
  }
}

// Export for use in other modules
window.Particle = Particle;
window.ParticleSystem = ParticleSystem;
window.GlowParticle = GlowParticle;
window.TrailParticle = TrailParticle;
window.NumberBurstEffect = NumberBurstEffect;
window.AmbientParticles = AmbientParticles;

