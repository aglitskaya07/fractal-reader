// Fractal Reader — Content Script (Shadow DOM Edition)

(function() {
  'use strict';

  // Prevent multiple injections
  if (window.__fractalReaderLoaded) return;
  window.__fractalReaderLoaded = true;

  // State
  let triggerHost = null;
  let triggerShadow = null;
  let triggerButton = null;
  let popupHost = null;
  let popupShadow = null;
  let resultPopup = null;
  let currentSelection = '';
  let currentContext = { title: '', url: '' };

  // Get CSS for injection into Shadow DOM
  function getStyles() {
    return `
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');

      :host {
        all: initial;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      }

      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }

      /* CSS Variables */
      .fr-root {
        --fr-accent: #374151;
        --fr-accent-light: #6b7280;
        --fr-accent-dark: #1f2937;
        --fr-glass-bg: rgba(245, 245, 247, 0.96);
        --fr-glass-border: rgba(255, 255, 255, 0.7);
        --fr-glass-shadow:
          0 8px 40px rgba(0, 0, 0, 0.15),
          0 0 0 1px rgba(255, 255, 255, 0.9) inset;
        --fr-glass-blur: 120px;
        --fr-text: #1f2937;
        --fr-text-muted: #6b7280;
        --fr-border: rgba(0, 0, 0, 0.08);
        --fr-radius: 12px;
        --fr-radius-sm: 8px;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 14px;
        line-height: 1.7;
        color: var(--fr-text);
      }

      /* Trigger Button */
      .fr-trigger {
        position: fixed;
        z-index: 2147483647;
        display: none;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        padding: 0;
        border: 1px solid var(--fr-glass-border);
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        color: var(--fr-accent);
        cursor: pointer;
        box-shadow: var(--fr-glass-shadow);
        transition: all 0.2s ease;
      }

      .fr-trigger:hover {
        transform: scale(1.1);
        background: #fff;
      }

      .fr-trigger svg {
        width: 16px;
        height: 16px;
      }

      /* Result Popup */
      .fr-popup {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 2147483646;
        width: 420px;
        max-height: calc(100vh - 40px);
        border-radius: var(--fr-radius);
        overflow: hidden;
        display: none;
        flex-direction: column;
        background: var(--fr-glass-bg);
        backdrop-filter: blur(var(--fr-glass-blur)) saturate(200%);
        -webkit-backdrop-filter: blur(var(--fr-glass-blur)) saturate(200%);
        border: 1px solid var(--fr-glass-border);
        box-shadow: var(--fr-glass-shadow);
      }

      .fr-popup.fr-popup-visible {
        display: flex;
        animation: fr-slide-in 0.3s ease-out;
      }

      @keyframes fr-slide-in {
        from {
          opacity: 0;
          transform: translateY(-10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      /* Popup Header */
      .fr-popup-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 14px 18px;
        background: rgba(249, 250, 251, 0.8);
        border-bottom: 1px solid var(--fr-border);
      }

      .fr-popup-title {
        margin: 0;
        font-size: 14px;
        font-weight: 600;
        color: var(--fr-text);
        letter-spacing: -0.01em;
      }

      .fr-popup-close {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 26px;
        height: 26px;
        padding: 0;
        border: none;
        border-radius: 6px;
        background: transparent;
        color: var(--fr-text-muted);
        font-size: 16px;
        cursor: pointer;
        transition: all 0.15s ease;
      }

      .fr-popup-close:hover {
        background: rgba(0, 0, 0, 0.05);
        color: var(--fr-text);
      }

      /* Tabs */
      .fr-popup-tabs {
        display: flex;
        gap: 2px;
        padding: 8px 12px;
        background: rgba(249, 250, 251, 0.6);
        border-bottom: 1px solid var(--fr-border);
      }

      .fr-tab {
        display: flex;
        align-items: center;
        gap: 5px;
        padding: 7px 11px;
        border: none;
        border-radius: 6px;
        background: transparent;
        color: var(--fr-text-muted);
        font-family: inherit;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.15s ease;
        white-space: nowrap;
      }

      .fr-tab:hover {
        background: rgba(0, 0, 0, 0.04);
        color: var(--fr-text);
      }

      .fr-tab.active {
        background: #fff;
        color: var(--fr-text);
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
      }

      .fr-tab svg {
        flex-shrink: 0;
        width: 13px;
        height: 13px;
        opacity: 0.5;
      }

      .fr-tab.active svg {
        opacity: 0.7;
      }

      /* Content Area */
      .fr-popup-content {
        flex: 1;
        overflow-y: auto;
        padding: 0;
        max-height: 500px;
      }

      .fr-tab-content {
        display: none;
        padding: 16px 20px;
      }

      .fr-tab-content.active {
        display: block;
        animation: fr-fade-in 0.2s ease;
      }

      @keyframes fr-fade-in {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      /* Typography */
      .fr-tab-content h3 {
        margin: 0 0 12px;
        font-size: 14px;
        font-weight: 600;
        color: var(--fr-text);
      }

      .fr-tab-content h4 {
        margin: 18px 0 8px;
        font-size: 13px;
        font-weight: 600;
        color: var(--fr-accent);
      }

      .fr-tab-content p {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 8px;
        margin: 0 0 14px;
        color: var(--fr-text);
        line-height: 1.6;
      }

      .fr-tab-content p .fr-item-text {
        flex: 1;
      }

      .fr-tab-content ul,
      .fr-tab-content ol {
        margin: 0 0 12px;
        padding-left: 0;
        list-style: none;
      }

      .fr-tab-content li {
        position: relative;
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 8px;
        margin-bottom: 10px;
        padding-left: 16px;
        color: var(--fr-text);
        line-height: 1.6;
      }

      .fr-tab-content li::before {
        content: '';
        position: absolute;
        left: 0;
        top: 8px;
        width: 4px;
        height: 4px;
        border-radius: 50%;
        background: var(--fr-accent-light);
      }

      .fr-tab-content li .fr-item-text {
        flex: 1;
      }

      .fr-tab-content strong {
        font-weight: 600;
      }

      .fr-tab-content em {
        font-style: italic;
      }

      .fr-empty {
        color: var(--fr-text-muted);
        text-align: center;
        padding: 24px;
        line-height: 28px;
      }

      /* Deep Dive Buttons */
      .fr-dive-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 20px;
        height: 20px;
        min-width: 20px;
        margin-left: 10px;
        padding: 0;
        border: 1.5px solid var(--fr-accent-light);
        border-radius: 50%;
        background: transparent;
        color: var(--fr-accent-light);
        cursor: pointer;
        transition: all 0.2s ease;
        flex-shrink: 0;
        opacity: 0.6;
      }

      .fr-dive-btn svg {
        width: 10px;
        height: 10px;
        transition: transform 0.2s ease;
      }

      .fr-dive-btn:hover {
        opacity: 1;
        border-color: var(--fr-accent);
        color: var(--fr-accent);
        background: rgba(55, 65, 81, 0.08);
      }

      .fr-dive-btn:hover svg {
        transform: translate(1px, -1px);
      }

      .fr-dive-btn:active {
        transform: scale(0.9);
      }

      /* Loading State */
      .fr-loading {
        display: none;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 50px 20px;
        gap: 16px;
      }

      .fr-fractal {
        width: 80px;
        height: 80px;
      }

      .fr-fractal-svg {
        width: 100%;
        height: 100%;
        overflow: visible;
      }

      .fr-node-center {
        fill: var(--fr-accent);
        animation: fr-pulse-center 2s ease-in-out infinite;
      }

      @keyframes fr-pulse-center {
        0%, 100% { r: 3; opacity: 1; }
        50% { r: 4; opacity: 0.8; }
      }

      .fr-branch {
        stroke: var(--fr-accent);
        stroke-width: 1.5;
        stroke-linecap: round;
        stroke-dasharray: 35;
        stroke-dashoffset: 35;
        animation: fr-grow 1.5s ease-out forwards infinite;
      }

      .fr-b1 { animation-delay: 0s; }
      .fr-b2 { animation-delay: 0.1s; }
      .fr-b3 { animation-delay: 0.2s; }
      .fr-b4 { animation-delay: 0.3s; }
      .fr-b5 { animation-delay: 0.4s; }
      .fr-b6 { animation-delay: 0.5s; }

      @keyframes fr-grow {
        0% { stroke-dashoffset: 35; opacity: 0.3; }
        50% { stroke-dashoffset: 0; opacity: 1; }
        100% { stroke-dashoffset: 0; opacity: 0.3; }
      }

      .fr-node {
        fill: var(--fr-accent-light);
        opacity: 0;
        animation: fr-appear 1.5s ease-out forwards infinite;
      }

      .fr-n1 { animation-delay: 0.2s; }
      .fr-n2 { animation-delay: 0.3s; }
      .fr-n3 { animation-delay: 0.4s; }
      .fr-n4 { animation-delay: 0.5s; }
      .fr-n5 { animation-delay: 0.6s; }
      .fr-n6 { animation-delay: 0.7s; }

      @keyframes fr-appear {
        0% { opacity: 0; r: 0; }
        30% { opacity: 1; r: 2.5; }
        70% { opacity: 1; r: 2; }
        100% { opacity: 0; r: 0; }
      }

      .fr-branch-sm {
        stroke: var(--fr-accent-light);
        stroke-width: 1;
        stroke-linecap: round;
        stroke-dasharray: 20;
        stroke-dashoffset: 20;
        opacity: 0.7;
        animation: fr-grow-sm 1.5s ease-out forwards infinite;
      }

      .fr-b1-1, .fr-b1-2 { animation-delay: 0.4s; }
      .fr-b2-1, .fr-b2-2 { animation-delay: 0.5s; }
      .fr-b3-1, .fr-b3-2 { animation-delay: 0.6s; }
      .fr-b4-1, .fr-b4-2 { animation-delay: 0.7s; }
      .fr-b5-1, .fr-b5-2 { animation-delay: 0.8s; }
      .fr-b6-1, .fr-b6-2 { animation-delay: 0.9s; }

      @keyframes fr-grow-sm {
        0% { stroke-dashoffset: 20; opacity: 0; }
        40% { stroke-dashoffset: 0; opacity: 0.6; }
        80% { stroke-dashoffset: 0; opacity: 0.6; }
        100% { stroke-dashoffset: 0; opacity: 0; }
      }

      .fr-node-sm {
        fill: var(--fr-text-muted);
        opacity: 0;
        animation: fr-appear-sm 1.5s ease-out forwards infinite;
      }

      .fr-ns1, .fr-ns2 { animation-delay: 0.6s; }
      .fr-ns3, .fr-ns4 { animation-delay: 0.7s; }
      .fr-ns5, .fr-ns6 { animation-delay: 0.8s; }
      .fr-ns7, .fr-ns8 { animation-delay: 0.9s; }
      .fr-ns9, .fr-ns10 { animation-delay: 1.0s; }
      .fr-ns11, .fr-ns12 { animation-delay: 1.1s; }

      @keyframes fr-appear-sm {
        0% { opacity: 0; r: 0; }
        40% { opacity: 0.5; r: 1.5; }
        80% { opacity: 0.5; r: 1.5; }
        100% { opacity: 0; r: 0; }
      }

      .fr-loading-text {
        margin: 0;
        color: var(--fr-text-muted);
        font-size: 13px;
        font-weight: 500;
        letter-spacing: 0.02em;
      }

      /* Error State */
      .fr-error {
        display: none;
        padding: 14px 18px;
        margin: 16px;
        background: rgba(239, 68, 68, 0.06);
        border: 1px solid rgba(239, 68, 68, 0.15);
        border-left: 3px solid rgba(239, 68, 68, 0.5);
        border-radius: var(--fr-radius-sm);
        color: #b91c1c;
        font-size: 13px;
        font-weight: 500;
      }

      /* Scrollbar */
      .fr-popup-content::-webkit-scrollbar {
        width: 8px;
      }

      .fr-popup-content::-webkit-scrollbar-track {
        background: rgba(0, 0, 0, 0.02);
      }

      .fr-popup-content::-webkit-scrollbar-thumb {
        background: rgba(0, 0, 0, 0.12);
        border-radius: 4px;
      }

      .fr-popup-content::-webkit-scrollbar-thumb:hover {
        background: rgba(0, 0, 0, 0.2);
      }
    `;
  }

  // Create trigger button with Shadow DOM
  function createTriggerButton() {
    // Create host element
    triggerHost = document.createElement('div');
    triggerHost.id = 'fr-trigger-host';
    triggerHost.style.cssText = 'position: absolute; z-index: 2147483647; pointer-events: none;';
    document.body.appendChild(triggerHost);

    // Create shadow root
    triggerShadow = triggerHost.attachShadow({ mode: 'closed' });

    // Add styles
    const style = document.createElement('style');
    style.textContent = getStyles();
    triggerShadow.appendChild(style);

    // Create button
    const root = document.createElement('div');
    root.className = 'fr-root';

    const btn = document.createElement('button');
    btn.className = 'fr-trigger';
    btn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="8"/>
        <path d="m21 21-4.3-4.3"/>
      </svg>
    `;
    btn.title = 'Исследовать';
    btn.style.pointerEvents = 'auto';

    root.appendChild(btn);
    triggerShadow.appendChild(root);

    return btn;
  }

  // Create result popup with Shadow DOM
  function createResultPopup() {
    // Create host element
    popupHost = document.createElement('div');
    popupHost.id = 'fr-popup-host';
    popupHost.style.cssText = 'position: fixed; top: 0; left: 0; z-index: 2147483646; pointer-events: none;';
    document.body.appendChild(popupHost);

    // Create shadow root
    popupShadow = popupHost.attachShadow({ mode: 'closed' });

    // Add styles
    const style = document.createElement('style');
    style.textContent = getStyles();
    popupShadow.appendChild(style);

    // Create popup
    const root = document.createElement('div');
    root.className = 'fr-root';

    const popup = document.createElement('div');
    popup.className = 'fr-popup';
    popup.style.pointerEvents = 'auto';
    popup.innerHTML = `
      <div class="fr-popup-header">
        <h2 class="fr-popup-title">Анализ</h2>
        <button class="fr-popup-close" title="Закрыть">&times;</button>
      </div>
      <div class="fr-popup-tabs">
        <button class="fr-tab active" data-tab="dialectics">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m3 17 2 2 4-4"/>
            <path d="m3 7 2 2 4-4"/>
            <path d="M13 6h8"/>
            <path d="M13 12h8"/>
            <path d="M13 18h8"/>
          </svg>
          Диалектика
        </button>
        <button class="fr-tab" data-tab="references">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>
          </svg>
          Отсылки
        </button>
        <button class="fr-tab" data-tab="connections">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="2"/>
            <circle cx="4" cy="12" r="2"/>
            <circle cx="20" cy="12" r="2"/>
            <path d="M6 12h4"/>
            <path d="M14 12h4"/>
          </svg>
          Связи
        </button>
        <button class="fr-tab" data-tab="questions">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
            <path d="M12 17h.01"/>
          </svg>
          Вопросы
        </button>
      </div>
      <div class="fr-popup-content">
        <div class="fr-tab-content active" data-content="dialectics"></div>
        <div class="fr-tab-content" data-content="references"></div>
        <div class="fr-tab-content" data-content="connections"></div>
        <div class="fr-tab-content" data-content="questions"></div>
        <div class="fr-loading">
          <div class="fr-fractal">
            <svg viewBox="0 0 100 100" class="fr-fractal-svg">
              <circle cx="50" cy="50" r="3" class="fr-node fr-node-center"/>
              <line x1="50" y1="50" x2="50" y2="20" class="fr-branch fr-b1"/>
              <line x1="50" y1="50" x2="76" y2="35" class="fr-branch fr-b2"/>
              <line x1="50" y1="50" x2="76" y2="65" class="fr-branch fr-b3"/>
              <line x1="50" y1="50" x2="50" y2="80" class="fr-branch fr-b4"/>
              <line x1="50" y1="50" x2="24" y2="65" class="fr-branch fr-b5"/>
              <line x1="50" y1="50" x2="24" y2="35" class="fr-branch fr-b6"/>
              <circle cx="50" cy="20" r="2" class="fr-node fr-n1"/>
              <circle cx="76" cy="35" r="2" class="fr-node fr-n2"/>
              <circle cx="76" cy="65" r="2" class="fr-node fr-n3"/>
              <circle cx="50" cy="80" r="2" class="fr-node fr-n4"/>
              <circle cx="24" cy="65" r="2" class="fr-node fr-n5"/>
              <circle cx="24" cy="35" r="2" class="fr-node fr-n6"/>
              <line x1="50" y1="20" x2="40" y2="8" class="fr-branch-sm fr-b1-1"/>
              <line x1="50" y1="20" x2="60" y2="8" class="fr-branch-sm fr-b1-2"/>
              <line x1="76" y1="35" x2="90" y2="28" class="fr-branch-sm fr-b2-1"/>
              <line x1="76" y1="35" x2="88" y2="45" class="fr-branch-sm fr-b2-2"/>
              <line x1="76" y1="65" x2="88" y2="55" class="fr-branch-sm fr-b3-1"/>
              <line x1="76" y1="65" x2="90" y2="72" class="fr-branch-sm fr-b3-2"/>
              <line x1="50" y1="80" x2="40" y2="92" class="fr-branch-sm fr-b4-1"/>
              <line x1="50" y1="80" x2="60" y2="92" class="fr-branch-sm fr-b4-2"/>
              <line x1="24" y1="65" x2="12" y2="72" class="fr-branch-sm fr-b5-1"/>
              <line x1="24" y1="65" x2="10" y2="55" class="fr-branch-sm fr-b5-2"/>
              <line x1="24" y1="35" x2="10" y2="45" class="fr-branch-sm fr-b6-1"/>
              <line x1="24" y1="35" x2="12" y2="28" class="fr-branch-sm fr-b6-2"/>
              <circle cx="40" cy="8" r="1.5" class="fr-node-sm fr-ns1"/>
              <circle cx="60" cy="8" r="1.5" class="fr-node-sm fr-ns2"/>
              <circle cx="90" cy="28" r="1.5" class="fr-node-sm fr-ns3"/>
              <circle cx="88" cy="45" r="1.5" class="fr-node-sm fr-ns4"/>
              <circle cx="88" cy="55" r="1.5" class="fr-node-sm fr-ns5"/>
              <circle cx="90" cy="72" r="1.5" class="fr-node-sm fr-ns6"/>
              <circle cx="40" cy="92" r="1.5" class="fr-node-sm fr-ns7"/>
              <circle cx="60" cy="92" r="1.5" class="fr-node-sm fr-ns8"/>
              <circle cx="12" cy="72" r="1.5" class="fr-node-sm fr-ns9"/>
              <circle cx="10" cy="55" r="1.5" class="fr-node-sm fr-ns10"/>
              <circle cx="10" cy="45" r="1.5" class="fr-node-sm fr-ns11"/>
              <circle cx="12" cy="28" r="1.5" class="fr-node-sm fr-ns12"/>
            </svg>
          </div>
          <p class="fr-loading-text">Выращиваю связи</p>
        </div>
        <div class="fr-error"></div>
      </div>
    `;

    root.appendChild(popup);
    popupShadow.appendChild(root);

    // Close button
    popup.querySelector('.fr-popup-close').addEventListener('click', hidePopup);

    // Tab switching
    popup.querySelectorAll('.fr-tab').forEach(tab => {
      tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });

    return popup;
  }

  // Initialize
  function init() {
    triggerButton = createTriggerButton();
    resultPopup = createResultPopup();

    // Listen for text selection
    document.addEventListener('mouseup', handleMouseUp);

    // Hide trigger on scroll or click outside
    document.addEventListener('scroll', hideTrigger, true);
    document.addEventListener('mousedown', handleMouseDown);

    // Click outside popup to close (check if click is outside shadow DOM)
    document.addEventListener('click', (e) => {
      if (resultPopup.classList.contains('fr-popup-visible') &&
          e.target !== popupHost &&
          e.target !== triggerHost &&
          !popupHost.contains(e.target) &&
          !triggerHost.contains(e.target)) {
        hidePopup();
      }
    });

    // Trigger button click
    triggerButton.addEventListener('click', handleAnalyze);
  }

  // Handle mouse up (text selection)
  function handleMouseUp(e) {
    // Ignore if clicking on our elements (shadow hosts)
    if (e.target === triggerHost || e.target === popupHost ||
        triggerHost.contains(e.target) || popupHost.contains(e.target)) {
      return;
    }

    setTimeout(() => {
      const selection = window.getSelection();
      const text = selection.toString().trim();

      if (text.length > 10) {
        currentSelection = text;
        showTrigger(e.clientX, e.clientY);
      } else {
        hideTrigger();
      }
    }, 10);
  }

  // Handle mouse down
  function handleMouseDown(e) {
    if (e.target !== triggerHost && e.target !== popupHost &&
        !triggerHost.contains(e.target) && !popupHost.contains(e.target)) {
      hideTrigger();
    }
  }

  // Show trigger button
  function showTrigger(x, y) {
    triggerButton.style.display = 'flex';
    triggerButton.style.left = `${x + 10}px`;
    triggerButton.style.top = `${y - 30}px`;
  }

  // Hide trigger button
  function hideTrigger() {
    if (triggerButton) {
      triggerButton.style.display = 'none';
    }
  }

  // Show popup
  function showPopup() {
    resultPopup.classList.add('fr-popup-visible');
  }

  // Hide popup
  function hidePopup() {
    resultPopup.classList.remove('fr-popup-visible');
  }

  // Switch tabs
  function switchTab(tabName) {
    resultPopup.querySelectorAll('.fr-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.tab === tabName);
    });
    resultPopup.querySelectorAll('.fr-tab-content').forEach(c => {
      c.classList.toggle('active', c.dataset.content === tabName);
    });
  }

  // Handle analyze request
  async function handleAnalyze(e) {
    e.preventDefault();
    e.stopPropagation();

    if (!currentSelection) return;

    // Save context
    currentContext = {
      title: document.title,
      url: window.location.href,
      selectedText: currentSelection
    };

    hideTrigger();
    showPopup();
    showLoading(true);
    hideError();

    try {
      // Check if extension context is valid
      if (!chrome?.runtime?.id) {
        throw new Error('Расширение было обновлено. Перезагрузите страницу (F5).');
      }

      const response = await chrome.runtime.sendMessage({
        action: 'analyze',
        title: currentContext.title,
        url: currentContext.url,
        selectedText: currentSelection
      });

      if (response.success) {
        displayResults(response.data);
      } else {
        showError(response.error || 'Произошла ошибка');
      }
    } catch (error) {
      showError(error.message || 'Не удалось связаться с расширением');
    } finally {
      showLoading(false);
    }
  }

  // Display results
  function displayResults(markdown) {
    const sections = parseMarkdownSections(markdown);

    const dialecticsEl = resultPopup.querySelector('[data-content="dialectics"]');
    const referencesEl = resultPopup.querySelector('[data-content="references"]');
    const connectionsEl = resultPopup.querySelector('[data-content="connections"]');
    const questionsEl = resultPopup.querySelector('[data-content="questions"]');

    dialecticsEl.innerHTML = renderMarkdown(sections.dialectics || 'Нет данных');
    referencesEl.innerHTML = renderMarkdown(sections.references || 'Нет данных');
    connectionsEl.innerHTML = renderMarkdown(sections.connections || 'Нет данных');
    questionsEl.innerHTML = renderMarkdown(sections.questions || 'Нет данных');

    // Add + buttons to all list items
    addPlusButtonsToLists();

    // Deep dive buttons are now handled in addPlusButtonsToLists()

    // Switch to first tab
    switchTab('dialectics');
  }

  // Add + buttons to all content items (li and p elements)
  function addPlusButtonsToLists() {
    // Add to list items
    resultPopup.querySelectorAll('.fr-tab-content li').forEach(el => {
      addDiveButtonToElement(el);
    });

    // Add to paragraphs (but not empty ones or ones that are just whitespace)
    resultPopup.querySelectorAll('.fr-tab-content p').forEach(el => {
      const text = el.textContent.trim();
      // Skip very short paragraphs or empty ones
      if (text.length > 20) {
        addDiveButtonToElement(el);
      }
    });
  }

  // Helper to add dive button to an element
  function addDiveButtonToElement(el) {
    // Skip if already has button
    if (el.querySelector('.fr-dive-btn')) return;

    const textContent = el.textContent.trim();
    if (!textContent) return;

    // Wrap existing content in span
    const span = document.createElement('span');
    span.className = 'fr-item-text';
    span.innerHTML = el.innerHTML;

    // Create button with arrow icon
    const btn = document.createElement('button');
    btn.className = 'fr-dive-btn';
    btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17L17 7"/><path d="M7 7h10v10"/></svg>`;
    btn.title = 'Обсудить с Claude';
    btn.setAttribute('data-concept', textContent);

    // Replace element content
    el.innerHTML = '';
    el.appendChild(span);
    el.appendChild(btn);

    // Add click handler directly to the button
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const concept = btn.getAttribute('data-concept');
      const url = createDeepDiveUrl(concept);
      window.open(url, '_blank');
    });
  }

  // Parse markdown sections
  function parseMarkdownSections(markdown) {
    const sections = {
      dialectics: '',
      references: '',
      connections: '',
      questions: ''
    };

    // Split by headers
    const dialecticsMatch = markdown.match(/#+\s*(?:1\.?\s*)?ДИАЛЕКТИКА\s*([\s\S]*?)(?=#+\s*(?:2\.?\s*)?ОТСЫЛКИ|$)/i);
    const referencesMatch = markdown.match(/#+\s*(?:2\.?\s*)?ОТСЫЛКИ[^\n]*\s*([\s\S]*?)(?=#+\s*(?:3\.?\s*)?СВЯЗИ|$)/i);
    const connectionsMatch = markdown.match(/#+\s*(?:3\.?\s*)?СВЯЗИ[^\n]*\s*([\s\S]*?)(?=#+\s*(?:4\.?\s*)?ВОПРОСЫ|$)/i);
    const questionsMatch = markdown.match(/#+\s*(?:4\.?\s*)?ВОПРОСЫ[^\n]*\s*([\s\S]*?)$/i);

    if (dialecticsMatch) sections.dialectics = dialecticsMatch[1].trim();
    if (referencesMatch) sections.references = referencesMatch[1].trim();
    if (connectionsMatch) sections.connections = connectionsMatch[1].trim();
    if (questionsMatch) sections.questions = questionsMatch[1].trim();

    return sections;
  }

  // Create Claude.ai deep dive URL
  function createDeepDiveUrl(concept) {
    const prompt = `Я читаю статью "${currentContext.title}" (${currentContext.url})

Помоги мне глубже разобраться с этой концепцией/вопросом:
${concept}

Контекст моего чтения:
${currentContext.selectedText}`;

    const encodedPrompt = encodeURIComponent(prompt);
    return `https://claude.ai/new?q=${encodedPrompt}`;
  }


  // Simple markdown renderer
  function renderMarkdown(text) {
    if (!text) return '<p class="fr-empty">Нет данных</p>';

    // Split by double newlines to get paragraphs
    const blocks = text.split(/\n\n+/);

    let html = blocks.map(block => {
      block = block.trim();
      if (!block) return '';

      // Check if it's a header
      if (/^###\s+/.test(block)) {
        return block.replace(/^###\s+(.+)$/gm, '<h4>$1</h4>');
      }
      if (/^##?\s+/.test(block)) {
        return block.replace(/^##?\s+(.+)$/gm, '<h3>$1</h3>');
      }

      // Check if it's a list (starts with - * • or number)
      if (/^[-*•]\s+|^\d+\.\s+/.test(block)) {
        const items = block
          .replace(/^[-*•]\s+(.+)$/gm, '<li>$1</li>')
          .replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>');
        return `<ul>${items}</ul>`;
      }

      // Otherwise it's a paragraph
      return `<p>${block}</p>`;
    }).join('\n');

    // Apply inline formatting
    html = html
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*\n]+)\*/g, '<em>$1</em>');

    return html;
  }

  // Show loading state
  function showLoading(show) {
    const loading = resultPopup.querySelector('.fr-loading');
    const contents = resultPopup.querySelectorAll('.fr-tab-content');

    loading.style.display = show ? 'flex' : 'none';
    contents.forEach(c => c.style.display = show ? 'none' : '');
  }

  // Show error
  function showError(message) {
    const errorEl = resultPopup.querySelector('.fr-error');
    errorEl.textContent = message;
    errorEl.style.display = 'block';

    const contents = resultPopup.querySelectorAll('.fr-tab-content');
    contents.forEach(c => c.style.display = 'none');
  }

  // Hide error
  function hideError() {
    const errorEl = resultPopup.querySelector('.fr-error');
    errorEl.style.display = 'none';
  }

  // Start
  init();
})();
