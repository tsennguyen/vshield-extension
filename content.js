// VShield Content Script — Warning overlay for dangerous URLs
// Injected on all pages, listens for messages from service worker

chrome.runtime.onMessage.addListener((message) => {
  if (message.action !== 'showWarning' || !message.data) return;

  // Prevent duplicate banners
  if (document.getElementById('vshield-warning-banner')) return;

  const { score, reports, url } = { ...message.data, url: message.url };

  const banner = document.createElement('div');
  banner.id = 'vshield-warning-banner';
  banner.setAttribute('role', 'alert');

  banner.innerHTML = `
    <div style="
      position: fixed; top: 0; left: 0; right: 0; z-index: 2147483647;
      background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
      color: white; padding: 14px 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px; display: flex; align-items: center; gap: 12px;
      box-shadow: 0 4px 20px rgba(220,38,38,0.4);
      animation: vshieldSlideDown 0.3s ease-out;
    ">
      <span style="font-size: 24px; flex-shrink: 0;">🚨</span>
      <div style="flex: 1; min-width: 0;">
        <strong style="font-size: 15px;">VShield Cảnh Báo: Trang web nguy hiểm!</strong>
        <div style="font-size: 12px; opacity: 0.9; margin-top: 2px;">
          Trust Score: ${score}/100 · ${reports} báo cáo lừa đảo · ${url || ''}
        </div>
      </div>
      <a href="https://vshield-web.vercel.app/dashboard/reports/create" target="_blank" rel="noopener"
        style="
          background: white; color: #dc2626; padding: 6px 14px; border-radius: 6px;
          text-decoration: none; font-weight: 700; font-size: 12px; white-space: nowrap;
          flex-shrink: 0;
        ">
        Báo cáo
      </a>
      <button id="vshield-dismiss" style="
        background: none; border: none; color: white; cursor: pointer;
        font-size: 20px; padding: 4px 8px; flex-shrink: 0; opacity: 0.8;
      ">✕</button>
    </div>
    <style>
      @keyframes vshieldSlideDown {
        from { transform: translateY(-100%); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
    </style>
  `;

  document.documentElement.appendChild(banner);

  // Push page content down
  document.body.style.marginTop = '56px';

  document.getElementById('vshield-dismiss')?.addEventListener('click', () => {
    banner.remove();
    document.body.style.marginTop = '';
  });
});
