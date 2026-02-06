// ============================================
// ChatGPT Wrapped Video - Heatmap Scene
// ============================================
// GitHub-style activity calendar with animated reveal

class SceneHeatmap extends SceneBase {
  constructor(options) {
    super(options);
    this.id = 'heatmap';
    
    // Get heatmap data from stats
    this.heatmapData = this.stats?.heatmap ?? this.generateSampleData();
    
    // Animation state
    this.titleOpacity = 0;
    this.subtitleOpacity = 0;
    this.gridOpacity = 0;
    this.gridRevealProgress = 0;
    this.legendOpacity = 0;
    this.statsOpacity = 0;
    this.highlightOpacity = 0;
    
    // Cell animation states
    this.cellStates = [];
    
    // Stats counters
    this.activeDaysCounter = new CounterAnimation({
      from: 0,
      to: this.heatmapData.stats?.activeDays ?? 247,
      duration: 1500,
      delay: 2000,
      format: true,
    });
    
    this.streakCounter = new CounterAnimation({
      from: 0,
      to: this.heatmapData.stats?.longestStreak ?? 23,
      duration: 1200,
      delay: 2200,
    });
    
    this.rateCounter = new CounterAnimation({
      from: 0,
      to: this.heatmapData.stats?.activityRate ?? 68,
      duration: 1200,
      delay: 2400,
    });
    
    // Particles
    this.particles = new ParticleSystem({ maxParticles: 60 });
    
    // Ambient particles
    this.ambientParticles = new AmbientParticles({
      width: this.width,
      height: this.height,
      density: 0.15,
      colors: ['rgba(16, 163, 127, 0.15)', 'rgba(20, 201, 148, 0.1)'],
    });
    
    // Responsive layout
    this.isPortrait = this.height > this.width;
    this.setupLayout();
  }

  /**
   * Generate sample heatmap data for testing/preview - FULL YEAR (2025)
   */
  generateSampleData() {
    const days = [];
    // Use 2025 as a complete year for demo
    const year = 2025;
    const startDate = new Date(year, 0, 1); // Jan 1, 2025
    const endDate = new Date(year, 11, 31); // Dec 31, 2025
    
    let activeDays = 0;
    let maxCount = 0;
    let currentStreak = 0;
    let longestStreak = 0;
    let busiestDay = null;
    
    // Generate full 365 days
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      // Higher activity on weekdays
      const baseChance = isWeekend ? 0.45 : 0.78;
      
      const count = Math.random() < baseChance ? Math.floor(Math.random() * 45) + 1 : 0;
      
      const dayData = {
        date: d.toISOString().split('T')[0],
        count,
        dayOfWeek,
      };
      days.push({ ...dayData });
      
      if (count > 0) {
        activeDays++;
        currentStreak++;
        if (currentStreak > longestStreak) longestStreak = currentStreak;
      } else {
        currentStreak = 0;
      }
      
      if (count > maxCount) {
        maxCount = count;
        busiestDay = { date: dayData.date, count };
      }
    }
    
