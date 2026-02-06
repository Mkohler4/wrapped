// ============================================
// Slide 8: Evolution Timeline - Your ChatGPT Journey
// ============================================
// Dependencies: state.js (currentEvolutionData, monthlyTrendData, aiInsights)
// DOM elements: evolutionIcon, evolutionTitle, evolutionSubtitle, evolutionChart,
//               evolutionArea, evolutionLine, evolutionPoints, evolutionGrid,
//               evolutionAxis, evolutionTooltip, evolutionHoverLine,
//               messagesChange, messagesOld, messagesNew, depthChange, depthOld, depthNew,
//               varietyChange, varietyOld, varietyNew, oldTopics, recentTopics,
//               evolutionMilestone, peakMonthValue

// Note: currentEvolutionData and monthlyTrendData are defined in app.js

/**
 * Fetch evolution comparison data from API
 * @param {number} periods - Number of periods to compare (default: 2)
 * @param {string} dateRange - Optional date range filter ('1year', '6months', '3months')
 * @returns {Object|null} Evolution data or null on error
 */
async function fetchEvolutionData(periods = 2, dateRange = null) {
  try {
    let url = `/api/wrapped/evolution?periods=${periods}`;
    
    if (dateRange) {
      const now = new Date();
      let fromDate;
      
      switch (dateRange) {
        case '1year':
          fromDate = new Date(now);
          fromDate.setFullYear(fromDate.getFullYear() - 1);
          break;
        case '6months':
          fromDate = new Date(now);
          fromDate.setMonth(fromDate.getMonth() - 6);
          break;
        case '3months':
          fromDate = new Date(now);
          fromDate.setMonth(fromDate.getMonth() - 3);
          break;
      }
      
      if (fromDate) {
        url += `&from=${fromDate.toISOString().split('T')[0]}`;
      }
    }
    
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch evolution data');
    
    currentEvolutionData = await response.json();
    return currentEvolutionData;
  } catch (error) {
    console.error('Evolution API error:', error);
    return null;
  }
}

/**
 * Populate the Evolution slide with initial data from stats
 * @param {Object} s - Stats object with enhanced.monthlyTrend, enhanced.topicsOld, etc.
 * @param {Object} aiInsights - AI insights object
 */
function populateEvolutionSlide(s, aiInsights) {
  const enhanced = s.enhanced || {};
  const oldTopics = enhanced.topicsOld || [];
  const recentTopics = enhanced.topicsRecent || [];
  
  // Render the monthly trend chart if data is available
  if (enhanced.monthlyTrend && enhanced.monthlyTrend.length > 0) {
    renderEvolutionChart(enhanced.monthlyTrend);
  }
  
  // Update topic boxes with new format
  const oldTopicsEl = document.getElementById('oldTopics');
  const recentTopicsEl = document.getElementById('recentTopics');
  if (oldTopicsEl) {
    oldTopicsEl.innerHTML = oldTopics.length > 0 
      ? oldTopics.slice(0, 4).map(t => `<span class="era-topic">${t.topic}</span>`).join('') 
      : '<span class="era-topic" style="opacity: 0.5">No data</span>';
  }
  if (recentTopicsEl) {
    recentTopicsEl.innerHTML = recentTopics.length > 0
      ? recentTopics.slice(0, 4).map(t => `<span class="era-topic">${t.topic}</span>`).join('')
      : '<span class="era-topic" style="opacity: 0.5">No data</span>';
  }
  
  // Set initial headline based on trend
  const trendPct = enhanced.trendDirection || 0;
  const trendEmoji = trendPct > 20 ? '📈' : trendPct > 0 ? '↗️' : trendPct > -20 ? '↘️' : '📉';
  const trendWord = trendPct > 20 ? 'Power User Rising' : 
                    trendPct > 0 ? 'Steady Growth' :
                    trendPct > -20 ? 'Taking a Break' : 'Detoxing';
  
  const iconEl = document.getElementById('evolutionIcon');
  const titleEl = document.getElementById('evolutionTitle');
  const subtitleEl = document.getElementById('evolutionSubtitle');
  
  if (iconEl) iconEl.textContent = trendEmoji;
  if (titleEl) titleEl.textContent = trendWord;
  if (subtitleEl) {
    subtitleEl.textContent = aiInsights?.trendInsight || 
      (trendPct > 20 ? 'Your ChatGPT usage is accelerating. AI power user incoming!' :
       trendPct > 0 ? 'Steady as she goes. Consistent AI companion vibes.' :
       trendPct > -20 ? 'Taking some healthy breaks from AI.' : 'Trying to break free? Good luck with that.');
  }
}

