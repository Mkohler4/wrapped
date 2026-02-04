// ============================================
// ChatGPT Wrapped Video - Journey Scene
// ============================================
// Peak month with mini trend graph

class SceneJourney extends SceneBase {
  constructor(options) {
    super(options);
    this.id = 'journey';
    
    // Get peak month data
    const peakMonth = this.stats?.enhanced?.peakMonth ?? {};
    this.peakMonthName = this.formatMonth(peakMonth.month || 'Nov 2024');
    this.peakMonthCount = peakMonth.count || 1172;
    
    // Get monthly trend data
    this.monthlyTrend = this.stats?.enhanced?.monthlyTrend ?? this.generateSampleTrend();
    
    // Animation state
    this.titleOpacity = 0;
    this.graphDrawProgress = 0;
    this.peakOpacity = 0;
    this.peakScale = 0.8;
    this.highlightPulse = 0;
    
    // Counter for peak count
    this.peakCounter = new CounterAnimation({
      from: 0,
      to: this.peakMonthCount,
      duration: 1200,
      delay: 800,
      format: true,
    });
    
    // Particles
    this.particles = new ParticleSystem({ maxParticles: 50 });
    
    // Graph dimensions
    this.graphPadding = 100;
    this.graphWidth = this.width - (this.graphPadding * 2);
    this.graphHeight = 350;
    this.graphY = this.centerY + 100;
  }

