/* ============================================
   Phase 13: Open sidebar with conversation list
   ============================================ */
window.__editorPhases = window.__editorPhases || {};

window.__editorPhases.openSidebar = (() => {
  'use strict';

  const CFG   = window.__editorConfig;
  const H     = window.__editorHelpers;
  const STATE = window.__editorState;

  const { wait } = H;
  const { SIDEBAR_CONVERSATIONS } = CFG;
  const T = CFG.TIMINGS.PHASE_13;

  async function openSidebar() {
    const { editor } = STATE.dom;

    const sidebar = document.getElementById('sidebar');
    const sidebarList = document.getElementById('sidebar-list');

    // Build the conversation list — store topic data on each item
    const allItems = [];
    for (const group of SIDEBAR_CONVERSATIONS) {
      const groupLabel = document.createElement('div');
      groupLabel.className = 'sidebar__group';
      groupLabel.textContent = group.group;
      sidebarList.appendChild(groupLabel);

      for (const conv of group.items) {
        const item = document.createElement('div');
        item.className = 'sidebar__item';
        if (conv.active) item.classList.add('sidebar__item--active');
        item.textContent = conv.title;
        item.dataset.topic = conv.topic;
        sidebarList.appendChild(item);
        allItems.push(item);
      }
    }

    // Slide the sidebar open
    sidebar.classList.add('editor__sidebar--open');
    editor.classList.add('editor--sidebar-open');
    await wait(T.SIDEBAR_SLIDE_WAIT);

    // Stagger the conversation items in
    for (let i = 0; i < allItems.length; i++) {
      allItems[i].classList.add('sidebar__item--entering');
      await wait(T.ITEM_STAGGER);
    }

    // Clean up the old backdrop messages now that the sidebar is the focus
    if (STATE.chatMessages) {
      STATE.chatMessages.remove();
      STATE.chatMessages = null;
    }

    // Hold so user can read the sidebar
    await wait(T.FINAL_HOLD);

    return allItems;
  }

  return openSidebar;
})();
