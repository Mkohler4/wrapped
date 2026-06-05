// ============================================
// Slide 7: Time Personality - When You Think
// ============================================
// Dependencies: utils.js (animateCountUp), state.js (timeSlideData, timeSlideAnimated)
// DOM elements: peakHourNum, peakHourPeriod, peakHourCount, timeWheelSvg, timeWheelIcon,
//               timeWheelTooltip, tooltipHour, tooltipCount, dayMsgCount, nightMsgCount,
//               dayMsgBar, nightMsgBar, timeSignature, timeSigIcon, timeSigText, timeParticlesBg

/**
 * Populate the Time Personality slide with hourly activity data
 * @param {Object} s - Stats object with byHour/hourCounts array and peakHour
 */
function populateTimeSlide(s) {
  // Support both byHour (from DB) and hourCounts (from file analysis)
  const byHour = s.byHour || s.hourCounts;
  
  if (!byHour || byHour.length !== 24) {
    console.log('Time slide: Missing hourly data');
    return;
  }
  const peakHour = s.peakHour ?? byHour.indexOf(Math.max(...byHour));
  const peakCount = byHour[peakHour];
  
  // Calculate day vs night totals
  // Day: 6am-6pm (hours 6-17), Night: 6pm-6am (hours 18-23, 0-5)
  let dayCount = 0;
  let nightCount = 0;
  
  for (let h = 0; h < 24; h++) {
    if (h >= 6 && h < 18) {
      dayCount += byHour[h];
    } else {
      nightCount += byHour[h];
    }
  }
  
  // Store data for animation
  timeSlideData = {
    byHour,
    peakHour,
    peakCount,
    dayCount,
    nightCount
  };
  
  // Generate floating time particles
  generateTimeParticles();
  
  // Set peak hour display
  const peakNumEl = document.getElementById('peakHourNum');
  const peakPeriodEl = document.getElementById('peakHourPeriod');
  
  if (peakNumEl && peakPeriodEl) {
    const displayHour = peakHour === 0 ? 12 : peakHour > 12 ? peakHour - 12 : peakHour;
    const period = peakHour >= 12 ? 'pm' : 'am';
    peakNumEl.textContent = displayHour;
    peakPeriodEl.textContent = period;
  }
  
  // Render the 24-hour clock wheel
  renderTimeWheel(byHour, peakHour);
  
  // Update wheel center icon based on time signature
  const nightRatio = nightCount / (dayCount + nightCount);
  const wheelIconEl = document.getElementById('timeWheelIcon');
  if (wheelIconEl) {
    wheelIconEl.textContent = nightRatio > 0.6 ? '🌙' : nightRatio < 0.35 ? '☀️' : '⚡';
  }
  
  // Determine time signature
  let sigIcon, sigText, sigClass;
  
  if (nightRatio > 0.6) {
    sigIcon = '🌙';
    sigText = 'Night Owl';
    sigClass = 'night-owl';
  } else if (nightRatio < 0.35) {
    sigIcon = '☀️';
    sigText = 'Early Bird';
    sigClass = 'early-bird';
  } else {
    sigIcon = '⚡';
    sigText = 'All-Day Thinker';
    sigClass = 'all-day';
  }
  
  const sigEl = document.getElementById('timeSignature');
  const sigIconEl = document.getElementById('timeSigIcon');
  const sigTextEl = document.getElementById('timeSigText');
  
  if (sigEl) sigEl.className = `time-signature ${sigClass}`;
  if (sigIconEl) sigIconEl.textContent = sigIcon;
  if (sigTextEl) sigTextEl.textContent = sigText;
}

/**
 * Generate floating time-themed particles for background
 */
function generateTimeParticles() {
  const container = document.getElementById('timeParticlesBg');
  if (!container) return;
  
  container.innerHTML = '';
  
  const particles = ['⏰', '🕐', '🕑', '🕒', '🕓', '🕔', '🕕', '🕖', '🕗', '🕘', '🕙', '🕚', '🕛', '⌛', '⏳', '🌙', '☀️', '✨'];
  const numParticles = 10;
  
  for (let i = 0; i < numParticles; i++) {
    const particle = document.createElement('div');
    particle.className = 'time-particle';
    particle.textContent = particles[Math.floor(Math.random() * particles.length)];
    
    const left = Math.random() * 90 + 5;
    const delay = Math.random() * 10;
    const duration = 10 + Math.random() * 8;
    
    particle.style.left = `${left}%`;
    particle.style.animationDelay = `${delay}s`;
    particle.style.animationDuration = `${duration}s`;
    
    container.appendChild(particle);
  }
}

/**
 * Render the 24-hour clock wheel visualization with animations and hover states
 * @param {Array} byHour - Array of 24 message counts per hour
 * @param {number} peakHour - Hour with most messages (0-23)
 */
