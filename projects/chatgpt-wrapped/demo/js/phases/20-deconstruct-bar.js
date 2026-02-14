/* ============================================
   Phase 20: Deconstruct bar chart → rolling square
   ============================================ */
window.__editorPhases = window.__editorPhases || {};

window.__editorPhases.deconstructBarChart = (() => {
  'use strict';

  const H     = window.__editorHelpers;
  const STATE = window.__editorState;

  const { wait, jitter, rollSquareToCenter } = H;

  async function deconstructBarChart(refs) {
    const { editor } = STATE.dom;
    const {
      aiResponse, textContainer, streamCursor,
      graphContainer, graphWrap,
    } = refs;

    // Grab live DOM elements inside the graph
    const titleEl = graphContainer.querySelector('.line-graph__title');
    const barChart = graphContainer.querySelector('.insight-bar-chart');
    const barCols = barChart ? Array.from(barChart.querySelectorAll('.insight-bar-col')) : [];
    const barEls = barChart ? Array.from(barChart.querySelectorAll('.insight-bar')) : [];
    const valueEls = barChart ? Array.from(barChart.querySelectorAll('.insight-bar__value')) : [];
    const labelEls = barChart ? Array.from(barChart.querySelectorAll('.insight-bar__label')) : [];

    // -------------------------------------------------------
    // Wave 1: Text + bubble removal (~800ms)
    // -------------------------------------------------------

    aiResponse.classList.remove('chat-ai-response--wrapped');

    textContainer.style.transition = 'opacity 0.4s ease, max-height 0.6s ease';
    textContainer.style.opacity = '0';
    setTimeout(() => {
      textContainer.style.maxHeight = '0';
      textContainer.style.overflow = 'hidden';
    }, 250);

    streamCursor.classList.add('chat-ai-response__cursor--hidden');

    graphWrap.style.transition = 'background 0.6s ease, box-shadow 0.6s ease, padding 0.6s ease, gap 0.6s ease';
    graphWrap.style.background = 'transparent';
    graphWrap.style.boxShadow = 'none';

    await wait(500);

    graphWrap.style.padding = '0';
    graphWrap.style.gap = '0';

    await wait(300);

    // -------------------------------------------------------
    // Wave 2: Zoom tighter onto the graph (~900ms)
    // -------------------------------------------------------

    const targetScale = 2.2;

    const savedTransform = editor.style.transform;
    const savedTransition = editor.style.transition;
    editor.style.transition = 'none';
    editor.style.transform = 'none';
    editor.offsetHeight; // force reflow

    const editorRect = editor.getBoundingClientRect();
    const graphRect = graphContainer.getBoundingClientRect();

    const graphCenterY = (graphRect.top + graphRect.bottom) / 2 - editorRect.top;
    const editorCenterY = editorRect.height / 2;
    const translateY = editorCenterY - graphCenterY;

    editor.style.transform = savedTransform;
    editor.offsetHeight; // force reflow

    editor.style.transition = 'transform 0.9s cubic-bezier(0.4, 0, 0.2, 1)';
    editor.style.transform = `scale(${targetScale}) translateY(${translateY}px)`;

    await wait(1000);

    // -------------------------------------------------------
    // Wave 3: Parallel bar chart deconstruction (~1200ms)
    // -------------------------------------------------------

    const wave3 = [];

    // 3a: Title unwrite (word-by-word reverse)
    wave3.push((async () => {
      if (!titleEl) return;
      let text = titleEl.textContent;
      while (text.length > 0) {
        const lastSpace = text.lastIndexOf(' ');
        if (lastSpace === -1) {
          text = '';
        } else {
          text = text.substring(0, lastSpace);
        }
        titleEl.textContent = text;
        await wait(jitter(50, 15));
      }
      titleEl.style.transition = 'opacity 0.2s ease';
      titleEl.style.opacity = '0';
    })());

    // 3b: Fade out value labels
    wave3.push((async () => {
      for (const v of valueEls) {
        v.style.transition = 'opacity 0.3s ease';
        v.style.opacity = '0';
      }
      await wait(350);
    })());

    // 3c: Fade out category labels
    wave3.push((async () => {
      for (const l of labelEls) {
        l.style.transition = 'opacity 0.3s ease';
        l.style.opacity = '0';
      }
      await wait(350);
    })());

    // 3d: Fade green background + border
    wave3.push((async () => {
      graphContainer.style.transition = 'background 0.5s ease, border-color 0.5s ease';
      graphContainer.style.background = 'transparent';
      graphContainer.style.borderColor = 'transparent';
      await wait(550);
    })());

    // -------------------------------------------------------
    // 3e + 3f: Place overlay on first bar, then collapse bars
    // -------------------------------------------------------

    const gcScreenRect = graphContainer.getBoundingClientRect();
    const localW = graphContainer.offsetWidth;
    const scale = gcScreenRect.width / localW;

    const fbScreen = barEls[0].getBoundingClientRect();
    const localBarLeft   = (fbScreen.left   - gcScreenRect.left) / scale;
    const localBarTop    = (fbScreen.top    - gcScreenRect.top)  / scale;
    const localBarWidth  = fbScreen.width  / scale;
    const localBarHeight = fbScreen.height / scale;

    const overlay = document.createElement('div');
    overlay.style.position    = 'absolute';
    overlay.style.left        = `${localBarLeft}px`;
    overlay.style.top         = `${localBarTop}px`;
    overlay.style.width       = `${localBarWidth}px`;
    overlay.style.height      = `${localBarHeight}px`;
    overlay.style.background  = 'rgba(16, 185, 129, 0.85)';
    overlay.style.borderRadius = '6px 6px 2px 2px';
    overlay.style.zIndex      = '10';
    overlay.style.pointerEvents = 'none';
    graphContainer.appendChild(overlay);

    wave3.push((async () => {
      for (let i = barEls.length - 1; i >= 0; i--) {
        barEls[i].style.transition = 'height 0.4s cubic-bezier(0.4, 0, 0.15, 1), opacity 0.35s ease';
        barEls[i].style.height = '0px';
        barEls[i].style.opacity = '0';
        await wait(80);
      }
      await wait(450);
      barChart.remove();
    })());

    await Promise.all(wave3);
    await wait(200);

    // -------------------------------------------------------
    // Wave 4: Overlay shrinks to a perfect square
    // -------------------------------------------------------

    graphContainer.style.overflow = 'visible';

    const squareSize = 36;
    const bottomEdge = localBarTop + localBarHeight;
    const squareTop  = bottomEdge - squareSize;

    overlay.style.transition = 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1), ' +
                                'height 0.5s cubic-bezier(0.4, 0, 0.2, 1), ' +
                                'top 0.5s cubic-bezier(0.4, 0, 0.2, 1), ' +
                                'border-radius 0.4s ease';
    overlay.style.width       = `${squareSize}px`;
    overlay.style.height      = `${squareSize}px`;
    overlay.style.top         = `${squareTop}px`;
    overlay.style.borderRadius = '0px';

    await wait(650);

    overlay.style.transition = 'none';
    overlay.style.transform  = 'rotate(0deg)';
    overlay.offsetHeight;

    await wait(400);

    // -------------------------------------------------------
    // Wave 5: Square rolls side-to-side to center
    // -------------------------------------------------------

    const targetX = (localW / 2) - (squareSize / 2);

    await rollSquareToCenter(overlay, squareSize, targetX);

    overlay.style.transition = 'none';

    return overlay;
  }

  return deconstructBarChart;
})();
