// ============================================
// ChatGPT Wrapped - Utility Functions
// ============================================

/**
 * Animate a number counting up from 0 to target
 */
function animateCountUp(element, target, duration = 2000) {
  const start = 0;
  const startTime = performance.now();
  
  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Easing function (ease-out cubic)
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.floor(start + (target - start) * eased);
    
    element.textContent = current.toLocaleString();
    
    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      element.textContent = target.toLocaleString();
    }
  }
  
  requestAnimationFrame(update);
}

function formatHour(h) {
  if (h === 0) return '12am';
  if (h === 12) return '12pm';
  return h > 12 ? `${h - 12}pm` : `${h}am`;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function truncateText(text, maxLength) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Format a number with commas
 */
function formatNumber(num) {
  return num.toLocaleString();
}

/**
 * Format a number compactly (e.g., 1.2k, 3.5M)
 */
function formatCompact(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k';
  }
  return num.toString();
}

/**
 * Get time of day label
 */
function getTimeOfDay(hour) {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

/**
 * Delay execution
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Clamp a number between min and max
 */
function clamp(num, min, max) {
  return Math.min(Math.max(num, min), max);
}

/**
 * Linear interpolation
 */
function lerp(start, end, t) {
  return start + (end - start) * t;
}

/**
 * Map a value from one range to another
 */
function mapRange(value, inMin, inMax, outMin, outMax) {
  return (value - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
}

/**
 * Debounce a function
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle a function
 */
function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Make utility functions globally available
window.animateCountUp = animateCountUp;
window.formatNumber = formatNumber;
window.formatCompact = formatCompact;
window.formatHour = formatHour;
window.escapeHtml = escapeHtml;
window.truncateText = truncateText;
window.getTimeOfDay = getTimeOfDay;
window.delay = delay;
window.clamp = clamp;
window.lerp = lerp;
window.mapRange = mapRange;
window.debounce = debounce;
window.throttle = throttle;
