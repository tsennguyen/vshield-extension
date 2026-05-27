// VShield Chrome Extension — Popup Logic (no inline scripts, MV3 compliant)

document.addEventListener('DOMContentLoaded', async () => {
  const statusEl = document.getElementById('page-status');
  const statusIcon = document.getElementById('status-icon');
  const statusLabel = document.getElementById('status-label');
  const statusUrl = document.getElementById('status-url');
  const checkInput = document.getElementById('check-input');
  const checkBtn = document.getElementById('check-btn');
  const resultEl = document.getElementById('check-result');

  let currentType = 'phone';

  // ── Current page check ──────────────────────────────────────
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.url && (tab.url.startsWith('http://') || tab.url.startsWith('https://'))) {
    statusUrl.textContent = new URL(tab.url).hostname;

    chrome.runtime.sendMessage({ action: 'checkUrl', url: tab.url }, (result) => {
      if (!result) {
        statusEl.className = 'page-status page-status--unknown';
        statusIcon.textContent = '❓';
        statusLabel.textContent = 'Không thể kiểm tra';
        return;
      }

      if (result.safe) {
        statusEl.className = 'page-status page-status--safe';
        statusIcon.textContent = '✅';
        statusLabel.textContent = 'Trang web an toàn';
      } else if (result.score >= 40) {
        statusEl.className = 'page-status page-status--warning';
        statusIcon.textContent = '⚠️';
        statusLabel.textContent = `Đáng ngờ · Score: ${result.score}`;
      } else {
        statusEl.className = 'page-status page-status--danger';
        statusIcon.textContent = '🚨';
        statusLabel.textContent = `NGUY HIỂM · ${result.reports} báo cáo`;
      }
    });
  } else {
    statusEl.className = 'page-status page-status--unknown';
    statusIcon.textContent = '🔒';
    statusLabel.textContent = 'Trang nội bộ';
    statusUrl.textContent = tab?.url?.slice(0, 30) || '';
  }

  // ── Tab switching ──────────────────────────────────────────
  const placeholders = {
    phone: 'Nhập số điện thoại...',
    bank: 'Nhập số tài khoản...',
    url: 'Nhập URL...',
  };

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelector('.tab-btn--active')?.classList.remove('tab-btn--active');
      btn.classList.add('tab-btn--active');
      currentType = btn.dataset.type;
      checkInput.placeholder = placeholders[currentType] || '';
      checkInput.value = '';
      resultEl.hidden = true;
      checkBtn.disabled = true;
      checkInput.focus();
    });
  });

  // ── Input validation ───────────────────────────────────────
  checkInput.addEventListener('input', () => {
    checkBtn.disabled = !checkInput.value.trim();
  });

  // ── Check action ──────────────────────────────────────────
  const doCheck = () => {
    const value = checkInput.value.trim();
    if (!value) return;

    checkBtn.disabled = true;
    checkBtn.textContent = '...';
    resultEl.hidden = true;

    let message;
    if (currentType === 'phone') {
      const normalized = value.startsWith('+') ? value : `+84${value.replace(/^0/, '')}`;
      message = { action: 'checkPhone', phone: normalized };
    } else if (currentType === 'bank') {
      message = { action: 'checkBank', account: value };
    } else {
      message = { action: 'checkUrl', url: value };
    }

    chrome.runtime.sendMessage(message, (result) => {
      checkBtn.textContent = 'Kiểm tra';
      checkBtn.disabled = false;
      resultEl.hidden = false;

      if (!result) {
        resultEl.className = 'check-result check-result--error';
        resultEl.innerHTML = '<div class="result-title">❌ Lỗi kết nối</div><div class="result-detail">Không thể kết nối máy chủ VShield</div>';
        return;
      }

      if (result.safe) {
        resultEl.className = 'check-result check-result--safe';
        resultEl.innerHTML = `<div class="result-title">✅ An toàn</div><div class="result-detail">Trust Score: ${result.score}/100 · Không có báo cáo lừa đảo</div>`;
      } else if (result.score >= 40) {
        resultEl.className = 'check-result check-result--warning';
        resultEl.innerHTML = `<div class="result-title">⚠️ Đáng ngờ</div><div class="result-detail">Trust Score: ${result.score}/100 · ${result.reports} báo cáo</div>`;
      } else {
        resultEl.className = 'check-result check-result--danger';
        resultEl.innerHTML = `<div class="result-title">🚨 Nguy hiểm!</div><div class="result-detail">Trust Score: ${result.score}/100 · ${result.reports} báo cáo lừa đảo</div>`;
      }
    });
  };

  checkBtn.addEventListener('click', doCheck);
  checkInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doCheck();
  });
});
