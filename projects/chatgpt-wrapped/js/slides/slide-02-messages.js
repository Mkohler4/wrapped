// ============================================
// Slide 2: Messages - The Exchange
// ============================================
// Dependencies: utils.js (animateCountUp), state.js (messagesSlideData, messagesSlideAnimated)
// DOM elements: totalMessages, userMsgCount, aiMsgCount, userMsgBar, aiMsgBar, 
//               msgStreamBg, msgTrendSvg, msgTrendArea, msgTrendLine, msgTrendValue, msgTrendPercent

/**
 * Populate the Messages slide with stats
 * @param {Object} s - Stats object with totalMessages, userMessages, enhanced.monthlyTrend
 */
function populateMessagesSlide(s) {
  const totalMessages = s.totalMessages;
  const userMessages = s.userMessages || Math.round(totalMessages * 0.45);
  const aiMessages = totalMessages - userMessages;
  
  const totalMsgEl = document.getElementById('totalMessages');
  const userMsgEl = document.getElementById('userMsgCount');
  const aiMsgEl = document.getElementById('aiMsgCount');
  
  if (totalMsgEl) totalMsgEl.dataset.target = totalMessages;
  
  // Generate streaming message background
  generateMsgStreamBg();
  
  // Store data for animation when slide becomes visible
  messagesSlideData = {
    total: totalMessages,
    user: userMessages,
    ai: aiMessages,
    monthlyTrend: s.enhanced?.monthlyTrend || []
  };
}

/**
 * Trigger messages slide animations (called when slide becomes visible)
 */
function animateMessagesSlide() {
  if (!messagesSlideData || messagesSlideAnimated) return;
  messagesSlideAnimated = true;
  
  const { total, user, ai, monthlyTrend } = messagesSlideData;
  
  // Count up total
  const totalMsgEl = document.getElementById('totalMessages');
  if (totalMsgEl) {
    animateCountUp(totalMsgEl, total, 2000);
  }
  
  // Count up breakdown with delay
  setTimeout(() => {
    const userMsgEl = document.getElementById('userMsgCount');
    const aiMsgEl = document.getElementById('aiMsgCount');
    
    if (userMsgEl) animateCountUp(userMsgEl, user, 1500);
    if (aiMsgEl) animateCountUp(aiMsgEl, ai, 1500);
    
    // Animate bars
    const maxCount = Math.max(user, ai);
    const userBar = document.getElementById('userMsgBar');
    const aiBar = document.getElementById('aiMsgBar');
    
    if (userBar) userBar.style.width = `${(user / maxCount) * 100}%`;
    if (aiBar) aiBar.style.width = `${(ai / maxCount) * 100}%`;
  }, 800);
  
  // Render trend chart
  if (monthlyTrend && monthlyTrend.length > 0) {
    setTimeout(() => renderMsgTrendChart(monthlyTrend), 1200);
  }
}

/**
 * Generate streaming messages background effect
 */
function generateMsgStreamBg() {
  const container = document.getElementById('msgStreamBg');
  if (!container) return;
  
  container.innerHTML = '';
  
  const snippets = [
    'How do I...', 'Explain...', 'Write a...', 'Help me...',
    'What is...', 'Can you...', 'Debug this...', 'Create a...'
  ];
  
  const aiSnippets = [
    'Here\'s how...', 'Let me help...', 'Sure! Here...', 'Great question...',
    'I\'d suggest...', 'You can try...', 'Consider...', 'The answer...'
  ];
  
  const numStreams = 8;
  
  for (let i = 0; i < numStreams; i++) {
    const isUser = i % 2 === 0;
    const msg = document.createElement('div');
    msg.className = `msg-stream-item ${isUser ? 'user-msg' : 'ai-msg'}`;
    msg.textContent = isUser 
      ? snippets[Math.floor(Math.random() * snippets.length)]
      : aiSnippets[Math.floor(Math.random() * aiSnippets.length)];
    
    // Random vertical position
    const top = 10 + (i * 10) + (Math.random() * 5);
    const delay = Math.random() * 10;
    const duration = 10 + Math.random() * 5;
    
    msg.style.top = `${top}%`;
    msg.style.animationDelay = `${delay}s`;
    msg.style.animationDuration = `${duration}s`;
    
    container.appendChild(msg);
  }
}

/**
 * Render the trend mini-chart for messages slide
 * @param {Array} monthlyData - Array of {month, count} objects
 */
function renderMsgTrendChart(monthlyData) {
  const svg = document.getElementById('msgTrendSvg');
  const areaEl = document.getElementById('msgTrendArea');
  const lineEl = document.getElementById('msgTrendLine');
  const trendValueEl = document.getElementById('msgTrendValue');
  const trendPercentEl = document.getElementById('msgTrendPercent');
  
  if (!svg || !monthlyData || monthlyData.length < 2) return;
  
  const data = monthlyData.slice(-12); // Last 12 months
  const values = data.map(d => d.count);
  const maxVal = Math.max(...values, 1);
  const minVal = Math.min(...values);
  
  const width = 200;
  const height = 60;
  const padding = 4;
  
  // Generate points
  const points = values.map((val, i) => {
    const x = padding + (i / (values.length - 1)) * (width - 2 * padding);
    const y = padding + (1 - (val - minVal) / (maxVal - minVal || 1)) * (height - 2 * padding);
    return { x, y };
  });
  
  // Create paths
  const linePath = points.map((p, i) => 
    (i === 0 ? 'M' : 'L') + ` ${p.x.toFixed(1)} ${p.y.toFixed(1)}`
  ).join(' ');
  
  const areaPath = linePath + 
    ` L ${points[points.length - 1].x.toFixed(1)} ${height - padding}` +
    ` L ${padding} ${height - padding} Z`;
  
  if (areaEl) areaEl.setAttribute('d', areaPath);
  if (lineEl) lineEl.setAttribute('d', linePath);
  
  // Calculate trend percentage
  const firstHalf = values.slice(0, Math.floor(values.length / 2));
  const secondHalf = values.slice(Math.floor(values.length / 2));
  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
  const trendPct = firstAvg > 0 ? Math.round(((secondAvg - firstAvg) / firstAvg) * 100) : 0;
  
  if (trendPercentEl) {
    trendPercentEl.textContent = `${Math.abs(trendPct)}%`;
  }
  
  if (trendValueEl) {
    if (trendPct < 0) {
      trendValueEl.classList.add('down');
      trendValueEl.querySelector('.trend-arrow').textContent = '↓';
    } else {
      trendValueEl.classList.remove('down');
      trendValueEl.querySelector('.trend-arrow').textContent = '↑';
    }
  }
}

