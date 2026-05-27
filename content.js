// VShield Content Script v2.0 — Warning overlay for dangerous URLs
// Injected on all pages, listens for messages from service worker

chrome.runtime.onMessage.addListener((message) => {
  if (message.action !== 'showWarning' || !message.data) return;

  // Prevent duplicate banners
  if (document.getElementById('vshield-warning-banner')) return;

  const { score, reports, url, is_blacklisted } = { ...message.data, url: message.url };

  // Only show for blacklisted entries
  if (!is_blacklisted) return;

  const isDanger = score >= 80;

  const overlay = document.createElement('div');
  overlay.id = 'vshield-warning-banner';
  overlay.setAttribute('role', 'alert');

  overlay.innerHTML = `
    <div id="vshield-overlay-bg" style="
      position: fixed; inset: 0; z-index: 2147483646;
      background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);
      animation: vshieldFadeIn 0.3s ease;
    "></div>
    <div id="vshield-warning-card" style="
      position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
      z-index: 2147483647;
      width: 420px; max-width: calc(100vw - 32px);
      background: #fff; border-radius: 20px;
      box-shadow: 0 24px 64px rgba(0,0,0,0.3);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      animation: vshieldSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      overflow: hidden;
    ">
      <!-- Header gradient -->
      <div style="
        padding: 24px 24px 16px;
        background: linear-gradient(135deg, ${isDanger ? '#dc2626' : '#f59e0b'}, ${isDanger ? '#991b1b' : '#d97706'});
        text-align: center;
      ">
        <div style="font-size: 48px; margin-bottom: 8px;">${isDanger ? '🚨' : '⚠️'}</div>
        <div style="
          color: white; font-size: 20px; font-weight: 800;
          letter-spacing: -0.02em;
        ">${isDanger ? 'TRANG WEB NGUY HIỂM!' : 'TRANG WEB ĐÁNG NGỜ'}</div>
        <div style="color: rgba(255,255,255,0.85); font-size: 13px; margin-top: 4px;">
          Được phát hiện bởi VShield
        </div>
      </div>

      <!-- Body -->
      <div style="padding: 20px 24px;">
        <div style="
          display: flex; gap: 16px; margin-bottom: 16px;
          padding: 12px 16px; border-radius: 12px;
          background: #fef2f2; border: 1px solid #fecaca;
        ">
          <div style="flex: 1;">
            <div style="font-size: 12px; color: #991b1b; font-weight: 600; margin-bottom: 4px;">
              Điểm nguy hiểm
            </div>
            <div style="font-size: 24px; font-weight: 900; color: ${isDanger ? '#dc2626' : '#d97706'};">
              ${score}<span style="font-size: 14px; color: #9ca3af;">/100</span>
            </div>
          </div>
          <div style="flex: 1;">
            <div style="font-size: 12px; color: #991b1b; font-weight: 600; margin-bottom: 4px;">
              Số báo cáo
            </div>
            <div style="font-size: 24px; font-weight: 900; color: #dc2626;">
              ${reports}
            </div>
          </div>
        </div>

        <div style="font-size: 13px; color: #6b7280; line-height: 1.6; margin-bottom: 16px;">
          Trang web <strong style="color: #1f2937;">${url || ''}</strong> đã bị cộng đồng báo cáo là lừa đảo.
          Hãy cẩn thận, <strong>không nhập thông tin cá nhân</strong> hoặc chuyển tiền.
        </div>

        <!-- Actions -->
        <div style="display: flex; gap: 8px;">
          <button id="vshield-go-back" style="
            flex: 1; padding: 12px; border: none; border-radius: 12px;
            background: linear-gradient(135deg, #dc2626, #b91c1c);
            color: white; font-weight: 700; font-size: 14px;
            cursor: pointer; font-family: inherit;
          ">
            ← Quay lại an toàn
          </button>
          <button id="vshield-dismiss" style="
            padding: 12px 16px; border: 1.5px solid #e5e7eb; border-radius: 12px;
            background: white; color: #6b7280; font-weight: 600; font-size: 13px;
            cursor: pointer; font-family: inherit;
          ">
            Tiếp tục
          </button>
        </div>

        <a href="https://vshield-web.vercel.app/dashboard/reports/create" target="_blank" rel="noopener"
          style="
            display: block; text-align: center; margin-top: 12px;
            color: #60a5fa; font-size: 12px; font-weight: 600;
            text-decoration: none;
          ">
          🛡️ Xem chi tiết trên VShield →
        </a>
      </div>
    </div>

    <style>
      @keyframes vshieldFadeIn {
        from { opacity: 0; } to { opacity: 1; }
      }
      @keyframes vshieldSlideUp {
        from { opacity: 0; transform: translate(-50%, -45%); }
        to { opacity: 1; transform: translate(-50%, -50%); }
      }
    </style>
  `;

  document.documentElement.appendChild(overlay);

  // Go back button
  document.getElementById('vshield-go-back')?.addEventListener('click', () => {
    if (history.length > 1) {
      history.back();
    } else {
      window.location.href = 'about:blank';
    }
  });

  // Dismiss button
  document.getElementById('vshield-dismiss')?.addEventListener('click', () => {
    overlay.remove();
  });

  // Click overlay background to dismiss
  document.getElementById('vshield-overlay-bg')?.addEventListener('click', () => {
    overlay.remove();
  });
});
