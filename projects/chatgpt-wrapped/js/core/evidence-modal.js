// ============================================
// ChatGPT Wrapped - Evidence Modal & Floating Bubbles
// ============================================

// Spawn floating bubbles at random positions on screen
async function spawnFloatingBubbles(themeKeys, slideElement) {
  const container = document.getElementById('floatingBubblesContainer');
  clearFloatingBubbles();
  
  const allEvidence = [];
  for (const themeKey of themeKeys) {
    if (!loadedEvidence[themeKey]) {
      try {
        const response = await fetch(`/api/wrapped/evidence/${themeKey}?limit=8`);
        if (response.ok) {
          const data = await response.json();
          loadedEvidence[themeKey] = data.evidence;
        }
      } catch (e) {
        console.log('Could not load evidence for', themeKey);
      }
    }
    if (loadedEvidence[themeKey]) {
      allEvidence.push(...loadedEvidence[themeKey].map(e => ({ ...e, themeKey })));
    }
  }
  
  if (allEvidence.length === 0) return;
  
  const shuffled = allEvidence.sort(() => Math.random() - 0.5).slice(0, 6);
  
  const positions = [
    { top: '10%', left: '40px' },
    { top: '15%', right: '40px' },
    { top: '45%', left: '40px' },
    { top: '50%', right: '40px' },
    { bottom: '25%', left: '40px' },
    { bottom: '20%', right: '40px' },
  ];
  
  const colorClasses = ['bubble-teal', 'bubble-purple', 'bubble-pink'];
  
  shuffled.forEach((evidence, idx) => {
    const timer = setTimeout(() => {
      const bubble = document.createElement('div');
      bubble.className = `floating-bubble floating ${colorClasses[idx % colorClasses.length]}`;
      
      const pos = positions[idx % positions.length];
      Object.keys(pos).forEach(key => {
        bubble.style[key] = pos[key];
      });
      
      const truncated = evidence.preview.length > 120 
        ? evidence.preview.slice(0, 117) + '...' 
        : evidence.preview;
      
      bubble.innerHTML = `
        <div class="floating-bubble-text">${escapeHtml(truncated)}</div>
        <div class="floating-bubble-meta">
          <span class="floating-bubble-date">${evidence.conversationTitle || ''}</span>
        </div>
      `;
      
      bubble.onclick = () => openEvidenceModal(evidence.themeKey);
      bubble.style.cursor = 'pointer';
      
      container.appendChild(bubble);
    }, 300 + (idx * 400));
    
    floatingBubbleTimers.push(timer);
  });
}

// Clear all floating bubbles
function clearFloatingBubbles() {
  floatingBubbleTimers.forEach(t => clearTimeout(t));
  floatingBubbleTimers = [];
  
  const container = document.getElementById('floatingBubblesContainer');
  if (!container) return;
  
  const bubbles = container.querySelectorAll('.floating-bubble');
  bubbles.forEach(b => {
    b.classList.remove('floating');
    b.classList.add('fade-out');
  });
  
  setTimeout(() => {
    container.innerHTML = '';
  }, 400);
}

async function openEvidenceModal(themeKey) {
  const modal = document.getElementById('evidenceModal');
  const title = document.getElementById('evidenceModalTitle');
  const subtitle = document.getElementById('evidenceModalSubtitle');
  const list = document.getElementById('evidenceList');
  
  const themeNames = {
    'business': 'Business & Entrepreneurship',
    'images': 'AI Image Generation',
    'career': 'Career & Growth',
    'learning': 'Learning & Education',
    'writing': 'Creative Writing',
    'architecture': 'Technical Architecture',
    'personal': 'Personal Life',
    'productivity': 'Productivity & Organization',
  };
  
  if (title) title.textContent = `💬 ${themeNames[themeKey] || themeKey}`;
  if (subtitle) subtitle.textContent = 'Your actual messages that match this theme';
  if (list) list.innerHTML = '<div class="sub-text">Loading all evidence...</div>';
  
  if (modal) modal.classList.add('show');
  document.body.style.overflow = 'hidden';
  
  try {
    const response = await fetch(`/api/wrapped/evidence/${themeKey}?limit=20`);
    if (response.ok) {
      const data = await response.json();
      
      if (list) {
        list.innerHTML = data.evidence.map(e => `
          <div class="evidence-item">
            <div class="evidence-item-text">${escapeHtml(e.message)}</div>
            <div class="evidence-item-meta">
              <span>📁 ${e.conversationTitle}</span>
              <span class="bubble-similarity">${e.similarity}% match</span>
            </div>
          </div>
        `).join('');
      }
    }
  } catch (e) {
    if (list) list.innerHTML = '<div class="sub-text" style="color: #f5576c;">Failed to load evidence</div>';
  }
}

