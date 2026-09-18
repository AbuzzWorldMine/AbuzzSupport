let password = localStorage.getItem('dashboard_password') || '';

const loginScreen = document.getElementById('login-screen');
const dashScreen = document.getElementById('dashboard-screen');

async function apiFetch(url, options = {}) {
  options.headers = {
    ...(options.headers || {}),
    'Content-Type': 'application/json',
    'x-dashboard-password': password,
  };
  const res = await fetch(url, options);
  if (res.status === 401) throw new Error('unauthorized');
  return res.json();
}

async function tryLogin() {
  try {
    await apiFetch('/api/config');
    loginScreen.classList.add('hidden');
    dashScreen.classList.remove('hidden');
    await loadGuildData();
    await loadConfig();
  } catch (err) {
    loginScreen.classList.remove('hidden');
    dashScreen.classList.add('hidden');
  }
}

document.getElementById('login-btn').addEventListener('click', async () => {
  password = document.getElementById('password-input').value;
  try {
    await apiFetch('/api/config');
    localStorage.setItem('dashboard_password', password);
    tryLogin();
  } catch (err) {
    document.getElementById('login-error').textContent = 'Неверный пароль';
  }
});

async function loadGuildData() {
  const data = await apiFetch('/api/guild-data');
  fillSelect('panelChannelId', data.textChannels);
  fillSelect('ticketCategoryId', data.categories);
  fillSelect('supportRoleIds', data.roles, false);
  fillSelect('closeRoleIds', data.roles, false);
}

function fillSelect(id, items, includeEmptyOption = true) {
  const select = document.getElementById(id);
  select.innerHTML = includeEmptyOption ? '<option value="">— не выбрано —</option>' : '';
  for (const item of items || []) {
    const opt = document.createElement('option');
    opt.value = item.id;
    opt.textContent = item.name;
    select.appendChild(opt);
  }
}

function getSelectedValues(id) {
  return Array.from(document.getElementById(id).selectedOptions).map((o) => o.value);
}

function setSelectedValues(id, values) {
  const ids = new Set(values || []);
  for (const opt of document.getElementById(id).options) {
    opt.selected = ids.has(opt.value);
  }
}

async function loadConfig() {
  const config = await apiFetch('/api/config');
  document.getElementById('panelChannelId').value = config.panelChannelId || '';
  document.getElementById('ticketCategoryId').value = config.ticketCategoryId || '';
  setSelectedValues('supportRoleIds', config.supportRoleIds || []);
  setSelectedValues('closeRoleIds', config.closeRoleIds || []);
  document.getElementById('embedTitle').value = config.embed?.title || '';
  document.getElementById('embedDescription').value = config.embed?.description || '';
  document.getElementById('embedColor').value = config.embed?.color || '#5865F2';
  document.getElementById('embedFooter').value = config.embed?.footer || '';
  document.getElementById('buttonLabel').value = config.button?.label || '';
  document.getElementById('buttonStyle').value = config.button?.style || 'Primary';
  document.getElementById('buttonEmoji').value = config.button?.emoji || '';
  document.getElementById('ticketNameFormat').value = config.ticketNameFormat || 'ticket-{number}';
  document.getElementById('welcomeMessage').value = config.welcomeMessage || '';
}

document.getElementById('save-btn').addEventListener('click', async () => {
  const status = document.getElementById('save-status');
  status.textContent = 'Сохранение...';

  const payload = {
    panelChannelId: document.getElementById('panelChannelId').value,
    ticketCategoryId: document.getElementById('ticketCategoryId').value,
    supportRoleIds: getSelectedValues('supportRoleIds'),
    closeRoleIds: getSelectedValues('closeRoleIds'),
    embed: {
      title: document.getElementById('embedTitle').value,
      description: document.getElementById('embedDescription').value,
      color: document.getElementById('embedColor').value,
      footer: document.getElementById('embedFooter').value,
    },
    button: {
      label: document.getElementById('buttonLabel').value,
      style: document.getElementById('buttonStyle').value,
      emoji: document.getElementById('buttonEmoji').value,
    },
    ticketNameFormat: document.getElementById('ticketNameFormat').value,
    welcomeMessage: document.getElementById('welcomeMessage').value,
  };

  try {
    const result = await apiFetch('/api/config', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    status.textContent = result.panel?.ok
      ? 'Сохранено! Панель обновлена в Discord.'
      : `Сохранено, но панель не обновлена: ${result.panel?.error || ''}`;
  } catch (err) {
    status.textContent = 'Ошибка сохранения';
  }
});

tryLogin();
