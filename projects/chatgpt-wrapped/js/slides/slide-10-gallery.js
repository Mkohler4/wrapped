// ============================================
// Slide 10: AI Image Gallery - Your Creative Journey
// ============================================
// Dependencies: utils.js (animateCountUp), state.js (imagePrompts, imageStats, currentImageFilter, gallerySlideData, gallerySlideAnimated)
// DOM elements: galleryHeroNumber, galleryGeneratedCount, galleryUploadedCount, galleryNoData,
//               galleryShowcase, galleryFramesBg, galleryGrid, galleryPageDots,
//               galleryGeneratedBar, galleryUploadedBar

// Note: gallerySlideData, gallerySlideAnimated, galleryCurrentPage are defined in app.js
// galleryScrollTimeout is used locally but needs to be available globally
if (typeof galleryScrollTimeout === 'undefined') window.galleryScrollTimeout = null;

/**
 * Generate floating image frame background
 */
function generateGalleryFramesBg() {
  const container = document.getElementById('galleryFramesBg');
  if (!container) return;
  
  container.innerHTML = '';
  const frameCount = 15;
  
  for (let i = 0; i < frameCount; i++) {
    const frame = document.createElement('div');
    frame.className = 'gallery-frame';
    frame.style.left = `${Math.random() * 100}%`;
    frame.style.animationDelay = `${Math.random() * 20}s`;
    frame.style.animationDuration = `${20 + Math.random() * 10}s`;
    container.appendChild(frame);
  }
}

/**
 * Populate gallery slide with data (called on data load)
 */
function populateGallerySlide() {
  const heroNumberEl = document.getElementById('galleryHeroNumber');
  const generatedCountEl = document.getElementById('galleryGeneratedCount');
  const uploadedCountEl = document.getElementById('galleryUploadedCount');
  const noDataEl = document.getElementById('galleryNoData');
  const showcaseEl = document.getElementById('galleryShowcase');
  const statsRowEl = document.querySelector('.gallery-stats-row');
  const heroEl = document.querySelector('.gallery-hero');
  
  // Generate background frames
  generateGalleryFramesBg();
  
  // Check if we have images
  if (!imagePrompts || imagePrompts.length === 0) {
    // Show no data message, hide everything else
    if (noDataEl) {
      noDataEl.style.display = 'flex';
      // Trigger animation after a small delay
      setTimeout(() => noDataEl.classList.add('animate-in'), 50);
    }
    if (showcaseEl) showcaseEl.style.display = 'none';
    if (statsRowEl) statsRowEl.style.display = 'none';
    if (heroEl) heroEl.style.display = 'none';
    
    // Set empty data state
    gallerySlideData = { total: 0, generated: 0, uploaded: 0, images: [] };
    return;
  }
  
  // Hide no data, show content
  if (noDataEl) noDataEl.style.display = 'none';
  if (showcaseEl) showcaseEl.style.display = 'block';
  if (statsRowEl) statsRowEl.style.display = 'flex';
  if (heroEl) heroEl.style.display = 'block';
  
  // Set data targets for count-up animation
  const total = imageStats.total || imagePrompts.length;
  const generated = imageStats.generated || imagePrompts.filter(img => img.source === 'generated').length;
  const uploaded = imageStats.uploaded || imagePrompts.filter(img => img.source === 'uploaded').length;
  
  if (heroNumberEl) heroNumberEl.dataset.target = total;
  if (generatedCountEl) generatedCountEl.dataset.target = generated;
  if (uploadedCountEl) uploadedCountEl.dataset.target = uploaded;
  
  // Store data for animation
  gallerySlideData = {
    total,
    generated,
    uploaded,
    images: imagePrompts
  };
  
  // Render initial gallery grid
  renderGalleryGrid(imagePrompts);
  
  // Add scroll listener for page dots
  initGalleryScrollListener();
  
  // Delay page dots update to allow grid to render
  setTimeout(() => {
    updateGalleryPageDots();
  }, 100);
}

/**
 * Initialize scroll listener for gallery grid
 */
