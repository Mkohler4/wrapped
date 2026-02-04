// ============================================
// Slide 14: Activity Heatmap - GitHub-style Calendar
// ============================================
// Dependencies: utils.js (animateCountUp), state.js (heatmapData, heatmapSlideAnimated)
// DOM elements: heatmapGrid, heatmapMonths, heatmapActiveDays, heatmapStreak, heatmapRate,
//               heatmapActiveDaysBar, heatmapStreakDots, heatmapRingFill, heatmapBusiestDay,
//               heatmapTooltip, tooltipDate, tooltipCount

// Note: heatmapData, heatmapSlideAnimated are defined in app.js

/**
 * Fetch heatmap data from API
 * @returns {Object|null} Heatmap data with days array and stats
 */
async function fetchHeatmapData() {
  try {
    const response = await fetch('/api/wrapped/heatmap?months=12');
    if (!response.ok) throw new Error('Failed to fetch heatmap data');
    heatmapData = await response.json();
    return heatmapData;
  } catch (error) {
    console.error('Heatmap API error:', error);
    return null;
  }
}

/**
 * Render the GitHub-style activity heatmap grid
 * @param {Object} data - Heatmap data with days array and stats
 */
function renderHeatmap(data) {
  if (!data || !data.days) return;
  
  const grid = document.getElementById('heatmapGrid');
  const monthsContainer = document.getElementById('heatmapMonths');
  
  if (!grid) return;
  
  // Group days by week
  const weeks = [];
  let currentWeek = [];
  let currentMonth = null;
  const months = [];
  
  data.days.forEach((day, i) => {
    const date = new Date(day.date);
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    
    // Track month changes for labels
    if (month !== currentMonth) {
      currentMonth = month;
      months.push({ name: month, weekIndex: weeks.length });
    }
    
    currentWeek.push(day);
    
    // End of week (Saturday) or last day
    if (day.dayOfWeek === 6 || i === data.days.length - 1) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });
  
  // Calculate intensity levels
  const maxCount = data.stats.maxCount;
  const getLevel = (count) => {
    if (count === 0) return 0;
    if (count <= maxCount * 0.25) return 1;
    if (count <= maxCount * 0.5) return 2;
    if (count <= maxCount * 0.75) return 3;
    return 4;
  };
  
  // Render month labels
  if (monthsContainer) {
    monthsContainer.innerHTML = months.map((m, i) => {
      const nextMonth = months[i + 1];
      const weekSpan = (nextMonth ? nextMonth.weekIndex : weeks.length) - m.weekIndex;
      return `<span class="heatmap-month-label" style="min-width: ${weekSpan * 15}px">${m.name}</span>`;
    }).join('');
  }
  
  // Render grid (cells start hidden, will be animated on slide view)
  let cellIndex = 0;
  grid.innerHTML = weeks.map(week => {
    // Pad incomplete weeks at the start
    const paddedWeek = [...Array(7 - week.length).fill(null), ...week];
    if (week[0]?.dayOfWeek !== 0) {
      const padding = week[0]?.dayOfWeek || 0;
      paddedWeek.splice(0, 7 - week.length);
      for (let i = 0; i < padding; i++) {
        paddedWeek.unshift(null);
      }
      paddedWeek.length = 7;
    }
    
    return `
      <div class="heatmap-week">
        ${paddedWeek.map(day => {
          if (!day) return '<div class="heatmap-cell level-0" style="visibility: hidden;"></div>';
          const level = getLevel(day.count);
          const idx = cellIndex++;
          return `<div class="heatmap-cell level-${level}" 
            data-date="${day.date}" 
            data-count="${day.count}"
            data-cell-index="${idx}"
            onmouseenter="showHeatmapTooltip(event)"
            onmouseleave="hideHeatmapTooltip()"></div>`;
        }).join('')}
      </div>
    `;
  }).join('');
  
  // Store stats data for animation (don't display values yet)
  const activeDaysEl = document.getElementById('heatmapActiveDays');
  const streakEl = document.getElementById('heatmapStreak');
  const rateEl = document.getElementById('heatmapRate');
  
  if (activeDaysEl) activeDaysEl.dataset.target = data.stats.activeDays;
  if (streakEl) streakEl.dataset.target = data.stats.longestStreak;
  if (rateEl) rateEl.dataset.target = data.stats.activityRate;
  
  // Set up busiest day highlight
  const busiestDayEl = document.getElementById('heatmapBusiestDay');
  if (busiestDayEl && data.stats.busiestDay) {
    const busiestDate = new Date(data.stats.busiestDay.date);
    const formatted = busiestDate.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
    busiestDayEl.textContent = `${formatted} (${data.stats.busiestDay.count} messages)`;
  }
}

/**
 * Animate heatmap slide when it becomes visible
 */