function renderTimeWheel(byHour, peakHour) {
  const svg = document.getElementById('timeWheelSvg');
  const tooltip = document.getElementById('timeWheelTooltip');
  const tooltipHour = document.getElementById('tooltipHour');
  const tooltipCount = document.getElementById('tooltipCount');
  
  if (!svg || !byHour || byHour.length !== 24) {
    console.log('Time wheel: Missing elements or data');
    return;
  }
  
  const maxCount = Math.max(...byHour, 1);
  const cx = 50, cy = 50;
  const innerRadius = 22;
  const outerRadius = 45;
  
  let segments = '';
  
  // Create 24 arc segments
  for (let hour = 0; hour < 24; hour++) {
    const count = byHour[hour] || 0;
    const intensity = count / maxCount;
    
    // Calculate angles (each hour = 15 degrees)
    const startAngle = (hour * 15) * Math.PI / 180;
    const endAngle = ((hour + 1) * 15) * Math.PI / 180;
    
    // Inner arc points
    const ix1 = cx + innerRadius * Math.cos(startAngle);
    const iy1 = cy + innerRadius * Math.sin(startAngle);
    const ix2 = cx + innerRadius * Math.cos(endAngle);
    const iy2 = cy + innerRadius * Math.sin(endAngle);
    
    // Outer arc points
    const ox1 = cx + outerRadius * Math.cos(startAngle);
    const oy1 = cy + outerRadius * Math.sin(startAngle);
    const ox2 = cx + outerRadius * Math.cos(endAngle);
    const oy2 = cy + outerRadius * Math.sin(endAngle);
    
    // Color based on time of day and intensity
    let hue, sat;
    if (hour >= 0 && hour < 6) {
      hue = 240; sat = 70; // Night - blue
    } else if (hour >= 6 && hour < 12) {
      hue = 45; sat = 80; // Morning - orange/yellow
    } else if (hour >= 12 && hour < 18) {
      hue = 160; sat = 70; // Afternoon - teal
    } else {
      hue = 270; sat = 60; // Evening - purple
    }
    
    const lightness = 25 + intensity * 45;
    const alpha = 0.4 + intensity * 0.6;
    const color = `hsla(${hue}, ${sat}%, ${lightness}%, ${alpha})`;
    
    const isPeak = hour === peakHour;
    const animDelay = hour * 0.03; // Staggered animation
    
    // Format display hour for tooltip
    const displayHour = hour === 0 ? '12am' : 
                        hour === 12 ? '12pm' : 
                        hour > 12 ? `${hour - 12}pm` : `${hour}am`;
    
    // Arc path: outer arc -> line to inner -> inner arc -> close
    const path = `
      M ${ox1} ${oy1}
      A ${outerRadius} ${outerRadius} 0 0 1 ${ox2} ${oy2}
      L ${ix2} ${iy2}
      A ${innerRadius} ${innerRadius} 0 0 0 ${ix1} ${iy1}
      Z
    `;
    
    segments += `<path 
      d="${path}"
      fill="${color}"
      stroke="${isPeak ? 'var(--accent)' : 'rgba(255,255,255,0.1)'}"
      stroke-width="${isPeak ? 2 : 0.5}"
      class="time-wheel-segment ${isPeak ? 'peak-segment' : ''}"
      data-hour="${hour}"
      data-display="${displayHour}"
      data-count="${count}"
      style="animation-delay: ${animDelay}s"
    />`;
  }
  
  // Add hour labels at 12, 3, 6, 9 o'clock positions
  const labelRadius = 48;
  const labels = [
    { hour: 6, label: '6am', angle: 0 },     // Right (after rotation)
    { hour: 12, label: '12pm', angle: 90 },  // Bottom
    { hour: 18, label: '6pm', angle: 180 },  // Left
    { hour: 0, label: '12am', angle: 270 },  // Top
  ];
  
  labels.forEach(({ label, angle }) => {
    const rad = (angle) * Math.PI / 180;
    const x = cx + labelRadius * Math.cos(rad);
    const y = cy + labelRadius * Math.sin(rad);
    segments += `<text x="${x}" y="${y}" 
      text-anchor="middle" 
      dominant-baseline="middle" 
      fill="rgba(255,255,255,0.5)" 
      font-size="4"
      style="transform-origin: ${x}px ${y}px; transform: rotate(90deg);"
    >${label}</text>`;
  });
  
  svg.innerHTML = segments;
  
  // Add hover handlers for tooltip
  svg.querySelectorAll('.time-wheel-segment').forEach(segment => {
    segment.addEventListener('mouseenter', (e) => {
      const hour = e.target.dataset.display;
      const count = parseInt(e.target.dataset.count).toLocaleString();
      
      if (tooltipHour) tooltipHour.textContent = hour;
      if (tooltipCount) tooltipCount.textContent = `${count} messages`;
      if (tooltip) tooltip.classList.add('visible');
    });
    
    segment.addEventListener('mouseleave', () => {
      if (tooltip) tooltip.classList.remove('visible');
    });
  });
}

/**
 * Trigger time slide animations (called when slide becomes visible)
 */
function animateTimeSlide() {
  if (!timeSlideData || timeSlideAnimated) return;
  timeSlideAnimated = true;
  
  const { peakCount, dayCount, nightCount } = timeSlideData;
  
  // Animate peak count
  setTimeout(() => {
    const peakCountEl = document.getElementById('peakHourCount');
    if (peakCountEl) {
      animateCountUp(peakCountEl, peakCount, 1500);
    }
  }, 800);
  
  // Animate day/night counts with delay
  setTimeout(() => {
    const dayMsgEl = document.getElementById('dayMsgCount');
    const nightMsgEl = document.getElementById('nightMsgCount');
    
    if (dayMsgEl) animateCountUp(dayMsgEl, dayCount, 1500);
    if (nightMsgEl) animateCountUp(nightMsgEl, nightCount, 1500);
    
    // Animate bars
    const totalCount = dayCount + nightCount;
    const dayBar = document.getElementById('dayMsgBar');
    const nightBar = document.getElementById('nightMsgBar');
    
    if (dayBar) dayBar.style.width = `${(dayCount / totalCount) * 100}%`;
    if (nightBar) nightBar.style.width = `${(nightCount / totalCount) * 100}%`;
  }, 1200);
}

// Make slide functions globally available
window.populateTimeSlide = populateTimeSlide;
window.generateTimeParticles = generateTimeParticles;
window.renderTimeWheel = renderTimeWheel;
window.animateTimeSlide = animateTimeSlide;