/**
 * Render the SVG-based evolution timeline chart
 * @param {Array} monthlyData - Array of {month, count, topics?} objects
 * @param {string} peakMonth - Optional peak month identifier
 */
function renderEvolutionChart(monthlyData, peakMonth = null) {
  const svg = document.getElementById('evolutionChart');
  const areaEl = document.getElementById('evolutionArea');
  const lineEl = document.getElementById('evolutionLine');
  const pointsContainer = document.getElementById('evolutionPoints');
  const gridContainer = document.getElementById('evolutionGrid');
  const axisContainer = document.getElementById('evolutionAxis');
  const tooltip = document.getElementById('evolutionTooltip');
  const hoverLine = document.getElementById('evolutionHoverLine');
  
  if (!svg || !monthlyData || monthlyData.length < 2) {
    console.log('Evolution chart: insufficient data');
    return;
  }
  
  const padding = { left: 20, right: 20, top: 20, bottom: 20 };
  const width = 800;
  const height = 200;
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  
  // Get values and find max
  const values = monthlyData.map(d => d.count ?? d.conversations ?? 0);
  const maxValue = Math.max(...values, 1);
  const minValue = Math.min(...values);
  
  // Generate points
  const points = monthlyData.map((d, i) => {
    const x = padding.left + (i / (monthlyData.length - 1)) * chartWidth;
    const value = d.count ?? d.conversations ?? 0;
    const y = padding.top + chartHeight - ((value - minValue) / (maxValue - minValue || 1)) * chartHeight;
    return { x, y, data: d, index: i };
  });
  
  // Find peak point
  const peakIndex = values.indexOf(Math.max(...values));
  
  // Create line path
  const linePath = points.map((p, i) => 
    (i === 0 ? 'M' : 'L') + ` ${p.x.toFixed(1)} ${p.y.toFixed(1)}`
  ).join(' ');
  
  // Create area path (closed to bottom)
  const areaPath = linePath + 
    ` L ${points[points.length - 1].x.toFixed(1)} ${height - padding.bottom}` +
    ` L ${padding.left} ${height - padding.bottom} Z`;
  
  // Draw grid lines
  gridContainer.innerHTML = '';
  const gridLines = 4;
  for (let i = 0; i <= gridLines; i++) {
    const y = padding.top + (i / gridLines) * chartHeight;
    gridContainer.innerHTML += `<line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}"/>`;
  }
  
  // Update paths
  areaEl.setAttribute('d', areaPath);
  lineEl.setAttribute('d', linePath);
  
  // Create data points
  pointsContainer.innerHTML = points.map((p, i) => {
    const isPeak = i === peakIndex;
    const delay = i * 0.05 + 0.8; // Stagger after line draws
    return `
      <circle 
        class="evolution-point animated ${isPeak ? 'peak' : ''}" 
        cx="${p.x}" 
        cy="${p.y}" 
        r="0"
        data-index="${i}"
        style="animation-delay: ${delay}s"
      />
    `;
  }).join('');
  
  // Axis labels (show every 3rd month or so)
  const labelInterval = Math.max(1, Math.floor(monthlyData.length / 8));
  axisContainer.innerHTML = monthlyData
    .filter((_, i) => i % labelInterval === 0 || i === monthlyData.length - 1)
    .map((d, i, arr) => {
      const date = d.date ? new Date(d.date) : new Date(d.month + '-01');
      const label = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      const isLast = i === arr.length - 1;
      return `<span class="evolution-axis-label ${isLast ? 'highlight' : ''}">${label}</span>`;
    }).join('');
  
  // Hover interaction
  const chartContainer = document.querySelector('.evolution-chart-container');
  
  chartContainer.addEventListener('mousemove', (e) => {
    const rect = chartContainer.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const chartX = (x / rect.width) * width;
    
    // Find nearest point
    let nearestPoint = points[0];
    let minDist = Math.abs(chartX - points[0].x);
    points.forEach(p => {
      const dist = Math.abs(chartX - p.x);
      if (dist < minDist) {
        minDist = dist;
        nearestPoint = p;
      }
    });
    
    // Show hover line
    hoverLine.setAttribute('x1', nearestPoint.x);
    hoverLine.setAttribute('x2', nearestPoint.x);
    hoverLine.style.display = 'block';
    
    // Update tooltip
    const rawDate = nearestPoint.data.date ? new Date(nearestPoint.data.date) : new Date(nearestPoint.data.month + '-01');
    const monthLabel = rawDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    
    document.getElementById('tooltipMonth').textContent = monthLabel;
    const value = nearestPoint.data.count ?? nearestPoint.data.conversations ?? 0;
    document.getElementById('tooltipValue').textContent = `${value.toLocaleString()} messages`;
    
    // Show top topics if available
    const topicsEl = document.getElementById('tooltipTopics');
    if (nearestPoint.data.topics && nearestPoint.data.topics.length > 0) {
      topicsEl.innerHTML = nearestPoint.data.topics.slice(0, 3).map(t => `<span>${t}</span>`).join('');
    } else {
      topicsEl.innerHTML = '';
    }
    
    // Position tooltip
    const tooltipX = (nearestPoint.x / width) * rect.width;
    const tooltipY = (nearestPoint.y / height) * rect.height - 60;
    tooltip.style.left = `${tooltipX}px`;
    tooltip.style.top = `${Math.max(10, tooltipY)}px`;
    tooltip.classList.add('visible');
  });
  
  chartContainer.addEventListener('mouseleave', () => {
    hoverLine.style.display = 'none';
    tooltip.classList.remove('visible');
  });
  
  // Store for later use
  monthlyTrendData = monthlyData;
}

