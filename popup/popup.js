// VShield Chrome Extension v2.0 — Popup Logic

document.addEventListener('DOMContentLoaded', async () => {
  const statusEl = document.getElementById('page-status');
  const statusIcon = document.getElementById('status-icon');
  const statusLabel = document.getElementById('status-label');
  const statusUrl = document.getElementById('status-url');
  const statusDetail = document.getElementById('status-detail');
  const checkInput = document.getElementById('check-input');
  const checkBtn = document.getElementById('check-btn');
  const resultEl = document.getElementById('check-result');
  const scanCountEl = document.getElementById('scan-count');
  const autoScanToggle = document.getElementById('toggle-autoscan');
  const warningToggle = document.getElementById('toggle-warning');
  const reportBtn = document.getElementById('report-current');

  let currentType = 'phone';

  // ── Load settings & stats ───────────────────────────────────
  chrome.runtime.sendMessage({ action: 'getStats' }, (stats) => {
    if (!stats) return;
    if (scanCountEl) scanCountEl.textContent = (stats.scan_count || 0).toLocaleString();
    if (autoScanToggle) autoScanToggle.checked = stats.auto_scan !== false;
    if (warningToggle) warningToggle.checked = stats.show_warning !== false;
  });

  // ── Settings toggles ───────────────────────────────────────
  autoScanToggle?.addEventListener('change', () => {
    chrome.runtime.sendMessage({ action: 'toggleSetting', key: 'auto_scan' });
  });
  warningToggle?.addEventListener('change', () => {
    chrome.runtime.sendMessage({ action: 'toggleSetting', key: 'show_warning' });
  });

  // ── Current page check ──────────────────────────────────────
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.url && (tab.url.startsWith('http://') || tab.url.startsWith('https://'))) {
    const hostname = new URL(tab.url).hostname;
    statusUrl.textContent = hostname;

    // Show loading animation
    statusEl.className = 'page-status page-status--loading';
    statusIcon.innerHTML = '<div class="scan-spinner"></div>';
    statusLabel.textContent = 'Đang quét...';

    chrome.runtime.sendMessage({ action: 'checkUrl', url: tab.url }, (result) => {
      if (!result) {
        statusEl.className = 'page-status page-status--unknown';
        statusIcon.textContent = '❓';
        statusLabel.textContent = 'Không thể kiểm tra';
        if (statusDetail) statusDetail.textContent = 'Lỗi kết nối tới VShield API';
        return;
      }

      if (result.safe) {
        statusEl.className = 'page-status page-status--safe';
        statusIcon.textContent = '✅';
        statusLabel.textContent = 'Trang web an toàn';
        if (statusDetail) statusDetail.textContent = 'Không có trong danh sách đen VShield';
        if (reportBtn) reportBtn.hidden = true;
      } else if (result.score >= 80) {
        statusEl.className = 'page-status page-status--danger';
        statusIcon.textContent = '🚨';
        statusLabel.textContent = 'NGUY HIỂM!';
        if (statusDetail) statusDetail.textContent = `${result.reports} báo cáo · Điểm: ${result.score}/100`;
        if (reportBtn) reportBtn.hidden = false;
      } else {
        statusEl.className = 'page-status page-status--warning';
        statusIcon.textContent = '⚠️';
        statusLabel.textContent = 'Đáng ngờ';
        if (statusDetail) statusDetail.textContent = `${result.reports} báo cáo · Điểm: ${result.score}/100`;
        if (reportBtn) reportBtn.hidden = false;
      }
    });
  } else {
    statusEl.className = 'page-status page-status--unknown';
    statusIcon.textContent = '🔒';
    statusLabel.textContent = 'Trang nội bộ';
    statusUrl.textContent = tab?.url?.slice(0, 30) || '';
    if (reportBtn) reportBtn.hidden = true;
  }

  // ── Report current page ──────────────────────────────────────
  reportBtn?.addEventListener('click', () => {
    const url = encodeURIComponent(tab?.url || '');
    chrome.tabs.create({
      url: `https://vshield-web.vercel.app/dashboard/reports/create?url=${url}`,
    });
  });

  // ── Tab switching ──────────────────────────────────────────
  const placeholders = {
    phone: 'Nhập SĐT (0899... hoặc +84899...)',
    bank: 'Nhập số tài khoản ngân hàng...',
    url: 'Nhập URL cần kiểm tra...',
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
    checkBtn.innerHTML = '<span class="btn-spinner"></span>';
    resultEl.hidden = true;

    let message;
    if (currentType === 'phone') {
      // Normalize: +84/84 → 0, strip non-digits
      const normalized = value.replace(/[\s\-\.]/g, '').replace(/^(\+?84)/, '0').replace(/\D/g, '');
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
        resultEl.innerHTML = '<div class="result-icon">❌</div><div><div class="result-title">Lỗi kết nối</div><div class="result-detail">Không thể kết nối máy chủ VShield</div></div>';
        return;
      }

      if (result.safe) {
        resultEl.className = 'check-result check-result--safe';
        resultEl.innerHTML = `<div class="result-icon">✅</div><div><div class="result-title">An toàn</div><div class="result-detail">Không có trong danh sách đen VShield</div></div>`;
      } else if (result.score >= 80) {
        resultEl.className = 'check-result check-result--danger';
        resultEl.innerHTML = `<div class="result-icon">🚨</div><div><div class="result-title">NGUY HIỂM!</div><div class="result-detail">${result.reports} báo cáo · Điểm nguy hiểm: ${result.score}/100</div></div>`;
      } else {
        resultEl.className = 'check-result check-result--warning';
        resultEl.innerHTML = `<div class="result-icon">⚠️</div><div><div class="result-title">Đáng ngờ</div><div class="result-detail">${result.reports} báo cáo · Điểm: ${result.score}/100</div></div>`;
      }
    });
  };

  checkBtn.addEventListener('click', doCheck);
  checkInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doCheck();
  });
});
