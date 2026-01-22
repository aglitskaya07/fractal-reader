// Fractal Reader — Content Script

(function() {
  'use strict';

  // Prevent multiple injections
  if (window.__fractalReaderLoaded) return;
  window.__fractalReaderLoaded = true;

  // State
  let triggerButton = null;
  let resultPopup = null;
  let currentSelection = '';

  // Create trigger button (magnifying glass)
  function createTriggerButton() {
    const btn = document.createElement('button');
    btn.id = 'fr-trigger';
    btn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="8"/>
        <path d="m21 21-4.3-4.3"/>
      </svg>
    `;
    btn.title = 'Исследовать';
    btn.style.display = 'none';
    document.body.appendChild(btn);
    return btn;
  }

  // Create result popup
  function createResultPopup() {
    const popup = document.createElement('div');
    popup.id = 'fr-popup';
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
              <!-- Центральная точка -->
              <circle cx="50" cy="50" r="3" class="fr-node fr-node-center"/>

              <!-- Первый уровень ветвей -->
              <line x1="50" y1="50" x2="50" y2="20" class="fr-branch fr-b1"/>
              <line x1="50" y1="50" x2="76" y2="35" class="fr-branch fr-b2"/>
              <line x1="50" y1="50" x2="76" y2="65" class="fr-branch fr-b3"/>
              <line x1="50" y1="50" x2="50" y2="80" class="fr-branch fr-b4"/>
              <line x1="50" y1="50" x2="24" y2="65" class="fr-branch fr-b5"/>
              <line x1="50" y1="50" x2="24" y2="35" class="fr-branch fr-b6"/>

              <!-- Узлы первого уровня -->
              <circle cx="50" cy="20" r="2" class="fr-node fr-n1"/>
              <circle cx="76" cy="35" r="2" class="fr-node fr-n2"/>
              <circle cx="76" cy="65" r="2" class="fr-node fr-n3"/>
              <circle cx="50" cy="80" r="2" class="fr-node fr-n4"/>
              <circle cx="24" cy="65" r="2" class="fr-node fr-n5"/>
              <circle cx="24" cy="35" r="2" class="fr-node fr-n6"/>

              <!-- Второй уровень — подветви -->
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

              <!-- Узлы второго уровня -->
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
    popup.style.display = 'none';
    document.body.appendChild(popup);

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

    // Click outside popup to close
    document.addEventListener('click', (e) => {
      if (resultPopup.style.display !== 'none' &&
          !resultPopup.contains(e.target) &&
          e.target !== triggerButton) {
        hidePopup();
      }
    });

    // Trigger button click
    triggerButton.addEventListener('click', handleAnalyze);
  }

  // Handle mouse up (text selection)
  function handleMouseUp(e) {
    // Ignore if clicking on our elements
    if (e.target.closest('#fr-trigger') || e.target.closest('#fr-popup')) {
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
    if (!e.target.closest('#fr-trigger') && !e.target.closest('#fr-popup')) {
      hideTrigger();
    }
  }

  // Show trigger button
  function showTrigger(x, y) {
    triggerButton.style.display = 'flex';
    triggerButton.style.left = `${x + window.scrollX + 10}px`;
    triggerButton.style.top = `${y + window.scrollY - 30}px`;
  }

  // Hide trigger button
  function hideTrigger() {
    if (triggerButton) {
      triggerButton.style.display = 'none';
    }
  }

  // Show popup
  function showPopup() {
    resultPopup.style.display = 'block';
    resultPopup.classList.add('fr-popup-visible');
  }

  // Hide popup
  function hidePopup() {
    resultPopup.style.display = 'none';
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

    hideTrigger();
    showPopup();
    showLoading(true);
    hideError();

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'analyze',
        title: document.title,
        url: window.location.href,
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

    // Switch to first tab
    switchTab('dialectics');
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

  // Simple markdown renderer
  function renderMarkdown(text) {
    if (!text) return '<p class="fr-empty">Нет данных</p>';

    return text
      // Escape HTML
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      // Headers
      .replace(/^### (.+)$/gm, '<h4>$1</h4>')
      .replace(/^## (.+)$/gm, '<h3>$1</h3>')
      .replace(/^# (.+)$/gm, '<h3>$1</h3>')
      // Bold
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      // Italic
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      // Lists
      .replace(/^[-*]\s+(.+)$/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
      // Numbered lists
      .replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>')
      // Paragraphs
      .replace(/\n\n/g, '</p><p>')
      .replace(/^(.+)$/gm, (match) => {
        if (match.startsWith('<')) return match;
        return match;
      })
      // Wrap in paragraph if not already wrapped
      .replace(/^(?!<[hulo])(.+)/gm, '<p>$1</p>')
      // Clean up empty paragraphs
      .replace(/<p><\/p>/g, '')
      .replace(/<p>\s*<\/p>/g, '');
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
