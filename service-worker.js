// VShield Chrome Extension v2.0 — Service Worker (Manifest V3)
// Ephemeral — all state persisted in chrome.storage

const API_BASE = 'https://vshield-api.onrender.com/api/v1';

// ── SHA-256 via Web Crypto ──────────────────────────────────────
async function sha256(text) {
  const msgBuffer = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// ── Normalize phone: +84/84 → 0, strip non-digits ─────────────
function normalizePhone(raw) {
  return raw.replace(/[\s\-\.]/g, '').replace(/^(\+?84)/, '0').replace(/\D/g, '');
}

// ── URL safety check ──────────────────────────────────────────
async function checkUrl(url) {
  try {
    const res = await fetch(`${API_BASE}/verify/url?url=${encodeURIComponent(url)}`);
    if (!res.ok) return { safe: true, score: 0, reports: 0, status: 'unknown', is_blacklisted: false };
    const data = await res.json();
    return {
      safe: !data.is_blacklisted,
      score: data.trust_score ?? 0,
      reports: data.report_count ?? 0,
      status: data.status ?? 'unknown',
      is_blacklisted: data.is_blacklisted ?? false,
      display_value: data.display_value ?? '',
    };
  } catch {
    return null; // network error
  }
}

// ── Phone check ──────────────────────────────────────────────
async function checkPhone(phone) {
  try {
    const normalized = normalizePhone(phone);
    if (normalized.length < 9) return null;
    const hash = await sha256(normalized);
    const res = await fetch(`${API_BASE}/verify/phone/${hash}`);
    if (!res.ok) return { safe: true, score: 0, reports: 0, is_blacklisted: false };
    const data = await res.json();
    return {
      safe: !data.is_blacklisted,
      score: data.trust_score ?? 0,
      reports: data.report_count ?? 0,
      is_blacklisted: data.is_blacklisted ?? false,
      display_value: data.display_value ?? '',
    };
  } catch {
    return null;
  }
}

// ── Bank check ──────────────────────────────────────────────
async function checkBank(account) {
  try {
    const hash = await sha256(account.trim());
    const res = await fetch(`${API_BASE}/verify/bank/${hash}`);
    if (!res.ok) return { safe: true, score: 0, reports: 0, is_blacklisted: false };
    const data = await res.json();
    return {
      safe: !data.is_blacklisted,
      score: data.trust_score ?? 0,
      reports: data.report_count ?? 0,
      is_blacklisted: data.is_blacklisted ?? false,
      display_value: data.display_value ?? '',
    };
  } catch {
    return null;
  }
}

// ── Badge update ──────────────────────────────────────────────
async function updateBadge(tabId, result) {
  if (!result) {
    await chrome.action.setBadgeText({ text: '', tabId });
    return;
  }

  if (result.safe) {
    await chrome.action.setBadgeText({ text: '✓', tabId });
    await chrome.action.setBadgeBackgroundColor({ color: '#22c55e', tabId });
  } else if (result.score >= 80) {
    await chrome.action.setBadgeText({ text: '✗', tabId });
    await chrome.action.setBadgeBackgroundColor({ color: '#ef4444', tabId });
  } else {
    await chrome.action.setBadgeText({ text: '!', tabId });
    await chrome.action.setBadgeBackgroundColor({ color: '#f59e0b', tabId });
  }
}

// ── Increment scan counter ───────────────────────────────────
async function incrementScanCount() {
  const { scan_count = 0 } = await chrome.storage.local.get('scan_count');
  await chrome.storage.local.set({ scan_count: scan_count + 1 });
}

// ── Check if auto-scan is enabled ────────────────────────────
async function isAutoScanEnabled() {
  const { auto_scan = true } = await chrome.storage.local.get('auto_scan');
  return auto_scan;
}

// ── Check if warning overlay is enabled ──────────────────────
async function isWarningEnabled() {
  const { show_warning = true } = await chrome.storage.local.get('show_warning');
  return show_warning;
}

// ── Tab navigation listener ──────────────────────────────────
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete' || !tab.url) return;
  if (!tab.url.startsWith('http://') && !tab.url.startsWith('https://')) return;

  // Check if auto-scan is enabled
  if (!(await isAutoScanEnabled())) return;

  try {
    const hostname = new URL(tab.url).hostname;
    const cacheKey = `url_check_${hostname}`;
    const cached = await chrome.storage.session.get(cacheKey);

    let result;
    if (cached[cacheKey]) {
      result = cached[cacheKey];
    } else {
      result = await checkUrl(tab.url);
      if (result) {
        await chrome.storage.session.set({ [cacheKey]: result });
        await incrementScanCount();
      }
    }

    if (result) {
      await updateBadge(tabId, result);

      // If dangerous + warning enabled → inject content script overlay
      if (!result.safe && result.score >= 50 && (await isWarningEnabled())) {
        try {
          await chrome.tabs.sendMessage(tabId, {
            action: 'showWarning',
            data: result,
            url: tab.url,
          });
        } catch {
          // Content script may not be loaded yet
        }
      }
    }
  } catch {
    // Ignore errors for non-standard URLs
  }
});

// ── Message handler (from popup) ──────────────────────────────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'checkUrl') {
    checkUrl(message.url).then(sendResponse);
    return true;
  }

  if (message.action === 'checkPhone') {
    checkPhone(message.phone).then(sendResponse);
    return true;
  }

  if (message.action === 'checkBank') {
    checkBank(message.account).then(sendResponse);
    return true;
  }

  if (message.action === 'getStats') {
    chrome.storage.local.get(['scan_count', 'auto_scan', 'show_warning'], (data) => {
      sendResponse({
        scan_count: data.scan_count ?? 0,
        auto_scan: data.auto_scan ?? true,
        show_warning: data.show_warning ?? true,
      });
    });
    return true;
  }

  if (message.action === 'toggleSetting') {
    chrome.storage.local.get(message.key, (data) => {
      const newValue = !(data[message.key] ?? true);
      chrome.storage.local.set({ [message.key]: newValue }, () => {
        sendResponse({ [message.key]: newValue });
      });
    });
    return true;
  }
});
