// Fractal Reader — Background Service Worker

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-20250514';

// Build the analysis prompt
function buildPrompt(title, url, selectedText) {
  return `Ты — исследовательский ассистент. Пользователь читает статью и выделил фрагмент текста для глубокого анализа.

Контекст страницы:
- Заголовок: ${title}
- URL: ${url}

Выделенный фрагмент:
${selectedText}

Проанализируй этот фрагмент и предоставь:

## 1. ДИАЛЕКТИКА
Какие разные школы мысли, теоретические позиции или точки зрения существуют по затронутому вопросу? Опиши 2-4 позиции, укажи названия школ/направлений, если применимо.

## 2. ОТСЫЛКИ ДЛЯ ИЗУЧЕНИЯ
Какие концепции, книги, авторы или теории помогут глубже понять этот вопрос? Дай 3-5 конкретных рекомендаций с кратким пояснением релевантности.

## 3. СВЯЗИ С ДРУГИМИ ОБЛАСТЯМИ
Где похожие идеи, паттерны или принципы встречаются в других доменах? Приведи 2-4 примера аналогового переноса из других областей знания.

## 4. ВОПРОСЫ СЕБЕ
Какие вопросы читатель может задать себе, чтобы глубже осмыслить этот материал? Сформулируй 3-5 рефлексивных вопросов, которые помогут критически проанализировать идею, связать её с личным опытом или применить на практике.

Отвечай структурированно, кратко, по существу. Используй markdown для форматирования.`;
}

// Call Anthropic API
async function callAnthropicAPI(apiKey, prompt) {
  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `API error: ${response.status}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'analyze') {
    handleAnalyzeRequest(request, sender.tab?.id)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));

    // Return true to indicate async response
    return true;
  }
});

async function handleAnalyzeRequest(request, tabId) {
  const { title, url, selectedText } = request;

  // Get API key from storage
  const { apiKey } = await chrome.storage.local.get('apiKey');

  if (!apiKey) {
    throw new Error('API-ключ не настроен. Откройте настройки расширения.');
  }

  // Build prompt and call API
  const prompt = buildPrompt(title, url, selectedText);
  const result = await callAnthropicAPI(apiKey, prompt);

  return result;
}

// Update icon when extension is installed
chrome.runtime.onInstalled.addListener(() => {
  console.log('Fractal Reader installed');
});
