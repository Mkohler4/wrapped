// ============================================
// ChatGPT Wrapped Video - Personality Scene
// ============================================
// Identity archetype + time personality reveal

class ScenePersonality extends SceneBase {
  constructor(options) {
    super(options);
    this.id = 'personality';
    
    // Get identity data
    this.archetype = this.identityData?.archetype ?? 'The Explorer';
    this.traits = this.identityData?.traits ?? ['Curious', 'Creative', 'Analytical'];
    
    // Get time personality
    this.timeType = this.timePersonalityData?.type ?? this.stats?.enhanced?.personality ?? 'Night Owl';
    this.peakHour = this.timePersonalityData?.peakHour ?? 22;
    
    // Animation state
    this.youAreOpacity = 0;
    this.archetypeOpacity = 0;
    this.archetypeScale = 0.7;
    this.archetypeGlow = 0;
    this.timeOpacity = 0;
    this.clockAngle = 0;
    this.traitsOpacity = [];
    
    // Particles
    this.particles = new ParticleSystem({
      maxParticles: 80,
    });
  }

  getTimeIcon() {
    const icons = {
      'Night Owl': '🦉',
      'Early Bird': '🐦',
      'Afternoon Explorer': '☀️',
      'All-Day Thinker': '🌍',
      'Weekend Warrior': '🎯',
    };
    return icons[this.timeType] || '⏰';
  }

  getArchetypeIcon() {
    const archLower = this.archetype.toLowerCase();
    if (archLower.includes('code') || archLower.includes('developer')) return '💻';
    if (archLower.includes('creative') || archLower.includes('artist')) return '🎨';
    if (archLower.includes('writer')) return '✍️';
    if (archLower.includes('explorer')) return '🔭';
    if (archLower.includes('scholar') || archLower.includes('learner')) return '📚';
    if (archLower.includes('strategist')) return '🎯';
    if (archLower.includes('innovator')) return '💡';
    if (archLower.includes('analyst')) return '📊';
    return '✨';
  }

  setupAnimations() {
    const duration = this.timeline.duration;
    
    // "You are" fade in
    this.createTween({
      from: 0,
      to: 1,
      duration: 400,
      delay: 100,
      easing: Easing.easeOutCubic,
      onUpdate: (v) => { this.youAreOpacity = v; },
    });
    
    // Archetype reveal
    this.createTween({
      from: 0,
      to: 1,
      duration: 600,
      delay: 400,
      easing: Easing.easeOutCubic,
      onUpdate: (v) => { this.archetypeOpacity = v; },
    });
    
    this.createTween({
      from: 0.7,
      to: 1,
      duration: 600,
      delay: 400,
      easing: Easing.easeOutBack,
      onUpdate: (v) => { this.archetypeScale = v; },
      onComplete: () => {
        // Burst on reveal
        this.particles.burst(this.centerX, this.centerY - 200, 30, {
          colors: ['#10a37f', '#ffd700', '#ffffff'],
          speed: 6,
        });
      },
    });
    
    // Glow pulse
    this.createTween({
      from: 0,
      to: 1,
      duration: 800,
      delay: 600,
      easing: Easing.easeOutCubic,
      onUpdate: (v) => { this.archetypeGlow = v; },
    });
    
    // Time personality section
    this.createTween({
      from: 0,
      to: 1,
      duration: 500,
      delay: duration * 0.45,
      easing: Easing.easeOutCubic,
      onUpdate: (v) => { this.timeOpacity = v; },
    });
    
    // Clock animation
    this.createTween({
      from: 0,
      to: (this.peakHour / 12) * Math.PI * 2,
      duration: 800,
      delay: duration * 0.5,
      easing: Easing.easeOutCubic,
      onUpdate: (v) => { this.clockAngle = v; },
    });
    
    // Traits staggered reveal
    this.traits.slice(0, 3).forEach((_, index) => {
      this.traitsOpacity[index] = 0;
      this.createTween({
        from: 0,
        to: 1,
        duration: 300,
        delay: duration * 0.65 + (index * 150),
        easing: Easing.easeOutCubic,
        onUpdate: (v) => { this.traitsOpacity[index] = v; },
      });
    });
  }

  updateElements(sceneTime, deltaTime, progress) {
    this.particles.update(performance.now());
  }

  renderContent(ctx, sceneTime, progress) {
    // Draw gradient background
    this.drawGradientBackground(ctx);
    
    // Draw glow behind archetype
    this.drawArchetypeGlow(ctx);
    
    // Draw particles
    this.particles.draw(ctx);
    
    // Draw "You are" label
    this.drawYouAreLabel(ctx);
    
    // Draw archetype
    this.drawArchetype(ctx);
    
    // Draw time personality
    this.drawTimePersonality(ctx);
    
    // Draw traits
    this.drawTraits(ctx);
  }

