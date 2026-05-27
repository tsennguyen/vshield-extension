// VShield Chrome Extension — Service Worker (Manifest V3)
// Ephemeral — all state persisted in chrome.storage

const API_BASE = 'https://vshield-api.onrender.com/v1';

// ── SHA-256 via Web Crypto ──────────────────────────────────────
async function sha256(text) {
  const msgBuffer = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// ── URL safety check ──────────────────────────────────────────
async function checkUrl(url) {
  try {
    const res = await fetch(`${API_BASE}/verify/url?url=${encodeURIComponent(url)}`);
    if (res.status === 404) {
      return { safe: true, score: 100, reports: 0, status: 'not_found' };
    }
    if (!res.ok) return null;
    const data = await res.json();
    return {
      safe: data.trust_score >= 60,
      score: data.trust_score,
      reports: data.report_count || 0,
      status: data.status || 'unknown',
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
  } else if (result.score >= 40) {
    await chrome.action.setBadgeText({ text: '!', tabId });
    await chrome.action.setBadgeBackgroundColor({ color: '#f59e0b', tabId });
  } else {
    await chrome.action.setBadgeText({ text: '✗', tabId });
    await chrome.action.setBadgeBackgroundColor({ color: '#ef4444', tabId });
  }
}

// ── Tab navigation listener ──────────────────────────────────
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete' || !tab.url) return;

  // Skip chrome:// internal pages, extensions, etc.
  if (!tab.url.startsWith('http://') && !tab.url.startsWith('https://')) return;

  // Check URL against VShield blacklist
  try {
    const hostname = new URL(tab.url).hostname;
    // Cache per hostname (session storage is cleared on browser close)
    const cacheKey = `url_check_${hostname}`;
    const cached = await chrome.storage.session.get(cacheKey);

    let result;
    if (cached[cacheKey]) {
      result = cached[cacheKey];
    } else {
      result = await checkUrl(tab.url);
      if (result) {
        await chrome.storage.session.set({ [cacheKey]: result });
      }
    }

    if (result) {
      await updateBadge(tabId, result);

      // If dangerous, inject warning via content script
      if (!result.safe && result.score < 40) {
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
    (async () => {
      const result = await checkUrl(message.url);
      sendResponse(result);
    })();
    return true; // async response
  }

  if (message.action === 'checkPhone') {
    (async () => {
      try {
        const hash = await sha256(message.phone.replace(/\s/g, ''));
        const res = await fetch(`${API_BASE}/verify/phone/${hash}`);
        if (res.status === 404) {
          sendResponse({ safe: true, score: 100, reports: 0 });
          return;
        }
        if (!res.ok) { sendResponse(null); return; }
        const data = await res.json();
        sendResponse({
          safe: data.trust_score >= 60,
          score: data.trust_score,
          reports: data.report_count || 0,
        });
      } catch {
        sendResponse(null);
      }
    })();
    return true;
  }

  if (message.action === 'checkBank') {
    (async () => {
      try {
        const hash = await sha256(message.account.replace(/\s/g, ''));
        const res = await fetch(`${API_BASE}/verify/bank/${hash}`);
        if (res.status === 404) {
          sendResponse({ safe: true, score: 100, reports: 0 });
          return;
        }
        if (!res.ok) { sendResponse(null); return; }
        const data = await res.json();
        sendResponse({
          safe: data.trust_score >= 60,
          score: data.trust_score,
          reports: data.report_count || 0,
        });
      } catch {
        sendResponse(null);
      }
    })();
    return true;
  }
});
