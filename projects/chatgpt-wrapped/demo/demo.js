/* ============================================
   ChatGPT Wrapped — Demo Navigation & Animations
   ============================================ */

(function () {
  'use strict';

  const TOTAL_SLIDES = 16;
  let current = 0;
  let animating = false;

  const deck = document.querySelector('.deck');
  const dots = document.querySelectorAll('.dot');
  const slides = document.querySelectorAll('.slide');

  /* ----------------------------------------
     Navigation
     ---------------------------------------- */

  function goTo(index, instant) {
    if (index < 0 || index >= TOTAL_SLIDES) return;
    if (animating && !instant) return;

    // Deactivate old slide
    slides[current].classList.remove('active');

    current = index;

    // Translate deck
    const slideWidth = slides[0].offsetWidth;
    deck.style.transform = `translateX(-${current * slideWidth}px)`;

    // Update dots
    dots.forEach((d, i) => d.classList.toggle('active', i === current));

    // Activate new slide (after brief delay so CSS transition resets)
    animating = true;
    setTimeout(() => {
      resetSlideAnimations(current);
      slides[current].classList.add('active');
      triggerSlideAnimations(current);
      animating = false;
    }, instant ? 0 : 60);
  }

  function next() { goTo(current + 1); }
  function prev() { goTo(current - 1); }

  // Arrow keys
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next();
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') prev();
  });

  // Dot clicks
  dots.forEach((d, i) => d.addEventListener('click', () => goTo(i)));

  /* ----------------------------------------
     Touch / Mouse Swipe
     ---------------------------------------- */
  let startX = 0;
  let startY = 0;
  let dragging = false;

  const swipeTarget = document.querySelector('.phone-frame') || document.body;

  swipeTarget.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    dragging = true;
  }, { passive: true });

  swipeTarget.addEventListener('touchend', (e) => {
    if (!dragging) return;
    dragging = false;
    const dx = e.changedTouches[0].clientX - startX;
    const dy = e.changedTouches[0].clientY - startY;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
      dx < 0 ? next() : prev();
    }
  }, { passive: true });

  // Mouse drag (for desktop testing)
  swipeTarget.addEventListener('mousedown', (e) => {
    startX = e.clientX;
    dragging = true;
  });

  swipeTarget.addEventListener('mouseup', (e) => {
    if (!dragging) return;
    dragging = false;
    const dx = e.clientX - startX;
    if (Math.abs(dx) > 40) {
      dx < 0 ? next() : prev();
    }
  });

  /* ----------------------------------------
     Responsive: recalculate on resize
     ---------------------------------------- */
  window.addEventListener('resize', () => {
    const slideWidth = slides[0].offsetWidth;
    deck.style.transition = 'none';
    deck.style.transform = `translateX(-${current * slideWidth}px)`;
    requestAnimationFrame(() => {
      deck.style.transition = '';
    });
  });

  /* ----------------------------------------
     Reset animations (so re-entering replays)
     ---------------------------------------- */
  function resetSlideAnimations(idx) {
    const slide = slides[idx];

    // Reset fade-in animated elements
    slide.querySelectorAll('.anim, .anim-slow').forEach((el) => {
      el.style.animation = 'none';
      el.offsetHeight; // force reflow
      el.style.animation = '';
    });

    // Reset staggered items
    slide.querySelectorAll('.traj-item, .traj-arrow, .topic-row, .fun-fact').forEach((el) => {
      el.classList.remove('show');
    });

    // Reset badge
    slide.querySelectorAll('.badge').forEach((el) => el.classList.remove('show'));

    // Reset heatmap cells
    slide.querySelectorAll('.hm-cell').forEach((el) => el.classList.remove('show'));

    // Reset SVG curve
    const curve = slide.querySelector('.usage-curve');
    if (curve) {
      curve.classList.remove('animate');
      curve.offsetHeight;
    }
    const fill = slide.querySelector('.usage-curve-fill');
    if (fill) {
      fill.classList.remove('animate');
      fill.offsetHeight;
    }

    // Reset benchmark dot
    const dot = slide.querySelector('.benchmark-dot');
    if (dot) dot.style.left = '0%';

    // Reset count-up numbers
    slide.querySelectorAll('[data-count]').forEach((el) => {
      el.textContent = '0';
    });
  }

  /* ----------------------------------------
     Trigger animations for a specific slide
     ---------------------------------------- */
  function triggerSlideAnimations(idx) {
    const slide = slides[idx];

    // Count-up numbers
    slide.querySelectorAll('[data-count]').forEach((el) => {
      const target = parseInt(el.getAttribute('data-count'), 10);
      const suffix = el.getAttribute('data-suffix') || '';
      const prefix = el.getAttribute('data-prefix') || '';
      animateCount(el, target, 800, prefix, suffix);
    });

    // Staggered items (trajectory, topics, fun facts)
    const staggerItems = slide.querySelectorAll('.traj-item, .traj-arrow');
    staggerItems.forEach((el, i) => {
      setTimeout(() => el.classList.add('show'), 200 + i * 300);
    });

    const topicRows = slide.querySelectorAll('.topic-row');
    topicRows.forEach((el, i) => {
      setTimeout(() => el.classList.add('show'), 200 + i * 200);
    });

    const funFacts = slide.querySelectorAll('.fun-fact');
    funFacts.forEach((el, i) => {
      setTimeout(() => el.classList.add('show'), 200 + i * 400);
    });

    // Badge slide-in
    const badges = slide.querySelectorAll('.badge');
    badges.forEach((el) => {
      setTimeout(() => el.classList.add('show'), 900);
    });

    // Heatmap fill
    const heatmapCells = slide.querySelectorAll('.hm-cell');
    if (heatmapCells.length > 0) {
      heatmapCells.forEach((el, i) => {
        setTimeout(() => el.classList.add('show'), 100 + i * 4);
      });
    }

    // SVG curve draw
    const curve = slide.querySelector('.usage-curve');
    if (curve) {
      const len = curve.getTotalLength();
      curve.style.setProperty('--path-length', len);
      requestAnimationFrame(() => curve.classList.add('animate'));
      const fill = slide.querySelector('.usage-curve-fill');
      if (fill) {
        requestAnimationFrame(() => fill.classList.add('animate'));
      }
    }

    // Benchmark dot
    const benchDot = slide.querySelector('.benchmark-dot');
    if (benchDot) {
      setTimeout(() => {
        benchDot.style.left = benchDot.getAttribute('data-position') || '95%';
      }, 300);
    }

    // Growth "42" and "247" animation
    const growthBefore = slide.querySelector('.growth-before .hero-number');
    const growthAfter = slide.querySelector('.growth-after .hero-number');
    if (growthBefore && growthAfter) {
      growthBefore.style.opacity = '0';
      growthAfter.style.opacity = '0';
      growthAfter.style.transform = 'scale(0.4)';
      setTimeout(() => {
        growthBefore.style.transition = 'opacity 0.4s ease';
        growthBefore.style.opacity = '1';
      }, 200);
      setTimeout(() => {
        growthAfter.style.transition = 'opacity 0.5s ease, transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
        growthAfter.style.opacity = '1';
        growthAfter.style.transform = 'scale(1)';
      }, 600);
    }
  }

  /* ----------------------------------------
     Count-up Animation
     ---------------------------------------- */
  function animateCount(el, target, duration, prefix, suffix) {
    const start = performance.now();
    function step(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = Math.round(eased * target);
      el.textContent = prefix + value.toLocaleString() + suffix;
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  /* ----------------------------------------
     Generate Heatmap Data (hardcoded pattern)
     ---------------------------------------- */
  function generateHeatmap() {
    const grid = document.querySelector('.heatmap');
    if (!grid) return;

    // 52 weeks × 7 days, column-major (each column = 1 week)
    // Simulate a power user: 312 active days out of 365
    const seed = [
      2,3,1,0,3,2,1, 1,2,0,3,1,2,0, 2,1,3,0,2,1,3, 0,2,1,0,3,2,1,
      3,2,1,4,2,3,1, 2,3,1,2,0,3,2, 1,2,3,0,4,2,1, 3,1,2,3,0,2,1,
      2,3,4,1,2,3,0, 1,2,3,2,4,1,2, 3,2,1,3,2,4,1, 0,3,2,1,4,3,2,
      1,4,3,2,3,4,2, 3,2,4,1,3,2,4, 2,3,1,4,2,3,1, 4,3,2,1,3,4,2,
      3,4,2,3,4,3,2, 4,3,4,2,3,4,3, 3,4,3,4,2,4,3, 4,3,4,3,4,2,4,
      3,4,4,3,4,3,4, 4,3,4,4,3,4,3, 4,4,3,4,4,3,4, 3,4,3,2,4,3,2,
      4,4,4,3,4,4,3, 4,3,4,4,3,4,4, 3,4,3,4,4,3,2, 4,4,4,4,3,4,4,
      4,3,4,4,3,4,3, 3,4,2,4,3,4,2, 4,3,4,3,4,3,4, 3,2,4,3,2,3,4,
      2,3,2,4,3,2,3, 4,3,2,3,4,2,3, 3,2,4,3,2,3,2, 4,3,2,3,4,2,3,
      3,4,2,3,2,4,3, 2,3,4,2,3,2,4, 3,2,3,4,2,3,2, 4,3,2,3,4,3,2,
      3,2,4,3,2,3,4, 2,3,2,3,4,3,2, 3,4,2,3,2,3,4, 2,3,4,3,2,3,4,
      3,2,4,3,2,3,4, 2,3,4,2,3,4,3, 2,3,4,3,2,3,4, 3,2,4,3,2,3,4,
      3,4,2,3,4,3,2, 3,4,3,4,2,3,4, 3,4,2,3,4,3,2, 4,3,2,3,0,0,0
    ];

    // We need 52 * 7 = 364 cells
    for (let col = 0; col < 52; col++) {
      for (let row = 0; row < 7; row++) {
        const i = col * 7 + row;
        const cell = document.createElement('div');
        cell.className = 'hm-cell';
        const level = seed[i % seed.length] || 0;
        if (level > 0) cell.classList.add('l' + Math.min(level, 4));
        grid.appendChild(cell);
      }
    }
  }

  /* ----------------------------------------
     Init
     ---------------------------------------- */
  generateHeatmap();
  slides[0].classList.add('active');
  dots[0].classList.add('active');

  // Kick off first slide animations after a tiny delay
  setTimeout(() => triggerSlideAnimations(0), 100);
})();