  formatMonth(monthStr) {
    if (!monthStr) return 'Your Peak Month';
    
    // Handle "YYYY-MM" format
    const match = monthStr.match(/(\d{4})-(\d{2})/);
    if (match) {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${months[parseInt(match[2]) - 1]} ${match[1]}`;
    }
    
    return monthStr;
  }

  generateSampleTrend() {
    // Generate sample data if none available
    const data = [];
    for (let i = 0; i < 12; i++) {
      data.push({
        month: `2024-${String(i + 1).padStart(2, '0')}`,
        count: Math.floor(Math.random() * 800) + 200,
      });
    }
    // Make November the peak
    data[10].count = 1172;
    return data;
  }

  setupAnimations() {
    const duration = this.timeline.duration;
    
    // Title fade in
    this.createTween({
      from: 0,
      to: 1,
      duration: 400,
      easing: Easing.easeOutCubic,
      onUpdate: (v) => { this.titleOpacity = v; },
    });
    
    // Graph draws in
    this.createTween({
      from: 0,
      to: 1,
      duration: 1500,
      delay: 300,
      easing: Easing.easeOutCubic,
      onUpdate: (v) => { this.graphDrawProgress = v; },
    });
    
    // Peak highlight
    this.createTween({
      from: 0,
      to: 1,
      duration: 500,
      delay: 1200,
      easing: Easing.easeOutBack,
      onUpdate: (v) => { 
        this.peakOpacity = v;
        this.peakScale = 0.8 + (0.2 * v);
      },
      onComplete: () => {
        // Burst at peak point
        const peakPoint = this.getPeakPoint();
        if (peakPoint) {
          this.particles.sparkle(peakPoint.x, peakPoint.y, 20, {
            colors: ['#ffd700', '#10a37f', '#ffffff'],
          });
        }
      },
    });
    
    // Start counter
    this.peakCounter.start(performance.now());
    
    // Highlight pulse
    this.createTween({
      from: 0,
      to: 1,
      duration: 2000,
      delay: 1500,
      easing: Easing.linear,
      onUpdate: (v) => { this.highlightPulse = v; },
    });
  }

  getPeakPoint() {
    if (!this.monthlyTrend.length) return null;
    
    const maxCount = Math.max(...this.monthlyTrend.map(d => d.count));
    const peakIndex = this.monthlyTrend.findIndex(d => d.count === maxCount);
    
    const pointSpacing = this.graphWidth / Math.max(this.monthlyTrend.length - 1, 1);
    const x = this.graphPadding + (peakIndex * pointSpacing);
    const y = this.graphY + this.graphHeight - ((maxCount / maxCount) * this.graphHeight);
    
    return { x, y };
  }

  updateElements(sceneTime, deltaTime, progress) {
    this.peakCounter.update(performance.now());
    this.particles.update(performance.now());
  }

  renderContent(ctx, sceneTime, progress) {
    // Draw gradient background
    this.drawGradientBackground(ctx);
    
    // Draw title
    this.drawTitle(ctx);
    
    // Draw graph
    this.drawGraph(ctx);
    
    // Draw peak highlight
    this.drawPeakHighlight(ctx);
    
    // Draw particles
    this.particles.draw(ctx);
  }

  drawTitle(ctx) {
    if (this.titleOpacity <= 0) return;
    
    this.drawText(ctx, 'Your ChatGPT Journey', this.centerX, 250, {
      font: 'bold 56px Outfit, sans-serif',
      color: this.colors.text,
      opacity: this.titleOpacity,
    });
    
    this.drawText(ctx, 'Messages per month', this.centerX, 320, {
      font: '32px Outfit, sans-serif',
      color: this.colors.textMuted,
      opacity: this.titleOpacity,
    });
  }

  drawGraph(ctx) {
    if (this.graphDrawProgress <= 0 || !this.monthlyTrend.length) return;
    
    const data = this.monthlyTrend;
    const maxCount = Math.max(...data.map(d => d.count));
    const pointSpacing = this.graphWidth / Math.max(data.length - 1, 1);
    
    // Calculate points
    const points = data.map((d, i) => ({
      x: this.graphPadding + (i * pointSpacing),
      y: this.graphY + this.graphHeight - ((d.count / maxCount) * this.graphHeight),
      count: d.count,
      month: d.month,
    }));
    
    // Draw animated portion based on progress
    const drawCount = Math.floor(points.length * this.graphDrawProgress);
    
    ctx.save();
    
    // Draw gradient fill under the line
    if (drawCount > 1) {
      const gradient = ctx.createLinearGradient(0, this.graphY, 0, this.graphY + this.graphHeight);
      gradient.addColorStop(0, 'rgba(16, 163, 127, 0.3)');
      gradient.addColorStop(1, 'rgba(16, 163, 127, 0)');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(points[0].x, this.graphY + this.graphHeight);
      
      for (let i = 0; i <= drawCount && i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      
      ctx.lineTo(points[Math.min(drawCount, points.length - 1)].x, this.graphY + this.graphHeight);
      ctx.closePath();
      ctx.fill();
    }
    
    // Draw line
    ctx.strokeStyle = this.colors.accent;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    ctx.beginPath();
    for (let i = 0; i <= drawCount && i < points.length; i++) {
      if (i === 0) {
        ctx.moveTo(points[i].x, points[i].y);
      } else {
        ctx.lineTo(points[i].x, points[i].y);
      }
    }
    ctx.stroke();
    
    // Draw points
    for (let i = 0; i <= drawCount && i < points.length; i++) {
      const isPeak = points[i].count === maxCount;
      const radius = isPeak ? 10 : 6;
      
      // Outer glow for peak
      if (isPeak && this.peakOpacity > 0) {
        const pulseRadius = radius + (5 * Math.sin(this.highlightPulse * Math.PI * 4));
        ctx.fillStyle = `rgba(255, 215, 0, ${0.3 * this.peakOpacity})`;
        ctx.beginPath();
        ctx.arc(points[i].x, points[i].y, pulseRadius + 10, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // Point
      ctx.fillStyle = isPeak ? '#ffd700' : this.colors.accent;
      ctx.beginPath();
      ctx.arc(points[i].x, points[i].y, radius, 0, Math.PI * 2);
      ctx.fill();
      
      // Inner highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.beginPath();
      ctx.arc(points[i].x - 2, points[i].y - 2, radius * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Draw month labels (every 3rd month)
    ctx.font = '24px Outfit, sans-serif';
    ctx.fillStyle = this.colors.textMuted;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    
    for (let i = 0; i < points.length; i += 3) {
      if (i <= drawCount) {
        const label = this.getMonthLabel(data[i].month);
        ctx.fillText(label, points[i].x, this.graphY + this.graphHeight + 20);
      }
    }
    
    ctx.restore();
  }

  getMonthLabel(monthStr) {
    const match = monthStr?.match(/(\d{4})-(\d{2})/);
    if (match) {
      const months = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
      return months[parseInt(match[2]) - 1];
    }
    return monthStr?.slice(0, 3) || '';
  }

  drawPeakHighlight(ctx) {
    if (this.peakOpacity <= 0) return;
    
    const y = this.centerY - 180;
    
    ctx.save();
    ctx.globalAlpha = this.peakOpacity;
    
    // Scale transform
    ctx.translate(this.centerX, y);
    ctx.scale(this.peakScale, this.peakScale);
    ctx.translate(-this.centerX, -y);
    
    // "Peak month" label
    ctx.font = '28px Outfit, sans-serif';
    ctx.fillStyle = this.colors.textMuted;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🏆 Peak Month', this.centerX, y - 60);
    
    // Month name
    this.drawGlowText(ctx, this.peakMonthName, this.centerX, y, {
      font: 'bold 64px Outfit, sans-serif',
      color: '#ffd700',
      glowColor: 'rgba(255, 215, 0, 0.4)',
      glowBlur: 25,
    });
    
    // Count
    const countDisplay = this.peakCounter.getDisplayValue();
    ctx.font = 'bold 48px Outfit, sans-serif';
    ctx.fillStyle = this.colors.text;
    ctx.fillText(countDisplay, this.centerX, y + 60);
    
    ctx.font = '28px Outfit, sans-serif';
    ctx.fillStyle = this.colors.textMuted;
    ctx.fillText('messages', this.centerX, y + 105);
    
    ctx.restore();
  }

  exit() {
    super.exit();
    this.particles.clear();
  }
}

// Register scene
window.SceneJourney = SceneJourney;

