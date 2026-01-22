document.addEventListener('DOMContentLoaded', async () => {
  const apiKeyInput = document.getElementById('api-key');
  const toggleBtn = document.getElementById('toggle-visibility');
  const saveBtn = document.getElementById('save-key');
  const statusEl = document.getElementById('status');
  const activationStatus = document.getElementById('activation-status');
  const statusDot = activationStatus.querySelector('.status-dot');
  const statusText = activationStatus.querySelector('.status-text');

  // Load saved API key
  const { apiKey } = await chrome.storage.local.get('apiKey');
  if (apiKey) {
    apiKeyInput.value = apiKey;
    showStatus('Ключ сохранён', 'success');
  }

  // Toggle password visibility
  toggleBtn.addEventListener('click', () => {
    const isPassword = apiKeyInput.type === 'password';
    apiKeyInput.type = isPassword ? 'text' : 'password';
    toggleBtn.querySelector('.icon-eye').classList.toggle('hidden', !isPassword);
    toggleBtn.querySelector('.icon-eye-off').classList.toggle('hidden', isPassword);
  });

  // Save API key
  saveBtn.addEventListener('click', async () => {
    const key = apiKeyInput.value.trim();

    if (!key) {
      showStatus('Введите API-ключ', 'error');
      return;
    }

    if (!key.startsWith('sk-ant-')) {
      showStatus('Ключ должен начинаться с sk-ant-', 'error');
      return;
    }

    try {
      await chrome.storage.local.set({ apiKey: key });
      showStatus('Ключ успешно сохранён!', 'success');
    } catch (error) {
      showStatus('Ошибка сохранения', 'error');
      console.error('Error saving API key:', error);
    }
  });

  // Check extension status
  updateActivationStatus();

  function showStatus(message, type) {
    statusEl.textContent = message;
    statusEl.className = `status ${type}`;

    if (type === 'success') {
      setTimeout(() => {
        statusEl.textContent = '';
        statusEl.className = 'status';
      }, 3000);
    }
  }

  async function updateActivationStatus() {
    const { apiKey } = await chrome.storage.local.get('apiKey');

    if (apiKey) {
      statusDot.classList.remove('inactive');
      statusText.textContent = 'Готов к работе';
    } else {
      statusDot.classList.add('inactive');
      statusText.textContent = 'Введите API-ключ';
    }
  }
});
