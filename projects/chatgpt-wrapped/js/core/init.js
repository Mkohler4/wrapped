// ============================================
// ChatGPT Wrapped - Initialization
// ============================================

document.addEventListener('DOMContentLoaded', function() {
  initFileHandling();
  initKeyboardNavigation();
  initModalHandlers();
});

function initFileHandling() {
  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');

  if (dropZone && fileInput) {
    dropZone.onclick = () => fileInput.click();

    dropZone.ondragover = (e) => {
      e.preventDefault();
      dropZone.classList.add('dragover');
    };

    dropZone.ondragleave = () => dropZone.classList.remove('dragover');

    dropZone.ondrop = (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
      clearError();
      const file = e.dataTransfer.files[0];
      if (file) {
        if (!file.name.endsWith('.zip') && !file.name.endsWith('.json')) {
          showError('Please upload a .zip or .json file');
          return;
        }
        processFile(file);
      }
    };

    fileInput.onchange = (e) => {
      clearError();
      const file = e.target.files[0];
      if (file) processFile(file);
    };
  }
}

function initKeyboardNavigation() {
  document.onkeydown = (e) => {
    const isDebugToggle = (e.ctrlKey || e.metaKey) && e.altKey && (e.key === 'D' || e.key === 'd');
    if (isDebugToggle && typeof window.toggleDebugPanel === 'function') {
      e.preventDefault();
      window.toggleDebugPanel();
      return;
    }
    if (e.key === 'ArrowRight' || e.key === ' ') nextSlide();
    if (e.key === 'ArrowLeft') prevSlide();
    if (e.key === 'Escape') closeEvidenceModal();
  };
}

function initModalHandlers() {
  // Close modal on escape is handled in keyboard navigation
}