    return {
      days,
      stats: {
        activeDays,
        totalDays: days.length,
        longestStreak,
        activityRate: Math.round((activeDays / days.length) * 100),
        maxCount,
        busiestDay,
      },
    };
  }

  /**
   * Setup responsive layout positions
   */
  setupLayout() {
    // Calculate cell size to fill the width (53 weeks) with margins
    const weekCount = 53;
    
    if (this.isPortrait) {
      // Portrait (mobile) - use 88% width for margins
      const availableWidth = this.width * 0.88;
      this.cellSize = Math.floor((availableWidth - 40) / weekCount); // 40px for labels
      this.cellSize = Math.max(12, this.cellSize);
      this.cellGap = 3;
      
      this.titleY = this.height * 0.06;
      this.gridY = this.height * 0.16;
      this.legendY = this.height * 0.50;
      this.statsY = this.height * 0.56;
      this.highlightY = this.height * 0.92;
    } else {
      // Landscape (desktop) - use 86% width for nice margins
      const availableWidth = this.width * 0.86;
      this.cellSize = Math.floor((availableWidth - 50) / weekCount); // 50px for labels
      this.cellSize = Math.max(18, this.cellSize);
      this.cellGap = 4;
      
      this.titleY = this.height * 0.10;
      this.gridY = this.height * 0.24;
      this.legendY = this.height * 0.60;
      this.statsY = this.height * 0.68;
      this.highlightY = this.height * 0.92;
    }
    
    // Process grid data for rendering
    this.processGridData();
  }

  /**
   * Process days into weeks and prepare cell states
   */
  processGridData() {
    const days = this.heatmapData.days || [];
    if (days.length === 0) return;
    
    // Group days into weeks (Sunday = 0 start)
    this.weeks = [];
    let currentWeek = new Array(7).fill(null);
    
    days.forEach((day, i) => {
      const dayOfWeek = day.dayOfWeek;
      currentWeek[dayOfWeek] = day;
      
      // End week on Saturday or last day
      if (dayOfWeek === 6 || i === days.length - 1) {
        this.weeks.push([...currentWeek]);
        currentWeek = new Array(7).fill(null);
      }
    });
    
    // Get max count for intensity calculation
    this.maxCount = this.heatmapData.stats?.maxCount || 
                    Math.max(...days.map(d => d.count || 0), 1);
    
    // Track months for labels
    this.monthLabels = [];
    let lastMonth = -1;
    
    // Initialize cell states for animation
    this.cellStates = [];
    let cellIndex = 0;
    
    this.weeks.forEach((week, weekIdx) => {
      week.forEach((day, dayIdx) => {
        if (day) {
          // Track month changes for labels
          const date = new Date(day.date);
          const month = date.getMonth();
          if (month !== lastMonth) {
            lastMonth = month;
            this.monthLabels.push({ weekIdx, month });
          }
        }
        
        this.cellStates.push({
          weekIdx,
          dayIdx,
          day,
          opacity: 0,
          scale: 0.5,
          revealed: false,
          index: cellIndex++,
        });
      });
    });
  }

  /**
   * Get intensity level (0-4) based on count
   */
  getIntensityLevel(count) {
    if (!count || count === 0) return 0;
    const ratio = count / this.maxCount;
    if (ratio <= 0.25) return 1;
    if (ratio <= 0.50) return 2;
    if (ratio <= 0.75) return 3;
    return 4;
  }

  /**
   * Get color for intensity level
   */
  getIntensityColor(level) {
    const colors = [
      'rgba(30, 32, 38, 0.9)',        // Level 0 - empty
      'rgba(16, 163, 127, 0.30)',     // Level 1 - light
      'rgba(16, 163, 127, 0.50)',     // Level 2 - medium
      'rgba(16, 163, 127, 0.75)',     // Level 3 - high
      'rgba(16, 163, 127, 1.0)',      // Level 4 - maximum
    ];
    return colors[level] || colors[0];
  }

  /**
   * Setup all animations
   */
  setupAnimations() {
    // Title fade in (0-600ms)
    this.createTween({
      from: 0,
      to: 1,
      duration: 600,
      easing: Easing.easeOutCubic,
      onUpdate: (v) => { this.titleOpacity = v; },
    });
    
    // Subtitle fade in (200-700ms)
    this.createTween({
      from: 0,
      to: 1,
      duration: 500,
      delay: 200,
      easing: Easing.easeOutCubic,
      onUpdate: (v) => { this.subtitleOpacity = v; },
    });
    
    // Grid container fade in (400-800ms)
    this.createTween({
      from: 0,
      to: 1,
      duration: 400,
      delay: 400,
      easing: Easing.easeOutCubic,
      onUpdate: (v) => { this.gridOpacity = v; },
    });
    
    // Grid cells reveal with wave effect (500-2500ms)
    this.createTween({
      from: 0,
      to: 1,
      duration: 2000,
      delay: 500,
      easing: Easing.easeOutQuad,
      onUpdate: (v) => { this.gridRevealProgress = v; },
    });
    
    // Legend fade in (1800ms)
    this.createTween({
      from: 0,
      to: 1,
      duration: 400,
      delay: 1800,
      easing: Easing.easeOutCubic,
      onUpdate: (v) => { this.legendOpacity = v; },
    });
    
    // Stats cards fade in (2000ms)
    this.createTween({
      from: 0,
      to: 1,
      duration: 500,
      delay: 2000,
      easing: Easing.easeOutCubic,
      onUpdate: (v) => { this.statsOpacity = v; },
    });
    
    // Busiest day highlight (3000ms)
    this.createTween({
      from: 0,
      to: 1,
      duration: 400,
      delay: 3000,
      easing: Easing.easeOutCubic,
      onUpdate: (v) => { this.highlightOpacity = v; },
      onComplete: () => {
        this.particles.sparkle(this.centerX, this.highlightY, 12, {
          colors: ['#ffd700', '#10a37f', '#ffffff'],
        });
      },
    });
    
    // Start counters
    this.activeDaysCounter.start(performance.now());
    this.streakCounter.start(performance.now());
    this.rateCounter.start(performance.now());
  }

  /**
   * Update animations each frame
   */
  updateElements(sceneTime, deltaTime, progress) {
    // Update counters
    this.activeDaysCounter.update(performance.now());
    this.streakCounter.update(performance.now());
    this.rateCounter.update(performance.now());
    
    // Update particles
    this.particles.update(performance.now());
    this.ambientParticles.update(performance.now());
    
    // Animate cell reveals (wave from left to right)
    const totalCells = this.cellStates.length;
    const revealedCount = Math.floor(this.gridRevealProgress * totalCells * 1.1);
    
    this.cellStates.forEach((cell, i) => {
      // Sort by week for left-to-right wave
      const waveIndex = cell.weekIdx * 7 + cell.dayIdx;
      
      if (waveIndex < revealedCount && !cell.revealed) {
        cell.revealed = true;
        cell.opacity = 1;
        cell.scale = 1;
      }
    });
  }

  /**
   * Render scene content
   */
  renderContent(ctx, sceneTime, progress) {
    // Animated gradient background
    this.drawAnimatedGradient(ctx, 'dark', sceneTime);
    
    // Ambient floating particles
    this.ambientParticles.draw(ctx);
    
    // Subtle radial glow behind grid
    this.drawPulsingGlow(ctx, this.centerX, this.gridY + 80, {
      baseRadius: this.width * 0.4,
      color: this.colors.accentGlow,
      intensity: 0.12,
      time: sceneTime,
    });
    
    // Title
    this.drawTitle(ctx);
    
    // Heatmap grid
    this.drawHeatmapGrid(ctx);
    
    // Legend
    this.drawLegend(ctx);
    
    // Stats row
    this.drawStats(ctx);
    
    // Busiest day highlight
    this.drawHighlight(ctx);
    
    // Particles on top
    this.particles.draw(ctx);
  }

  /**
   * Draw title - clean and modern
   */
  drawTitle(ctx) {
    if (this.titleOpacity <= 0) return;
    
    ctx.save();
    
    const fontSize = this.isPortrait ? 52 : 64;
    const subtitleSize = this.isPortrait ? 22 : 26;
    
    // Main title
    ctx.globalAlpha = this.titleOpacity;
    this.drawGlowText(ctx, 'Your Activity', this.centerX, this.titleY, {
      font: `bold ${fontSize}px Outfit, sans-serif`,
      color: this.colors.text,
      glowColor: this.colors.accentGlow,
      glowBlur: 25,
    });
    
    // Subtitle
    ctx.globalAlpha = this.subtitleOpacity;
    this.drawText(ctx, 'Every conversation throughout the year', this.centerX, this.titleY + fontSize * 0.8, {
      font: `${subtitleSize}px Outfit, sans-serif`,
      color: this.colors.textMuted,
    });
    
    ctx.restore();
  }

  /**
   * Draw the heatmap grid with cells
   */
  drawHeatmapGrid(ctx) {
    if (this.weeks.length === 0 || this.gridOpacity <= 0) return;
    
    const totalWeeks = this.weeks.length;
    const cellTotal = this.cellSize + this.cellGap;
    const gridWidth = totalWeeks * cellTotal;
    const gridHeight = 7 * cellTotal;
    
    // Center the grid
    const startX = this.centerX - gridWidth / 2 + 30; // Offset for day labels
    const gridTop = this.gridY + 30; // Space for month labels
    
    ctx.save();
    ctx.globalAlpha = this.gridOpacity;
    
    // Draw month labels
    this.drawMonthLabels(ctx, startX, cellTotal, gridTop);
    
    // Draw day labels
    this.drawDayLabels(ctx, startX - 35, gridTop, cellTotal);
    
    // Draw cells
    this.cellStates.forEach((cell) => {
      if (!cell.revealed) return;
      
      const x = startX + cell.weekIdx * cellTotal;
      const y = gridTop + cell.dayIdx * cellTotal;
      const level = this.getIntensityLevel(cell.day?.count || 0);
      
      ctx.globalAlpha = this.gridOpacity * cell.opacity;
      
      // Cell
      ctx.fillStyle = this.getIntensityColor(level);
      ctx.beginPath();
      ctx.roundRect(x, y, this.cellSize, this.cellSize, 3);
      ctx.fill();
      
      // Glow for high activity
      if (level >= 3) {
        ctx.shadowColor = this.colors.accent;
        ctx.shadowBlur = level === 4 ? 8 : 4;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    });
    
    ctx.restore();
  }

  /**
   * Draw month labels above grid
   */
  drawMonthLabels(ctx, startX, cellWidth, gridTop) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const fontSize = this.isPortrait ? 14 : 16;
    ctx.font = `${fontSize}px Outfit, sans-serif`;
    ctx.fillStyle = this.colors.textMuted;
    ctx.textBaseline = 'bottom';
    ctx.textAlign = 'left';
    
    this.monthLabels.forEach(({ weekIdx, month }) => {
      const x = startX + weekIdx * cellWidth;
      ctx.fillText(months[month], x, gridTop - 8);
    });
  }

  /**
   * Draw day labels (Mon, Wed, Fri)
   */
  drawDayLabels(ctx, startX, gridTop, cellHeight) {
    const days = ['', 'Mon', '', 'Wed', '', 'Fri', ''];
    const fontSize = this.isPortrait ? 12 : 14;
    
    ctx.font = `${fontSize}px Outfit, sans-serif`;
    ctx.fillStyle = this.colors.textMuted;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'right';
    
    days.forEach((day, i) => {
      if (day) {
        const y = gridTop + i * cellHeight + this.cellSize / 2;
        ctx.fillText(day, startX, y);
      }
    });
  }

  /**
   * Draw legend showing intensity scale
   */
  drawLegend(ctx) {
    if (this.legendOpacity <= 0) return;
    
    ctx.save();
    ctx.globalAlpha = this.legendOpacity;
    
    const cellSize = this.isPortrait ? 14 : 18;
    const cellGap = 4;
    const legendWidth = 5 * (cellSize + cellGap) + 100;
    const startX = this.centerX - legendWidth / 2 + 30;
    const y = this.legendY;
    
    const fontSize = this.isPortrait ? 14 : 16;
    ctx.font = `${fontSize}px Outfit, sans-serif`;
    ctx.fillStyle = this.colors.textMuted;
    ctx.textBaseline = 'middle';
    
    // "Less" label
    ctx.textAlign = 'right';
    ctx.fillText('Less', startX - 10, y);
    
    // Legend cells
    for (let i = 0; i <= 4; i++) {
      const x = startX + i * (cellSize + cellGap);
      ctx.fillStyle = this.getIntensityColor(i);
      ctx.beginPath();
      ctx.roundRect(x, y - cellSize / 2, cellSize, cellSize, 3);
      ctx.fill();
    }
    
    // "More" label
    ctx.fillStyle = this.colors.textMuted;
    ctx.textAlign = 'left';
    ctx.fillText('More', startX + 5 * (cellSize + cellGap) + 10, y);
    
    ctx.restore();
  }

  /**
   * Draw stats row
   */
  drawStats(ctx) {
    if (this.statsOpacity <= 0) return;
    
    const stats = [
      {
        icon: '🔥',
        value: this.activeDaysCounter.getDisplayValue(),
        label: 'Active Days',
      },
      {
        icon: '⚡',
        value: this.streakCounter.getDisplayValue() + ' days',
        label: 'Best Streak',
      },
      {
        icon: '📈',
        value: Math.round(this.rateCounter.currentValue) + '%',
        label: 'Activity Rate',
      },
    ];
    
    ctx.save();
    ctx.globalAlpha = this.statsOpacity;
    
    const cardWidth = this.isPortrait ? 280 : 300;
    const cardHeight = this.isPortrait ? 90 : 100;
    const gap = this.isPortrait ? 20 : 30;
    const totalWidth = cardWidth * 3 + gap * 2;
    const startX = this.centerX - totalWidth / 2;
    
    stats.forEach((stat, i) => {
      const x = startX + i * (cardWidth + gap);
      const y = this.statsY;
      
      // Card background
      ctx.fillStyle = 'rgba(22, 24, 30, 0.9)';
      ctx.beginPath();
      ctx.roundRect(x, y, cardWidth, cardHeight, 16);
      ctx.fill();
      
      // Border
      ctx.strokeStyle = 'rgba(16, 163, 127, 0.25)';
      ctx.lineWidth = 1;
      ctx.stroke();
      
      // Icon
      const iconSize = this.isPortrait ? 28 : 32;
      ctx.font = `${iconSize}px sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(stat.icon, x + 20, y + cardHeight / 2 - 8);
      
      // Value
      const valueSize = this.isPortrait ? 28 : 34;
      ctx.font = `bold ${valueSize}px Outfit, sans-serif`;
      ctx.fillStyle = this.colors.text;
      ctx.fillText(stat.value, x + 65, y + cardHeight / 2 - 8);
      
      // Label
      const labelSize = this.isPortrait ? 14 : 16;
      ctx.font = `${labelSize}px Outfit, sans-serif`;
      ctx.fillStyle = this.colors.textMuted;
      ctx.fillText(stat.label, x + 65, y + cardHeight / 2 + 20);
    });
    
    ctx.restore();
  }

  /**
   * Draw busiest day highlight
   */
  drawHighlight(ctx) {
    if (this.highlightOpacity <= 0) return;
    
    const busiestDay = this.heatmapData.stats?.busiestDay;
    if (!busiestDay) return;
    
    const date = new Date(busiestDay.date);
    const formatted = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    
    const text = `🏆  Busiest Day: ${formatted} with ${busiestDay.count} messages`;
    
    ctx.save();
    ctx.globalAlpha = this.highlightOpacity;
    
    const fontSize = this.isPortrait ? 20 : 24;
    ctx.font = `${fontSize}px Outfit, sans-serif`;
    const textWidth = ctx.measureText(text).width;
    const pillWidth = textWidth + 50;
    const pillHeight = this.isPortrait ? 50 : 56;
    const pillX = this.centerX - pillWidth / 2;
    const pillY = this.highlightY - pillHeight / 2;
    
    // Pill background
    ctx.fillStyle = 'rgba(255, 215, 0, 0.10)';
    ctx.beginPath();
    ctx.roundRect(pillX, pillY, pillWidth, pillHeight, pillHeight / 2);
    ctx.fill();
    
    // Border
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.30)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    
    // Text
    ctx.fillStyle = '#ffd700';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, this.centerX, this.highlightY);
    
    ctx.restore();
  }

  exit() {
    super.exit();
    this.particles.clear();
  }
}

// Register scene
window.SceneHeatmap = SceneHeatmap;
