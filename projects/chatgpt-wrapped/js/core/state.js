// ============================================
// ChatGPT Wrapped - Global State
// ============================================

// Core data
let stats = null;
let aiInsights = null;
let discoveredThemes = [];
let imagePrompts = [];
let imageStats = { generated: 0, uploaded: 0, total: 0 };
let currentImageFilter = 'all';
let wrappedData = null; // Global store for stats/themes data

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
let verdictSlideData = null;

// Evidence cache
const loadedEvidence = {};

