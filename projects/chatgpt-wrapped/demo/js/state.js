/* ============================================
   Shared DOM references & mutable state
   ============================================
   Initialized once after DOMContentLoaded.
   All phase files read/write via window.__editorState.
   ============================================ */
window.__editorState = (() => {
  'use strict';

  // --- DOM references (populated by init()) ---
  const dom = {
    editor:      null,
    editorMain:  null,
    inputWrap:   null,
    inputText:   null,
    cursor:      null,
    placeholder: null,
    sendBtn:     null,
    fakeCursor:  null,
  };

  // --- Mutable state shared across phases ---
  let hasZoomed = false;
  let chatMessages = null; // container created during Phase 4 (sendMessage)

  /** Call once when the DOM is ready */
  function init() {
    dom.editor      = document.getElementById('editor');
    dom.editorMain  = document.querySelector('.editor__main');
    dom.inputWrap   = document.getElementById('input-wrap');
    dom.inputText   = document.getElementById('input-text');
    dom.cursor      = document.getElementById('cursor');
    dom.placeholder = document.getElementById('placeholder');
    dom.sendBtn     = document.getElementById('send-btn');
    dom.fakeCursor  = document.getElementById('fake-cursor');
  }

  return {
    dom,
    get hasZoomed() { return hasZoomed; },
    set hasZoomed(v) { hasZoomed = v; },
    get chatMessages() { return chatMessages; },
    set chatMessages(v) { chatMessages = v; },
    init,
  };
})();