function initGalleryScrollListener() {
  const grid = document.getElementById('galleryGrid');
  if (!grid || grid.dataset.scrollListenerAdded) return;
  
  grid.dataset.scrollListenerAdded = 'true';
  
  grid.addEventListener('scroll', () => {
    // Debounce the scroll update
    if (galleryScrollTimeout) clearTimeout(galleryScrollTimeout);
    galleryScrollTimeout = setTimeout(() => {
      updateGalleryPageIndicator();
    }, 50);
  }, { passive: true });
}

/**
 * Render gallery grid with images
 * @param {Array} images - Array of image objects
 */
function renderGalleryGrid(images) {
  const grid = document.getElementById('galleryGrid');
  if (!grid) return;
  
  if (!images || images.length === 0) {
    grid.innerHTML = '<div class="sub-text" style="padding: 2rem; text-align: center; width: 100%;">No images to display</div>';
    return;
  }
  
  grid.innerHTML = images.map((img, idx) => `
    <div class="gallery-image-card" data-index="${idx}" onclick="showImagePrompt('${img.id}')">
      <div class="gallery-image-visual">
        ${img.hasRealImage && img.imagePath ? `
          <img 
            src="${img.imagePath}" 
            alt="${img.source === 'uploaded' ? 'Uploaded' : 'AI Generated'}"
            loading="lazy"
            onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
          />
          <div class="gallery-image-placeholder" style="display: none;">
            <span class="gallery-image-placeholder-icon">${img.source === 'uploaded' ? '📤' : '🎨'}</span>
          </div>
        ` : `
          <div class="gallery-image-placeholder">
            <span class="gallery-image-placeholder-icon">${img.source === 'uploaded' ? '📤' : '🎨'}</span>
          </div>
        `}
        <span class="gallery-image-badge">${img.source === 'uploaded' ? '📤' : '🎨'} ${img.imageType || (img.source === 'uploaded' ? 'Uploaded' : 'Generated')}</span>
        <span class="gallery-image-index">#${img.index || idx + 1}</span>
      </div>
      <div class="gallery-image-info">
        <div class="gallery-image-prompt">${escapeHtml(img.prompt || 'No prompt')}</div>
        <div class="gallery-image-meta">
          <span class="gallery-image-meta-icon">📁</span>
          ${escapeHtml(truncateText(img.conversationTitle || 'Unknown', 25))}
        </div>
      </div>
    </div>
  `).join('');
}

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped HTML
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Truncate text helper
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Max length
 * @returns {string} Truncated text
 */
function truncateText(text, maxLength) {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

/**
 * Update gallery page dots based on grid dimensions
 */
function updateGalleryPageDots() {
  const grid = document.getElementById('galleryGrid');
  const dotsContainer = document.getElementById('galleryPageDots');
  if (!grid || !dotsContainer) return;
  
  const visibleWidth = grid.offsetWidth;
  const totalWidth = grid.scrollWidth;
  
  // Guard against division by zero or invalid dimensions
  if (!visibleWidth || !totalWidth || visibleWidth <= 0) {
    dotsContainer.innerHTML = '<div class="gallery-page-dot active" data-page="0"></div>';
    return;
  }
  
  const totalPages = Math.ceil(totalWidth / visibleWidth);
  const pageCount = Math.max(1, Math.min(totalPages, 5));
  
  dotsContainer.innerHTML = Array(pageCount)
    .fill(0)
    .map((_, i) => `<div class="gallery-page-dot ${i === 0 ? 'active' : ''}" data-page="${i}"></div>`)
    .join('');
}

/**
 * Animate gallery slide (called when slide becomes visible)
 */
function animateGallerySlide() {
  if (!gallerySlideData || gallerySlideAnimated) return;
  gallerySlideAnimated = true;
  
  const { total, generated, uploaded } = gallerySlideData;
  
  // Animate hero number
  const heroEl = document.getElementById('galleryHeroNumber');
  if (heroEl) {
    animateCountUp(heroEl, total, 1800);
  }
  
  // Animate stats row with delay
  setTimeout(() => {
    const statsRow = document.querySelector('.gallery-stats-row');
    if (statsRow) statsRow.classList.add('animate-in');
    
    // Count up stats
    const generatedEl = document.getElementById('galleryGeneratedCount');
    const uploadedEl = document.getElementById('galleryUploadedCount');
    
    if (generatedEl) animateCountUp(generatedEl, generated, 1200);
    if (uploadedEl) animateCountUp(uploadedEl, uploaded, 1200);
    
    // Animate stat bars
    setTimeout(() => {
      const maxVal = Math.max(generated, uploaded, 1);
      const genBar = document.getElementById('galleryGeneratedBar');
      const uplBar = document.getElementById('galleryUploadedBar');
      
      if (genBar) genBar.style.width = `${(generated / maxVal) * 100}%`;
      if (uplBar) uplBar.style.width = `${(uploaded / maxVal) * 100}%`;
    }, 400);
  }, 600);
  
  // Animate showcase with delay
  setTimeout(() => {
    const showcase = document.querySelector('.gallery-showcase');
    if (showcase) showcase.classList.add('animate-in');
    
    // Staggered card animation
    document.querySelectorAll('.gallery-image-card').forEach((card, i) => {
      setTimeout(() => {
        card.classList.add('animate-in');
      }, i * 80);
    });
  }, 1000);
}

/**
 * Set gallery filter (all, generated, uploaded)
 * @param {string} filter - Filter type
 */
function setGalleryFilter(filter) {
  currentImageFilter = filter;
  
  // Update active tab
  document.querySelectorAll('.gallery-filter-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.filter === filter);
  });
  
  // Filter images
  let filteredImages = imagePrompts;
  if (filter === 'generated') {
    filteredImages = imagePrompts.filter(img => img.source === 'generated');
  } else if (filter === 'uploaded') {
    filteredImages = imagePrompts.filter(img => img.source === 'uploaded');
  }
  
  // Re-render grid
  renderGalleryGrid(filteredImages);
  
  // Animate cards in
  document.querySelectorAll('.gallery-image-card').forEach((card, i) => {
    setTimeout(() => {
      card.classList.add('animate-in');
    }, i * 50);
  });
  
  // Reset scroll and update dots
  const grid = document.getElementById('galleryGrid');
  if (grid) grid.scrollTo({ left: 0, behavior: 'smooth' });
  galleryCurrentPage = 0;
  updateGalleryPageDots();
  updateGalleryPageIndicator();
}

