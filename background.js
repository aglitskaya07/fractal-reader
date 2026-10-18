// Fractal Reader — Background Service Worker

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
// Haiku is fast enough for reasoning over the text; references need real
// books and authors, where a small model is more likely to invent them.
// Each model turns thinking off its own way: Sonnet 5.5 rejects 'disabled'.
const FAST_MODEL = { model: 'claude-haiku-5-5', thinking: { type: 'disabled' } };
const ACCURATE_MODEL = { model: 'claude-sonnet-5-5', thinking: { type: 'between_tools' } };

const AXIS_MODELS = {
  dialectics: FAST_MODEL,
  references: ACCURATE_MODEL,
  connections: FAST_MODEL,
  questions: FAST_MODEL
};

const BASE_PROMPT = `Ты — исследовательский ассистент. Пользователь читает статью и выделил фрагмент текста для глубокого анализа.`;

// One request per tab, sent in parallel, so all four tabs fill at once
const AXIS_PROMPTS = {
  dialectics: `Какие разные школы мысли, теоретические позиции или точки зрения существуют по затронутому вопросу? Опиши 2-4 позиции, укажи названия школ/направлений, если применимо.`,
  references: `Какие концепции, книги, авторы или теории помогут глубже понять этот вопрос? Дай 3-5 конкретных рекомендаций с кратким пояснением релевантности.`,
  connections: `Где похожие идеи, паттерны или принципы встречаются в других доменах? Приведи 2-4 примера аналогового переноса из других областей знания.`,
  questions: `Какие вопросы читатель может задать себе, чтобы глубже осмыслить этот материал? Сформулируй 3-5 рефлексивных вопросов, которые помогут критически проанализировать идею, связать её с личным опытом или применить на практике.`
};

function buildSystemPrompt(axis) {
  return `${BASE_PROMPT}

${AXIS_PROMPTS[axis]}

Отвечай кратко, по существу. Используй markdown для форматирования. Не пиши заголовок раздела и вступление — сразу пункты.`;
}

// Build user message with context
function buildUserMessage(title, url, selectedText) {
  return `Контекст страницы:
- Заголовок: ${title}
- URL: ${url}

Выделенный фрагмент:
${selectedText}`;
}

// Stream Anthropic API response via SSE
async function streamAnthropicAPI(apiKey, modelConfig, systemPrompt, userMessage, signal, onChunk, onDone, onError) {
  let response;
  try {
    response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      signal,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: modelConfig.model,
        max_tokens: 700,
        stream: true,
        thinking: modelConfig.thinking,
        output_config: { effort: 'low' },
        system: [
          {
            type: 'text',
            text: systemPrompt
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

    // Popup closed or page left — stop paying for tokens nobody will read
    const controller = new AbortController();
    port.onDisconnect.addListener(() => controller.abort());

    const axes = Object.keys(AXIS_PROMPTS);
    let pending = axes.length;
    const finishAxis = () => {
      pending -= 1;
      if (pending === 0) {
        safePost({ type: 'all-done' });
        try { port.disconnect(); } catch {}
      }
    };

    await Promise.all(axes.map((axis) => streamAnthropicAPI(
      apiKey,
      AXIS_MODELS[axis],
      buildSystemPrompt(axis),
      userMessage,
      controller.signal,
      (text) => safePost({ type: 'chunk', axis, text }),
      () => {
        safePost({ type: 'done', axis });
        finishAxis();
      },
      (error) => {
        if (controller.signal.aborted) return;
        safePost({ type: 'error', axis, error });
        finishAxis();
      }
    )));
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
