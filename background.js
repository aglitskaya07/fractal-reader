// Fractal Reader — Background Service Worker

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-20250514';

// System prompt (will be cached)
const SYSTEM_PROMPT = `Ты — исследовательский ассистент. Пользователь читает статью и выделил фрагмент текста для глубокого анализа.

Проанализируй предоставленный фрагмент и дай структурированный ответ:

## 1. ДИАЛЕКТИКА
Какие разные школы мысли, теоретические позиции или точки зрения существуют по затронутому вопросу? Опиши 2-4 позиции, укажи названия школ/направлений, если применимо.

## 2. ОТСЫЛКИ ДЛЯ ИЗУЧЕНИЯ
Какие концепции, книги, авторы или теории помогут глубже понять этот вопрос? Дай 3-5 конкретных рекомендаций с кратким пояснением релевантности.

## 3. СВЯЗИ С ДРУГИМИ ОБЛАСТЯМИ
Где похожие идеи, паттерны или принципы встречаются в других доменах? Приведи 2-4 примера аналогового переноса из других областей знания.

## 4. ВОПРОСЫ СЕБЕ
Какие вопросы читатель может задать себе, чтобы глубже осмыслить этот материал? Сформулируй 3-5 рефлексивных вопросов, которые помогут критически проанализировать идею, связать её с личным опытом или применить на практике.

Отвечай структурированно, кратко, по существу. Используй markdown для форматирования.`;

// Build user message with context
function buildUserMessage(title, url, selectedText) {
  return `Контекст страницы:
- Заголовок: ${title}
- URL: ${url}

Выделенный фрагмент:
${selectedText}`;
}

// Stream Anthropic API response via SSE
async function streamAnthropicAPI(apiKey, userMessage, onChunk, onDone, onError) {
  let response;
  try {
    response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1536,
        stream: true,
        system: [
          {
            type: 'text',
            text: SYSTEM_PROMPT,
            cache_control: { type: 'ephemeral' }
          }
        ],
        messages: [
          {
            role: 'user',
            content: userMessage
          }
        ]
      })
    });
  } catch (e) {
    onError(e?.message || 'Network error');
    return;
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    onError(errorData.error?.message || `API error: ${response.status}`);
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    let chunk;
    try {
      chunk = await reader.read();
    } catch (e) {
      onError(e?.message || 'Stream read error');
      return;
    }
    if (chunk.done) break;

    buffer += decoder.decode(chunk.value, { stream: true });

    let sep;
    while ((sep = buffer.indexOf('\n\n')) !== -1) {
      const rawEvent = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);

      const dataLines = rawEvent
        .split('\n')
        .filter(l => l.startsWith('data:'))
        .map(l => l.slice(5).trim());
      if (dataLines.length === 0) continue;

      const dataStr = dataLines.join('');
      if (!dataStr || dataStr === '[DONE]') continue;

      let payload;
      try {
        payload = JSON.parse(dataStr);
      } catch {
        continue;
      }

      if (payload.type === 'content_block_delta' && payload.delta?.type === 'text_delta') {
        onChunk(payload.delta.text);
      } else if (payload.type === 'error') {
        onError(payload.error?.message || 'Stream error');
        return;
      }
    }
  }

  onDone();
}

// Long-lived port for streaming analysis
chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'analyze') return;

  const safePost = (msg) => {
    try { port.postMessage(msg); } catch {}
  };

  port.onMessage.addListener(async (request) => {
    if (request.action !== 'analyze') return;

    const { apiKey } = await chrome.storage.local.get('apiKey');
    if (!apiKey) {
      safePost({ type: 'error', error: 'API-ключ не настроен. Откройте настройки расширения.' });
      try { port.disconnect(); } catch {}
      return;
    }

    const userMessage = buildUserMessage(request.title, request.url, request.selectedText);

    await streamAnthropicAPI(
      apiKey,
      userMessage,
      (text) => safePost({ type: 'chunk', text }),
      () => {
        safePost({ type: 'done' });
        try { port.disconnect(); } catch {}
      },
      (error) => {
        safePost({ type: 'error', error });
        try { port.disconnect(); } catch {}
      }
    );
  });
});

// Lightweight ping handler to keep service worker warm
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request?.type === 'ping') {
    sendResponse({ ok: true });
  }
});

// Update icon when extension is installed
chrome.runtime.onInstalled.addListener(() => {
  console.log('Fractal Reader installed');
});