/**
 * Update the evolution UI with data from API
 * @param {Object} data - Evolution data from API with periods and changes
 */
function updateEvolutionUI(data) {
  if (!data || !data.periods || data.periods.length < 2) return;
  
  const firstPeriod = data.periods[0];
  const lastPeriod = data.periods[data.periods.length - 1];
  
  // Update headline
  const changePercent = data.changes.messageCount;
  const trendEmoji = changePercent > 20 ? '📈' : changePercent > 0 ? '↗️' : changePercent > -20 ? '↘️' : '📉';
  const trendWord = changePercent > 20 ? 'Power User Rising' : 
                    changePercent > 0 ? 'Steady Growth' :
                    changePercent > -20 ? 'Taking a Break' : 'Detoxing';
  
  const iconEl = document.getElementById('evolutionIcon');
  const titleEl = document.getElementById('evolutionTitle');
  const subtitleEl = document.getElementById('evolutionSubtitle');
  
  if (iconEl) iconEl.textContent = trendEmoji;
  if (titleEl) titleEl.textContent = trendWord;
  
  // Generate insight subtitle
  const avgChange = data.changes.avgMessagesPerConvo;
  if (subtitleEl) {
    if (avgChange > 30) {
      subtitleEl.textContent = `Your conversations are ${avgChange}% deeper now. Quality over quantity!`;
    } else if (changePercent > 20) {
      subtitleEl.textContent = 'Your ChatGPT usage is accelerating. AI power user incoming!';
    } else if (changePercent < -20) {
      subtitleEl.textContent = 'Taking some healthy breaks from AI. Or maybe just too busy?';
    } else {
      subtitleEl.textContent = 'Steady as she goes. Consistent AI companion vibes.';
    }
  }
  
  // Update metrics cards
  const msgOld = Math.round(firstPeriod.stats.messageCount / 4); // Rough weekly
  const msgNew = Math.round(lastPeriod.stats.messageCount / 4);
  const depthOld = Math.round(firstPeriod.stats.avgMessagesPerConvo);
  const depthNew = Math.round(lastPeriod.stats.avgMessagesPerConvo);
  const topicsOld = firstPeriod.stats.topTopics.length;
  const topicsNew = lastPeriod.stats.topTopics.length;
  
  updateMetricCard('messagesChange', 'messagesOld', 'messagesNew', data.changes.messageCount, msgOld, msgNew);
  updateMetricCard('depthChange', 'depthOld', 'depthNew', data.changes.avgMessagesPerConvo, depthOld, depthNew);
  updateMetricCard('varietyChange', 'varietyOld', 'varietyNew', 
    Math.round(((topicsNew - topicsOld) / Math.max(topicsOld, 1)) * 100), topicsOld, topicsNew);
  
  // Update topic evolution (Then vs Now)
  const oldTopicsEl = document.getElementById('oldTopics');
  const recentTopicsEl = document.getElementById('recentTopics');
  
  if (oldTopicsEl && firstPeriod.stats.topTopics.length > 0) {
    oldTopicsEl.innerHTML = firstPeriod.stats.topTopics.slice(0, 4).map(t => 
      `<span class="era-topic">${t.topic}</span>`
    ).join('');
  }
  if (recentTopicsEl && lastPeriod.stats.topTopics.length > 0) {
    recentTopicsEl.innerHTML = lastPeriod.stats.topTopics.slice(0, 4).map(t => 
      `<span class="era-topic">${t.topic}</span>`
    ).join('');
  }
  
  // Update milestone
  if (data.milestones && data.milestones.length > 0) {
    const milestoneEl = document.getElementById('evolutionMilestone');
    const peakValueEl = document.getElementById('peakMonthValue');
    const peakMilestone = data.milestones.find(m => m.event.includes('Peak'));
    if (peakMilestone && peakValueEl) {
      peakValueEl.textContent = peakMilestone.event.replace('Peak month: ', '');
    }
  }
}

