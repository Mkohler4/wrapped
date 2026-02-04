// ============================================
// ChatGPT Wrapped - File Handling
// ============================================

async function processFile(file) {
  showScreen('processing');
  updateProgress(10, 'Reading file...');

  try {
    let data;
    
    if (file.name.endsWith('.zip')) {
      // Handle ZIP file
      updateProgress(20, 'Extracting ZIP...');
      const JSZip = await loadJSZip();
      const zip = await JSZip.loadAsync(file);
      const jsonFile = zip.file('conversations.json');
      if (!jsonFile) throw new Error('conversations.json not found in ZIP');
      const content = await jsonFile.async('string');
      data = JSON.parse(content);
    } else {
      // Handle JSON directly
      const content = await file.text();
      data = JSON.parse(content);
    }

    updateProgress(40, 'Analyzing conversations...');
    stats = analyzeConversations(data);
    
    updateProgress(80, 'Generating insights...');
    await new Promise(r => setTimeout(r, 500));
    
    updateProgress(100, 'Done!');
    await new Promise(r => setTimeout(r, 300));
    
    populateSlides(stats);
    showScreen('wrapped');
    
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