function animateHeatmapSlide() {
  if (!heatmapData || heatmapSlideAnimated) return;
  heatmapSlideAnimated = true;
  
  // Animate only ACTIVE heatmap cells (level-1 through level-4) with staggered reveal
  // Level-0 (grey/inactive) cells are already visible via CSS
  const activeCells = document.querySelectorAll('.heatmap-cell.level-1, .heatmap-cell.level-2, .heatmap-cell.level-3, .heatmap-cell.level-4');
  const baseDelay = 8; // ms per cell
  const maxDelay = 1000; // cap the total animation time
  
  activeCells.forEach((cell, i) => {
    const delay = Math.min(i * baseDelay, maxDelay);
    setTimeout(() => {
      cell.classList.add('animated');
    }, delay);
  });
  
  // Animate stats with count-up after cells start appearing
  setTimeout(() => {
    // Active days count-up
    const activeDaysEl = document.getElementById('heatmapActiveDays');
    if (activeDaysEl) {
      const target = parseInt(activeDaysEl.dataset.target) || 0;
      animateCountUp(activeDaysEl, target, 1500);
      
      // Animate the bar based on activity rate (active days / total days)
      const barFill = document.getElementById('heatmapActiveDaysBar');
      if (barFill && heatmapData.stats) {
        const percent = (heatmapData.stats.activeDays / heatmapData.stats.totalDays) * 100;
        setTimeout(() => {
          barFill.style.width = `${Math.min(percent, 100)}%`;
        }, 100);
      }
    }
    
    // Streak count-up
    const streakEl = document.getElementById('heatmapStreak');
    if (streakEl) {
      const target = parseInt(streakEl.dataset.target) || 0;
      animateCountUp(streakEl, target, 1500);
      
      // Animate streak dots
      const dotsContainer = document.getElementById('heatmapStreakDots');
      if (dotsContainer && target > 0) {
        const dotCount = Math.min(target, 14); // Cap at 14 dots
        dotsContainer.innerHTML = Array(dotCount).fill(0).map((_, i) => 
          `<div class="heatmap-streak-dot" style="animation-delay: ${i * 60}ms"></div>`
        ).join('');
      }
    }
    
    // Activity rate count-up with ring animation
    const rateEl = document.getElementById('heatmapRate');
    if (rateEl) {
      const target = parseInt(rateEl.dataset.target) || 0;
      
      // Count up with % suffix
      let current = 0;
      const duration = 1500;
      const startTime = performance.now();
      
      const updateRate = (timestamp) => {
        const elapsed = timestamp - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
        current = Math.round(eased * target);
        rateEl.textContent = `${current}%`;
        
        if (progress < 1) {
          requestAnimationFrame(updateRate);
        }
      };
      requestAnimationFrame(updateRate);
      
      // Animate the ring
      const ringFill = document.getElementById('heatmapRingFill');
      if (ringFill) {
        setTimeout(() => {
          ringFill.style.strokeDasharray = `${target}, 100`;
        }, 100);
      }
    }
  }, 400);
}

/**
 * Show tooltip on heatmap cell hover
 * @param {Event} event - Mouse event
 */
function showHeatmapTooltip(event) {
  const tooltip = document.getElementById('heatmapTooltip');
  const cell = event.target;
  if (!tooltip || !cell) return;
  
  // Read data directly from the cell's data attributes
  const date = cell.dataset.date;
  const count = parseInt(cell.dataset.count) || 0;
  
  const dateObj = new Date(date);
  const formattedDate = dateObj.toLocaleDateString('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  });
  
  const tooltipDateEl = document.getElementById('tooltipDate');
  const tooltipCountContainer = document.querySelector('.heatmap-tooltip-count');
  
  if (tooltipDateEl) tooltipDateEl.textContent = formattedDate;
  
  // Show "No activity" for days with 0 messages, otherwise show count
  if (tooltipCountContainer) {
    tooltipCountContainer.innerHTML = count === 0 
      ? '<span style="color: var(--text-muted);">No activity</span>'
      : `<span id="tooltipCount">${count.toLocaleString()}</span> messages`;
  }
  
  tooltip.style.left = `${event.pageX + 10}px`;
  tooltip.style.top = `${event.pageY - 40}px`;
  tooltip.classList.add('visible');
}

/**
 * Hide heatmap tooltip
 */
function hideHeatmapTooltip() {
  const tooltip = document.getElementById('heatmapTooltip');
  if (tooltip) tooltip.classList.remove('visible');
}

// Make slide functions globally available
window.fetchHeatmapData = fetchHeatmapData;
window.renderHeatmap = renderHeatmap;
window.animateHeatmapSlide = animateHeatmapSlide;
window.showHeatmapTooltip = showHeatmapTooltip;
window.hideHeatmapTooltip = hideHeatmapTooltip;