function closeEvidenceModal() {
  const modal = document.getElementById('evidenceModal');
  if (modal) modal.classList.remove('show');
  document.body.style.overflow = '';
}

// Show image prompt in modal (used by gallery onclick)
function showImagePrompt(id) {
  const img = imagePrompts.find(i => i.id == id);
  if (!img) return;
  
  const title = document.getElementById('evidenceModalTitle');
  const subtitle = document.getElementById('evidenceModalSubtitle');
  const list = document.getElementById('evidenceList');
  const modal = document.getElementById('evidenceModal');
  
  if (title) title.textContent = '🖼️ AI Generated Image';
  if (subtitle) subtitle.textContent = img.conversationTitle;
  
  if (list) {
    list.innerHTML = `
      <div class="evidence-item" style="border-left-color: ${img.gradientColors[0]}; padding: 0;">
        ${img.hasRealImage && img.imagePath ? `
          <div style="margin-bottom: 1rem; border-radius: 12px; overflow: hidden; box-shadow: 0 8px 32px rgba(0,0,0,0.3);">
            <img 
              src="${img.imagePath}" 
              alt="AI Generated Image" 
              style="width: 100%; max-height: 400px; object-fit: contain; display: block; background: #111;"
              onerror="this.parentElement.innerHTML='<div style=\\'background: linear-gradient(135deg, ${img.gradientColors[0]}, ${img.gradientColors[1]}); height: 200px; display: flex; align-items: center; justify-content: center;\\'><span style=\\'font-size: 3rem; opacity: 0.5;\\'>🎨</span></div>'"
            />
          </div>
        ` : `
          <div style="background: linear-gradient(135deg, ${img.gradientColors[0]}, ${img.gradientColors[1]}); height: 200px; border-radius: 12px; margin-bottom: 1rem; display: flex; align-items: center; justify-content: center;">
            <span style="font-size: 3rem; opacity: 0.5;">🎨</span>
          </div>
        `}
        <div style="padding: 1rem;">
          <div class="evidence-item-label" style="color: #888; font-size: 0.75rem; margin-bottom: 0.5rem;">YOUR PROMPT</div>
          <div class="evidence-item-text" style="font-size: 1rem; line-height: 1.6; color: #e0e0e0;">${escapeHtml(img.prompt)}</div>
          <div class="evidence-item-meta" style="margin-top: 1rem; display: flex; gap: 1rem;">
            <span style="background: rgba(255,255,255,0.1); padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.8rem;">${img.imageType}</span>
            ${img.timestamp ? `<span style="color: #888; font-size: 0.8rem;">${new Date(img.timestamp).toLocaleDateString()}</span>` : ''}
          </div>
        </div>
      </div>
    `;
  }
  
  if (modal) modal.classList.add('show');
  document.body.style.overflow = 'hidden';
}

// Preload evidence data in background for faster floating bubbles
async function preloadEvidenceData() {
  if (!discoveredThemes || discoveredThemes.length === 0) return;
  
  const themeKeyMap = {
    'Business & Entrepreneurship': 'business',
    'AI Image Generation': 'images', 
    'Career & Growth': 'career',
    'Learning & Education': 'learning',
    'Creative Writing': 'writing',
    'Technical Architecture': 'architecture',
    'Personal Life': 'personal',
    'Productivity & Organization': 'productivity',
  };
  
  const themeKeys = discoveredThemes.map(t => 
    themeKeyMap[t.name] || t.name.toLowerCase().split(' ')[0]
  );
  
  for (const key of themeKeys.slice(0, 3)) {
    if (!loadedEvidence[key]) {
      try {
        const response = await fetch(`/api/wrapped/evidence/${key}?limit=8`);
        if (response.ok) {
          const data = await response.json();
          loadedEvidence[key] = data.evidence;
        }
      } catch (e) {
        // Silently fail - not critical
      }
    }
  }
}

// Make functions globally available for onclick handlers
window.openEvidenceModal = openEvidenceModal;
window.closeEvidenceModal = closeEvidenceModal;
window.showImagePrompt = showImagePrompt;