/**
 * Helper to update a metric card with change percentage and values
 */
function updateMetricCard(changeId, oldId, newId, changePct, oldVal, newVal) {
  const changeEl = document.getElementById(changeId);
  const oldEl = document.getElementById(oldId);
  const newEl = document.getElementById(newId);
  
  if (changeEl) {
    changeEl.textContent = changePct >= 0 ? `+${changePct}%` : `${changePct}%`;
    changeEl.classList.toggle('decrease', changePct < 0);
  }
  if (oldEl) oldEl.textContent = oldVal;
  if (newEl) newEl.textContent = newVal;
}

/**
 * Render topic markers along the timeline
 * @param {Array} monthlyData - Monthly data array
 * @param {Array} oldTopics - Topics from early period
 * @param {Array} recentTopics - Topics from recent period
 */
function renderEvolutionTopicMarkers(monthlyData, oldTopics, recentTopics) {
  const container = document.getElementById('evolutionTopicsTimeline');
  if (!container || !monthlyData || monthlyData.length < 2) return;
  
  const markers = [];
  
  // Add old topics at ~15% position
  if (oldTopics && oldTopics.length > 0) {
    markers.push({
      topic: oldTopics[0].topic || oldTopics[0],
      position: 12,
      era: 'old',
      delay: 0.5
    });
  }
  
  // Add recent topics at ~85% position  
  if (recentTopics && recentTopics.length > 0) {
    markers.push({
      topic: recentTopics[0].topic || recentTopics[0],
      position: 88,
      era: 'new',
      delay: 0.8
    });
  }
  
  container.innerHTML = markers.map(m => `
    <div class="topic-marker era-${m.era}" style="left: ${m.position}%; animation-delay: ${m.delay}s;">
      <div class="topic-line"></div>
      <div class="topic-label">${m.topic}</div>
    </div>
  `).join('');
}

/**
 * Change evolution time range and re-render the chart
 * @param {string} range - 'all', '1year', '6months', or '3months'
 */
async function changeEvolutionRange(range) {
  // Update active button state with animation
  const buttons = document.querySelectorAll('.time-range-selector .time-range-btn');
  const targetBtn = document.querySelector(`.time-range-btn[data-range="${range}"]`);
  
  // Skip if already active
  if (targetBtn && targetBtn.classList.contains('active')) {
    return;
  }
  
  // Remove active and animation classes from all buttons
  buttons.forEach(btn => {
    btn.classList.remove('active', 'btn-pop');
  });
  
  // Add active class and trigger animation
  if (targetBtn) {
    // Small delay ensures the removal is processed first
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        targetBtn.classList.add('active', 'btn-pop');
      });
    });
  }
  
  // Get the full monthly trend data (stored globally from stats)
  const fullMonthlyData = stats?.enhanced?.monthlyTrend || monthlyTrendData;
  
  if (!fullMonthlyData || fullMonthlyData.length === 0) {
    console.log('No monthly data available for range change');
    return;
  }
  
  let filteredData = fullMonthlyData;
  
  if (range !== 'all') {
    // Filter data based on selected range
    const now = new Date();
    let fromDate;
    
    switch (range) {
      case '1year':
        fromDate = new Date(now);
        fromDate.setFullYear(fromDate.getFullYear() - 1);
        break;
      case '6months':
        fromDate = new Date(now);
        fromDate.setMonth(fromDate.getMonth() - 6);
        break;
      case '3months':
        fromDate = new Date(now);
        fromDate.setMonth(fromDate.getMonth() - 3);
        break;
    }
    
    if (fromDate) {
      filteredData = fullMonthlyData.filter(d => {
        const dDate = d.date ? new Date(d.date) : new Date(d.month + '-01');
        return dDate >= fromDate;
      });
    }
  }
  
  // Re-render the chart with filtered data
  if (filteredData.length > 0) {
    renderEvolutionChart(filteredData);
    
    // Update the trend headline based on filtered data
    updateEvolutionHeadline(filteredData);
  }
  
  console.log(`Evolution range changed to ${range}: ${filteredData.length} months`);
}