/**
 * Scroll gallery grid left or right
 * @param {number} direction - -1 for left, 1 for right
 */
function scrollGalleryGrid(direction) {
  const grid = document.getElementById('galleryGrid');
  if (!grid) return;
  
  const scrollAmount = grid.offsetWidth * 0.8;
  grid.scrollBy({ left: direction * scrollAmount, behavior: 'smooth' });
  
  // Update page indicator after scroll
  setTimeout(() => {
    updateGalleryPageIndicator();
  }, 400);
}

/**
 * Update page indicator based on scroll position
 */
function updateGalleryPageIndicator() {
  const grid = document.getElementById('galleryGrid');
  const dots = document.querySelectorAll('.gallery-page-dot');
  if (!grid || dots.length === 0) return;
  
  const maxScroll = grid.scrollWidth - grid.offsetWidth;
  
  // Handle case where content doesn't scroll
  if (maxScroll <= 0) {
    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === 0);
    });
    return;
  }
  
  const scrollRatio = Math.max(0, Math.min(1, grid.scrollLeft / maxScroll));
  const currentPage = Math.round(scrollRatio * (dots.length - 1));
  
  dots.forEach((dot, i) => {
    dot.classList.toggle('active', i === currentPage);
  });
}

// Legacy function wrappers for backwards compatibility
function renderImageGallery() {
  populateGallerySlide();
}

function filterImages(filter) {
  setGalleryFilter(filter);
}

function scrollGallery(direction) {
  scrollGalleryGrid(direction);
}

// Make slide functions globally available
window.generateGalleryFramesBg = generateGalleryFramesBg;
window.populateGallerySlide = populateGallerySlide;
window.initGalleryScrollListener = initGalleryScrollListener;
window.renderGalleryGrid = renderGalleryGrid;
window.escapeHtml = escapeHtml;
window.truncateText = truncateText;
window.updateGalleryPageDots = updateGalleryPageDots;
window.animateGallerySlide = animateGallerySlide;
window.setGalleryFilter = setGalleryFilter;
window.scrollGalleryGrid = scrollGalleryGrid;
window.updateGalleryPageIndicator = updateGalleryPageIndicator;
window.renderImageGallery = renderImageGallery;
window.filterImages = filterImages;
window.scrollGallery = scrollGallery;

