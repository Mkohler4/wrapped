// ============================================
// ChatGPT Wrapped - File Handling
// ============================================

async function processFile(file) {
  showScreen('processing');
  updateProgress(10, 'Reading file...');

  // Reset all state so re-uploads start completely fresh
  stats = null;
  aiInsights = null;
  discoveredThemes = [];
  imagePrompts = [];
  imageStats = { generated: 0, total: 0 };
  heatmapData = null;
  wrappedData = null;
  gallerySlideData = null;
  // Reset all slide animation flags
  gallerySlideAnimated = false;
  heatmapSlideAnimated = false;
  themesSlideAnimated = false;
  obsessionSlideAnimated = false;
  cosmicRevelationsAnimated = false;
  verdictSlideAnimated = false;
  achievementsSlideAnimated = false;
  wordBubblesSlideAnimated = false;
  // Revoke any existing blob URLs to free memory
  for (const url of _previousBlobUrls) {
    try { URL.revokeObjectURL(url); } catch (e) { /* ignore */ }
  }
  _previousBlobUrls = [];
  _resolveDebugLogged = false;
  syncDebugGlobals();

  try {
    let data;
    let zipImageMap = {}; // Map of file-service IDs to blob URLs
    
    if (file.name.endsWith('.zip')) {
      // Handle ZIP file
      updateProgress(20, 'Extracting ZIP...');
      const JSZip = await loadJSZip();
      const zip = await JSZip.loadAsync(file);
      const jsonFile = zip.file('conversations.json');
      if (!jsonFile) throw new Error('conversations.json not found in ZIP');
      const content = await jsonFile.async('string');
      data = JSON.parse(content);

      // Extract image files from ZIP and create blob URLs
      // Searches ALL subdirectories (dalle-generations/, user-*/,  etc.)
      updateProgress(30, 'Extracting images from ZIP...');
      const imageExtensions = /\.(png|jpg|jpeg|gif|webp|svg)$/i;
      const zipEntries = Object.keys(zip.files);
      let extractedCount = 0;
      const allZipFiles = zipEntries.filter(f => !zip.files[f].dir);
      console.log(`📦 ZIP contains ${allZipFiles.length} files:`, allZipFiles.slice(0, 20).join(', '), allZipFiles.length > 20 ? `... and ${allZipFiles.length - 20} more` : '');
      
      for (const filename of zipEntries) {
        if (imageExtensions.test(filename) && !zip.files[filename].dir) {
          try {
            const blob = await zip.files[filename].async('blob');
            // Determine MIME type from extension
            const ext = filename.split('.').pop().toLowerCase();
            const mimeMap = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml' };
            const mimeType = mimeMap[ext] || 'image/png';
            const typedBlob = new Blob([blob], { type: mimeType });
            const blobUrl = URL.createObjectURL(typedBlob);
            _previousBlobUrls.push(blobUrl);

            // Get just the filename without path or extension
            const basename = filename.replace(/^.*\//, '');
            const stem = basename.replace(/\.[^.]+$/, '');
            
            // Map by full stem for direct matches
            zipImageMap[stem] = blobUrl;
            zipImageMap[filename] = blobUrl;
            
            // Extract the ID prefix by stripping the trailing UUID suffix
            // Handles both formats:
            //   file-XXXXX-UUID.webp  (dalle-generations/, file-service:// pointers)
            //   file_XXXXX-UUID.png   (user-*/ folders, sediment:// pointers)
            const uuidSuffixMatch = stem.match(/^(.+)-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
            const idPrefix = uuidSuffixMatch ? uuidSuffixMatch[1] : stem;
            
            // Map by ID prefix (this is what asset_pointers reference)
            zipImageMap[idPrefix] = blobUrl;
            // Map with protocol prefixes for direct asset_pointer lookups
            zipImageMap[`file-service://${idPrefix}`] = blobUrl;
            zipImageMap[`sediment://${idPrefix}`] = blobUrl;
            
            extractedCount++;
          } catch (e) {
            console.warn(`Could not extract image: ${filename}`, e);
          }
        }
      }
      console.log(`✓ Extracted ${extractedCount} image files from ZIP (including subdirectories)`);
      if (extractedCount === 0) {
        console.log('⚠️ No image files found in ZIP. Only conversations.json? Gallery will show placeholders.');
        console.log('   ZIP file list:', allZipFiles.join(', '));
      } else {
        const sampleKeys = Object.keys(zipImageMap).filter(k => k.startsWith('file')).slice(0, 6);
        console.log('   Sample ZIP image keys:', sampleKeys.join(', '));
      }
    } else {
      // Handle JSON directly (no image files available)
      const content = await file.text();
      data = JSON.parse(content);
    }

    updateProgress(40, 'Analyzing conversations...');
    stats = analyzeConversations(data);
    syncDebugGlobals();

    updateProgress(50, 'Extracting images...');
    // Extract images for gallery (client-side path) — pass ZIP image map for real thumbnails
    const imageResult = extractImagePrompts(data, zipImageMap);
    imagePrompts = imageResult.prompts;
    imageStats = imageResult.stats;
    syncDebugGlobals();
    
    updateProgress(60, 'Extracting themes...');
    // Generate enhanced data for evolution slides
    stats.enhanced = generateEnhancedAnalysis(data);
    syncDebugGlobals();
    
    // Generate semantic themes
    discoveredThemes = generateDiscoveredThemes(stats, data);
    syncDebugGlobals();
    
    updateProgress(75, 'Extracting vocabulary...');
    // Extract top words
    stats.topWords = extractTopWords(data);
    syncDebugGlobals();
    
    updateProgress(80, 'Mapping activity...');
    // Generate heatmap data
    heatmapData = generateHeatmapData(data);
    syncDebugGlobals();

    // Wire heatmap streak/activity data into stats for achievements (Bug 3A fix)
    if (heatmapData && heatmapData.stats) {
      stats.enhanced.longestStreak = heatmapData.stats.longestStreak;
      stats.enhanced.totalActiveDays = heatmapData.stats.activeDays;
      stats.streaks = {
        longestStreak: heatmapData.stats.longestStreak,
        totalActiveDays: heatmapData.stats.activeDays,
      };
      syncDebugGlobals();
    }
    
    updateProgress(85, 'Generating insights...');
    // Generate AI insights from the data
    aiInsights = generateDataInsights(stats, data);
    syncDebugGlobals();
    await new Promise(r => setTimeout(r, 500));
    
    updateProgress(100, 'Done!');
    await new Promise(r => setTimeout(r, 300));
    
    populateSlides(stats);
    showScreen('wrapped');
    syncDebugGlobals();
    
  } catch (err) {
    console.error(err);
    showError(err.message);
    showScreen('upload');
  }
}

function showError(message) {
  // Remove existing error
  const existing = document.querySelector('.error-message');
  if (existing) existing.remove();

  let hint = '';
  if (message.includes('conversations.json')) {
    hint = 'Make sure you\'re uploading the full ChatGPT export ZIP file, or extract the <code>conversations.json</code> file directly.';
  } else if (message.includes('JSON')) {
    hint = 'The file doesn\'t appear to be valid JSON. Try downloading a fresh export from ChatGPT.';
  } else {
    hint = 'Try downloading a fresh export from <a href="https://chat.openai.com/#settings/DataControls" target="_blank" style="color: var(--accent)">ChatGPT Settings → Data Controls → Export</a>.';
  }

  const errorEl = document.createElement('div');
  errorEl.className = 'error-message';
  errorEl.innerHTML = `
    <strong>❌ Error processing file</strong>
    <p>${message}</p>
    <p style="margin-top: 0.5rem">${hint}</p>
  `;
  
  const privacyNote = document.querySelector('.privacy-note');
  if (privacyNote) {
    privacyNote.before(errorEl);
  }
}

function clearError() {
  const existing = document.querySelector('.error-message');
  if (existing) existing.remove();
}

// Load JSZip dynamically
async function loadJSZip() {
  if (window.JSZip) return window.JSZip;
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
    script.onload = () => resolve(window.JSZip);
    script.onerror = reject;
    document.head.appendChild(script);
  });
}