/**
 * Update the evolution headline based on current data range
 * @param {Array} monthlyData - Filtered monthly data
 */
function updateEvolutionHeadline(monthlyData) {
  if (!monthlyData || monthlyData.length < 2) return;
  
  // Compare first half to second half of the filtered range
  const midpoint = Math.floor(monthlyData.length / 2);
  const firstHalf = monthlyData.slice(0, midpoint);
  const secondHalf = monthlyData.slice(midpoint);
  
  const firstAvg = firstHalf.reduce((a, b) => a + (b.count ?? b.conversations ?? 0), 0) / (firstHalf.length || 1);
  const secondAvg = secondHalf.reduce((a, b) => a + (b.count ?? b.conversations ?? 0), 0) / (secondHalf.length || 1);
  
  const trendPct = firstAvg > 0 ? Math.round((secondAvg - firstAvg) / firstAvg * 100) : 0;
  
  const trendEmoji = trendPct > 20 ? '📈' : trendPct > 0 ? '↗️' : trendPct > -20 ? '↘️' : '📉';
  const trendWord = trendPct > 20 ? 'Power User Rising' : 
                    trendPct > 0 ? 'Steady Growth' :
                    trendPct > -20 ? 'Taking a Break' : 'Detoxing';
  
  const iconEl = document.getElementById('evolutionIcon');
  const titleEl = document.getElementById('evolutionTitle');
  const subtitleEl = document.getElementById('evolutionSubtitle');
  
  if (iconEl) iconEl.textContent = trendEmoji;
  if (titleEl) titleEl.textContent = trendWord;
  
  // Generate a dynamic subtitle
  if (subtitleEl) {
    const totalMsgs = monthlyData.reduce((a, b) => a + (b.count ?? b.conversations ?? 0), 0);
    const startDate = monthlyData[0].date ? new Date(monthlyData[0].date) : new Date(monthlyData[0].month + '-01');
    const endDate = monthlyData[monthlyData.length - 1].date
      ? new Date(monthlyData[monthlyData.length - 1].date)
      : new Date(monthlyData[monthlyData.length - 1].month + '-01');
    const startLabel = startDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    const endLabel = endDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    
    if (trendPct > 20) {
      subtitleEl.textContent = `Your usage grew ${trendPct}% from ${startLabel} to ${endLabel}. AI power user incoming!`;
    } else if (trendPct > 0) {
      subtitleEl.textContent = `Steady ${trendPct}% growth from ${startLabel} to ${endLabel}. Consistent AI companion vibes.`;
    } else if (trendPct > -20) {
      subtitleEl.textContent = `Usage trend: ${trendPct}% from ${startLabel} to ${endLabel}. Taking healthy breaks.`;
    } else {
      subtitleEl.textContent = `Your usage trend suggests you're evolving to become more selective with your inquiries—like a fine wine connoisseur, you're now savoring rather than gulping.`;
    }
  }
}

/**
 * Legacy function for backwards compatibility
 */
function changeEvolutionPeriod(periods, dateRange = null) {
  // Redirect to new range-based function
  if (dateRange) {
    changeEvolutionRange(dateRange);
  } else {
    changeEvolutionRange('all');
  }
}

// Make slide functions globally available
window.fetchEvolutionData = fetchEvolutionData;
window.populateEvolutionSlide = populateEvolutionSlide;
window.renderEvolutionChart = renderEvolutionChart;
window.updateEvolutionUI = updateEvolutionUI;
window.updateMetricCard = updateMetricCard;
window.renderEvolutionTopicMarkers = renderEvolutionTopicMarkers;
window.changeEvolutionPeriod = changeEvolutionPeriod;
window.changeEvolutionRange = changeEvolutionRange;
window.updateEvolutionHeadline = updateEvolutionHeadline;

