// ============================================
// ChatGPT Wrapped - Global State
// ============================================

// Core data
let stats = null;
let aiInsights = null;
let discoveredThemes = [];
let imagePrompts = [];
let imageStats = { generated: 0, total: 0 };
let currentImageFilter = 'all';
let _previousBlobUrls = []; // Track blob URLs for cleanup on re-upload
let wrappedData = null; // Global store for stats/themes data
let heatmapData = null; // Global store for heatmap/activity map data

// Navigation state
let currentSlide = 0;
let totalSlides = 15;

// Slide animation flags (prevent re-animating on revisit)
let messagesSlideAnimated = false;
let topicsSlideAnimated = false;
let timeSlideAnimated = false;
let themesSlideAnimated = false;
let obsessionSlideAnimated = false;
let cosmicRevelationsAnimated = false;
let gallerySlideAnimated = false;
let heatmapSlideAnimated = false;
let verdictSlideAnimated = false;
let achievementsSlideAnimated = false;
let wordBubblesSlideAnimated = false;
let shareSlideAnimated = false;

// Slide-specific data caches
let messagesSlideData = null;
let topicsSlideData = null;
let timeSlideData = null;
let themesSlideData = null;
let obsessionSlideData = null;
let cosmicRevelationsData = null;
let gallerySlideData = null;
let galleryCurrentPage = 0;
let galleryScrollTimeout = null;
let verdictSlideData = null;
let achievementsSlideData = null;
let storedTopWords = null;

// Evolution data
let currentEvolutionData = null;
let monthlyTrendData = null;

// Evidence cache
const loadedEvidence = {};
let floatingBubbleTimers = [];

// Theme icons for themes slide
const themeIcons = {
  'Business & Entrepreneurship': '💼',
  'AI Image Generation': '🎨',
  'Career & Growth': '📈',
  'Learning & Education': '📚',
  'Creative Writing': '✍️',
  'Technical Architecture': '🏗️',
  'Personal Life': '💭',
  'Productivity & Organization': '⚡',
  'Coding & Development': '💻',
  'Data & Analytics': '📊',
  'Marketing & Content': '📣',
  'Finance & Investing': '💰',
  'default': '💡'
};

// Debug helper to sync globals
function syncDebugGlobals() {
  if (typeof window === 'undefined') return;
  window.stats = stats;
  window.aiInsights = aiInsights;
  window.discoveredThemes = discoveredThemes;
  window.imagePrompts = imagePrompts;
  window.imageStats = imageStats;
  window.heatmapData = heatmapData;
}