  drawArchetypeGlow(ctx) {
    if (this.archetypeGlow <= 0) return;
    
    const y = this.centerY - 200;
    const gradient = ctx.createRadialGradient(
      this.centerX, y, 0,
      this.centerX, y, 400 * this.archetypeGlow
    );
    
    gradient.addColorStop(0, `rgba(16, 163, 127, ${0.3 * this.archetypeGlow})`);
    gradient.addColorStop(0.5, `rgba(16, 163, 127, ${0.1 * this.archetypeGlow})`);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  drawYouAreLabel(ctx) {
    if (this.youAreOpacity <= 0) return;
    
    // Position higher up with more space before archetype
    this.drawText(ctx, 'You are', this.centerX, this.centerY - 380, {
      font: '400 40px Outfit, sans-serif',
      color: this.colors.textMuted,
      opacity: this.youAreOpacity,
    });
  }

  drawArchetype(ctx) {
    if (this.archetypeOpacity <= 0) return;
    
    const y = this.centerY - 220;  // Moved down slightly for better spacing from "You are"
    
    ctx.save();
    
    // Scale transform
    ctx.translate(this.centerX, y);
    ctx.scale(this.archetypeScale, this.archetypeScale);
    ctx.translate(-this.centerX, -y);
    
    // Draw icon (closer to title)
    ctx.font = '80px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.globalAlpha = this.archetypeOpacity;
    ctx.fillText(this.getArchetypeIcon(), this.centerX, y - 60);
    
    // Draw archetype name with glow (more space below icon)
    this.drawGlowText(ctx, this.archetype, this.centerX, y + 40, {
      font: 'bold 72px Outfit, sans-serif',
      color: this.colors.text,
      glowColor: `rgba(16, 163, 127, ${0.5 * this.archetypeGlow})`,
      glowBlur: 30 * this.archetypeGlow,
      opacity: this.archetypeOpacity,
    });
    
    ctx.restore();
  }

  drawTimePersonality(ctx) {
    if (this.timeOpacity <= 0) return;
    
    const y = this.centerY + 120;
    
    ctx.save();
    ctx.globalAlpha = this.timeOpacity;
    
    // Divider line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.centerX - 200, y - 60);
    ctx.lineTo(this.centerX + 200, y - 60);
    ctx.stroke();
    
    // Calculate component dimensions for centering
    const clockRadius = 35;
    const clockDiameter = clockRadius * 2;
    const gapBetweenClockAndText = 25;
    
    // Measure text widths
    ctx.font = 'bold 44px Outfit, sans-serif';
    const titleWidth = ctx.measureText(this.timeType).width;
    
    const hourStr = this.formatHour(this.peakHour);
    const subtitleText = `${this.getTimeIcon()} Peak activity: ${hourStr}`;
    ctx.font = '28px Outfit, sans-serif';
    const subtitleWidth = ctx.measureText(subtitleText).width;
    
    const textWidth = Math.max(titleWidth, subtitleWidth);
    
    // Total component width: clock + gap + text
    const totalWidth = clockDiameter + gapBetweenClockAndText + textWidth;
    
    // Center the entire component
    const startX = this.centerX - totalWidth / 2;
    const clockX = startX + clockRadius;
    const textX = startX + clockDiameter + gapBetweenClockAndText;
    
    // Clock face
    ctx.strokeStyle = this.colors.textMuted;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(clockX, y + 30, clockRadius, 0, Math.PI * 2);
    ctx.stroke();
    
    // Clock hand
    ctx.strokeStyle = this.colors.accent;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(clockX, y + 30);
    ctx.lineTo(
      clockX + Math.sin(this.clockAngle) * (clockRadius - 10),
      y + 30 - Math.cos(this.clockAngle) * (clockRadius - 10)
    );
    ctx.stroke();
    
    // Clock center dot
    ctx.fillStyle = this.colors.accent;
    ctx.beginPath();
    ctx.arc(clockX, y + 30, 4, 0, Math.PI * 2);
    ctx.fill();
    
    // Time personality name (e.g., "Night Owl")
    ctx.font = 'bold 44px Outfit, sans-serif';
    ctx.fillStyle = this.colors.text;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.timeType, textX, y + 10);
    
    // Peak hour with icon on same line, below the title
    ctx.font = '28px Outfit, sans-serif';
    ctx.fillStyle = this.colors.textMuted;
    ctx.fillText(subtitleText, textX, y + 55);
    
    ctx.restore();
  }

  formatHour(hour) {
    if (hour === 0) return '12 AM';
    if (hour === 12) return '12 PM';
    if (hour < 12) return `${hour} AM`;
    return `${hour - 12} PM`;
  }

  drawTraits(ctx) {
    const y = this.centerY + 280;
    const traits = this.traits.slice(0, 3);
    const pillPadding = 24;  // Horizontal padding inside pill
    const pillHeight = 44;
    const gapBetweenPills = 20;  // Space between pills
    
    ctx.save();
    ctx.font = '22px Outfit, sans-serif';
    
    // Calculate pill widths based on text
    const pillWidths = traits.map(trait => {
      return ctx.measureText(trait).width + (pillPadding * 2);
    });
    
    // Calculate total width for centering
    const totalWidth = pillWidths.reduce((sum, w) => sum + w, 0) + (gapBetweenPills * (traits.length - 1));
    let currentX = this.centerX - totalWidth / 2;
    
    traits.forEach((trait, index) => {
      const opacity = this.traitsOpacity[index] ?? 0;
      if (opacity <= 0) return;
      
      const pillWidth = pillWidths[index];
      
      ctx.globalAlpha = opacity;
      
      // Pill background
      ctx.fillStyle = 'rgba(16, 163, 127, 0.2)';
      ctx.strokeStyle = 'rgba(16, 163, 127, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(currentX, y - pillHeight / 2, pillWidth, pillHeight, pillHeight / 2);
      ctx.fill();
      ctx.stroke();
      
      // Trait text
      ctx.fillStyle = this.colors.accent;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(trait, currentX + pillWidth / 2, y);
      
      // Move to next pill position
      currentX += pillWidth + gapBetweenPills;
    });
    
    ctx.restore();
  }

  exit() {
    super.exit();
    this.particles.clear();
  }
}

// Register scene
window.ScenePersonality = ScenePersonality;

