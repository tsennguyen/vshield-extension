# VShield Chrome Extension

> Kiểm tra URL, số điện thoại, tài khoản ngân hàng ngay trên trình duyệt Chrome. Bảo vệ khỏi lừa đảo trực tuyến.

## Tính năng

- **Realtime URL Check**: Tự động kiểm tra mọi trang web khi truy cập
- **Badge Status**: ✓ (an toàn) · ! (đáng ngờ) · ✗ (nguy hiểm) hiển thị trên icon
- **Warning Banner**: Cảnh báo đỏ nổi bật trên trang nguy hiểm
- **Quick Verify**: Kiểm tra nhanh SĐT / STK / URL trong popup
- **Cache**: Kết quả được cache theo hostname, giảm API calls

## Cài đặt (Developer Mode)

1. Mở `chrome://extensions/`
2. Bật **Developer mode** (góc phải trên)
3. Click **Load unpacked**
4. Chọn thư mục `vshield-extension/`
5. Extension sẵn sàng sử dụng!

## Kiến trúc

```
vshield-extension/
├── manifest.json          # Manifest V3
├── service-worker.js      # Background — URL check, API calls
├── content.js             # Content script — warning banner
├── popup/
│   ├── popup.html         # Popup UI
│   ├── popup.css          # Dark mode styles
│   └── popup.js           # Popup logic (tabs, verify)
├── icons/                 # Extension icons (TODO: generate)
└── README.md
```

## API

Extension gọi `https://vshield-api.onrender.com/v1/verify/` endpoints:

| Type | Endpoint | Method |
|------|----------|--------|
| URL | `/verify/url?url=...` | GET |
| Phone | `/verify/phone/{hash}` | GET |
| Bank | `/verify/bank/{hash}` | GET |

## Build

Extension là plain HTML/CSS/JS — không cần build step.
Load trực tiếp từ thư mục bằng Chrome Developer Mode.

## Publish (Chrome Web Store)

TODO: Tạo Google Developer account → Upload ZIP → Review.
