/* ============================================
   Phase 28: Grab icon, drag to drop zone → hand off
   ============================================ */
window.__editorPhases = window.__editorPhases || {};

window.__editorPhases.dragImageToCenter = (() => {
  'use strict';

  const { wait } = window.__editorHelpers;
  const STATE = window.__editorState;

  async function dragImageToCenter() {
    const { editorMain, fakeCursor } = STATE.dom;
    const imageBtn = document.querySelector('.editor__attach-btn');
    const btnRect = imageBtn.getBoundingClientRect();
    const mainRect = editorMain.getBoundingClientRect();

    // --- Grab hand SVG (replaces arrow cursor) ---
    const GRAB_SVG = '<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">'
      + '<path d="M7.5 9V5.5a1 1 0 0 1 2 0V9m0-4.5v-1a1 1 0 0 1 2 0V9m0-3.5a1 1 0 0 1 2 0V9'
      + 'm0 0v4.5a4 4 0 0 1-4 4h-1a4 4 0 0 1-4-4V8a1 1 0 0 1 2 0v1'
      + 'm0-2.5V5a1 1 0 0 1 2 0v4" stroke="white" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    const origCursorSVG = fakeCursor.innerHTML;

    // 1. Change cursor to grab hand
    fakeCursor.innerHTML = GRAB_SVG;
    await wait(200);

    // 2. Pick up — create ghost icon over the button
    const ghost = document.createElement('div');
    ghost.className = 'drag-ghost';
    ghost.style.width = '32px';
    ghost.style.height = '32px';
    ghost.innerHTML = imageBtn.querySelector('svg').outerHTML;
    ghost.style.left = `${btnRect.left + btnRect.width / 2 - 16}px`;
    ghost.style.top = `${btnRect.top + btnRect.height / 2 - 16}px`;
    ghost.style.transform = 'scale(1) rotate(0deg)';
    document.body.appendChild(ghost);
    ghost.offsetHeight;

    ghost.classList.add('drag-ghost--visible');
    ghost.style.transition = 'transform 0.25s ease';
    ghost.style.transform = 'scale(1.3) rotate(-5deg)';

    imageBtn.style.transition = 'opacity 0.15s ease';
    imageBtn.style.opacity = '0';
    await wait(300);

    // 3. Drop zone appears in editor__main center
    const dropZone = document.createElement('div');
    dropZone.className = 'drop-zone';

    const dzIcon = document.createElement('div');
    dzIcon.className = 'drop-zone__icon';
    dzIcon.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">'
      + '<rect x="3" y="3" width="18" height="18" rx="3"/>'
      + '<circle cx="8.5" cy="8.5" r="1.5"/>'
      + '<path d="M21 15l-5-5L5 21"/></svg>';

    const dzLabel = document.createElement('div');
    dzLabel.className = 'drop-zone__label';
    dzLabel.textContent = 'Drop to create';

    dropZone.appendChild(dzIcon);
    dropZone.appendChild(dzLabel);
    editorMain.appendChild(dropZone);
    dropZone.offsetHeight;
    dropZone.classList.add('drop-zone--visible');
    await wait(300);

    // 4. Drag ghost + cursor to center of drop zone
    const dropCenterX = mainRect.left + mainRect.width / 2;
    const dropCenterY = mainRect.top + mainRect.height / 2;

    fakeCursor.style.transition =
      'left 0.8s cubic-bezier(0.4, 0, 0.15, 1), ' +
      'top 0.8s cubic-bezier(0.4, 0, 0.15, 1)';
    fakeCursor.style.left = `${dropCenterX - 10}px`;
    fakeCursor.style.top = `${dropCenterY - 10}px`;

    ghost.style.transition =
      'left 0.8s cubic-bezier(0.4, 0, 0.15, 1), ' +
      'top 0.8s cubic-bezier(0.4, 0, 0.15, 1), ' +
      'transform 0.8s cubic-bezier(0.4, 0, 0.15, 1)';
    ghost.style.left = `${dropCenterX - 16}px`;
    ghost.style.top = `${dropCenterY - 16}px`;
    ghost.style.transform = 'scale(1.3) rotate(-5deg)';

    setTimeout(() => dropZone.classList.add('drop-zone--active'), 500);
    await wait(850);

    // 5. Drop — ghost shrinks and fades into the zone
    ghost.style.transition = 'transform 0.25s ease, opacity 0.25s ease';
    ghost.style.transform = 'scale(0.5) rotate(0deg)';
    ghost.style.opacity = '0';

    dropZone.classList.add('drop-zone--pulse');
    await wait(300);

    ghost.remove();

    dropZone.classList.remove('drop-zone--visible');
    dropZone.classList.remove('drop-zone--active');

    fakeCursor.classList.remove('fake-cursor--visible');
    await wait(300);
    fakeCursor.innerHTML = origCursorSVG;

    dropZone.remove();

    // --- Hand off to image-unfold module ---
    if (window.__imageUnfold && window.__imageUnfold.start) {
      await window.__imageUnfold.start();
    }

    // --- Drag icon back from center to the attach button ---
    const mainRect2 = editorMain.getBoundingClientRect();
    const centerX = mainRect2.left + mainRect2.width / 2;
    const centerY = mainRect2.top  + mainRect2.height / 2;
    const btnRect2 = imageBtn.getBoundingClientRect();

    fakeCursor.innerHTML = GRAB_SVG;
    fakeCursor.style.transition = 'none';
    fakeCursor.style.left = `${centerX - 10}px`;
    fakeCursor.style.top  = `${centerY - 10}px`;
    fakeCursor.classList.add('fake-cursor--visible');
    fakeCursor.offsetHeight;

    const ghost2 = document.createElement('div');
    ghost2.className = 'drag-ghost';
    ghost2.style.width  = '32px';
    ghost2.style.height = '32px';
    ghost2.innerHTML = imageBtn.querySelector('svg').outerHTML;
    ghost2.style.left = `${centerX - 16}px`;
    ghost2.style.top  = `${centerY - 16}px`;
    ghost2.style.transform = 'scale(1.3) rotate(-5deg)';
    document.body.appendChild(ghost2);
    ghost2.offsetHeight;
    ghost2.classList.add('drag-ghost--visible');

    await wait(400);

    fakeCursor.style.transition =
      'left 0.8s cubic-bezier(0.4, 0, 0.15, 1), ' +
      'top 0.8s cubic-bezier(0.4, 0, 0.15, 1)';
    fakeCursor.style.left = `${btnRect2.left + btnRect2.width / 2 - 3}px`;
    fakeCursor.style.top  = `${btnRect2.top + btnRect2.height / 2 - 3}px`;

    ghost2.style.transition =
      'left 0.8s cubic-bezier(0.4, 0, 0.15, 1), ' +
      'top 0.8s cubic-bezier(0.4, 0, 0.15, 1), ' +
      'transform 0.8s cubic-bezier(0.4, 0, 0.15, 1)';
    ghost2.style.left = `${btnRect2.left + btnRect2.width / 2 - 16}px`;
    ghost2.style.top  = `${btnRect2.top + btnRect2.height / 2 - 16}px`;
    ghost2.style.transform = 'scale(1) rotate(0deg)';

    await wait(850);

    ghost2.style.transition = 'opacity 0.2s ease';
    ghost2.style.opacity = '0';
    imageBtn.style.transition = 'opacity 0.2s ease';
    imageBtn.style.opacity = '1';
    await wait(250);

    ghost2.remove();

    fakeCursor.innerHTML = origCursorSVG;
    fakeCursor.classList.remove('fake-cursor--visible');

    imageBtn.style.transition = '';
    imageBtn.style.opacity = '';
  }

  return dragImageToCenter;
})();
