/* ============================================
   Phase 29: Award Room — Final Summary Screen
   ============================================ */
window.__editorPhases = window.__editorPhases || {};

window.__editorPhases.showAwardRoom = (() => {
  'use strict';

  const CFG = window.__editorConfig;
  const H   = window.__editorHelpers;

  const { wait, animateCount } = H;
  const { AWARD_STATS } = CFG;

  async function showAwardRoom() {
    const header = document.querySelector('.editor__header');
    const footer = document.querySelector('.editor__footer');
    const viewport = document.getElementById('viewport');

    // --- 1. Fade out header & footer ---
    if (header) {
      header.style.transition = 'opacity 0.5s ease';
      header.style.opacity = '0';
    }
    if (footer) {
      footer.style.transition = 'opacity 0.5s ease';
      footer.style.opacity = '0';
      footer.style.pointerEvents = 'none';
    }
    await wait(500);

    if (header) header.style.display = 'none';
    if (footer) footer.style.display = 'none';

    await wait(200);

    // --- 2. Build the award room DOM ---
    const roomEl = document.createElement('div');
    roomEl.className = 'award-room';

    const inner = document.createElement('div');
    inner.className = 'award-room__inner';

    // Hero
    const hero = document.createElement('div');
    hero.className = 'award-room__hero';

    const glowEl = document.createElement('div');
    glowEl.className = 'award-room__glow';
    hero.appendChild(glowEl);

    const titleEl = document.createElement('h2');
    titleEl.className = 'award-room__title';
    titleEl.textContent = 'Your Year with ChatGPT';
    hero.appendChild(titleEl);

    const joinedEl = document.createElement('p');
    joinedEl.className = 'award-room__joined';
    joinedEl.textContent = 'Member since Jan 12, 2023';
    hero.appendChild(joinedEl);

    inner.appendChild(hero);

    // Stats grid
    const grid = document.createElement('div');
    grid.className = 'award-room__grid';

    const cardEls = [];
    const numberEls = [];

    AWARD_STATS.forEach((stat) => {
      const card = document.createElement('div');
      card.className = 'award-card';

      const number = document.createElement('div');
      number.className = `award-card__number award-card__number--${stat.color}`;
      if (stat.isDate) {
        number.textContent = stat.value;
        number.style.fontSize = 'clamp(18px, 4vw, 26px)';
        number.style.fontWeight = '700';
        number.style.letterSpacing = '-0.01em';
      } else {
        number.textContent = '0';
      }
      card.appendChild(number);

      if (stat.suffix && !stat.isDate) {
        const suf = document.createElement('span');
        suf.className = 'award-card__suffix';
        suf.textContent = ' ' + stat.suffix;
        number.appendChild(suf);
      }

      const label = document.createElement('div');
      label.className = 'award-card__label';
      label.textContent = stat.label;
      card.appendChild(label);

      grid.appendChild(card);
      cardEls.push(card);
      numberEls.push({ el: number, stat });
    });

    inner.appendChild(grid);

    // Download Video CTA
    const ctaWrap = document.createElement('div');
    ctaWrap.className = 'award-room__cta-wrap';

    const btn = document.createElement('button');
    btn.className = 'award-room__download-btn';
    btn.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
      + '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>'
      + '<polyline points="7 10 12 15 17 10"/>'
      + '<line x1="12" y1="15" x2="12" y2="3"/>'
      + '</svg>'
      + 'Download Video';
    ctaWrap.appendChild(btn);

    const tagline = document.createElement('div');
    tagline.className = 'award-room__tagline';
    tagline.textContent = 'Share your ChatGPT story';
    ctaWrap.appendChild(tagline);

    inner.appendChild(ctaWrap);
    roomEl.appendChild(inner);
    viewport.appendChild(roomEl);

    // --- 3. Staggered reveal ---
    void roomEl.offsetWidth;

    roomEl.style.transition = 'opacity 0.6s ease';
    roomEl.style.opacity = '1';
    await wait(600);

    glowEl.style.transition = 'opacity 0.8s ease';
    glowEl.style.opacity = '1';

    titleEl.style.transition = 'opacity 0.6s ease, transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)';
    titleEl.style.opacity = '1';
    titleEl.style.transform = 'translateY(0)';
    await wait(300);

    joinedEl.style.transition = 'opacity 0.5s ease, transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)';
    joinedEl.style.opacity = '1';
    joinedEl.style.transform = 'translateY(0)';
    await wait(400);

    // Cards stagger in
    for (let i = 0; i < cardEls.length; i++) {
      const card = cardEls[i];
      const { el, stat } = numberEls[i];

      card.style.transition = 'opacity 0.5s ease, transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
      card.style.opacity = '1';
      card.style.transform = 'scale(1) translateY(0)';

      if (!stat.isDate) {
        const suffix = el.querySelector('.award-card__suffix');
        animateCount(el, stat.value, '', 600 + i * 50);
        if (suffix) {
          await wait(20);
          el.appendChild(suffix);
        }
      }

      await wait(120);
    }

    await wait(300);

    ctaWrap.style.transition = 'opacity 0.6s ease, transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)';
    ctaWrap.style.opacity = '1';
    ctaWrap.style.transform = 'translateY(0)';
  }

  return showAwardRoom;
})();
