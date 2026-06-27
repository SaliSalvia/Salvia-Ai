# Puter UI — رابط کاربری هوش مصنوعی با Puter.js

یک رابط چت تحت وب برای اجرا در **Termux (اندروید)** که از مدل‌های GPT-4o، Claude Sonnet، Gemini و DeepSeek پشتیبانی می‌کند.

## اجرا در Termux

```bash
chmod +x puter-ui-installer.sh
bash puter-ui-installer.sh
```

پس از اجرا، مرورگر را باز کنید و به آدرس زیر بروید:

```
http://127.0.0.1:38080
```

## اجرا در GitHub Codespaces (برای تست)

خط اول اسکریپت را تغییر دهید:

```bash
#!/bin/bash
```

سپس:

```bash
chmod +x puter-ui-installer.sh
./puter-ui-installer.sh
```

پس از اجرا، پاپ‌آپ **Open in Browser** را در Codespaces بزنید.

## ساختار پروژه

```
puter-ui-project/
├── puter-ui-installer.sh   ← اسکریپت اصلی نصب و راه‌اندازی
└── README.md
```

پس از اجرای اسکریپت، پوشه `~/puter-ui/` ساخته می‌شود:

```
~/puter-ui/
├── index.html              ← رابط کاربری وب
├── puter-ui.log            ← لاگ‌های سرور
└── server.pid              ← شناسه فرآیند سرور
```

## پیش‌نیازها (نصب خودکار)

- `nodejs` + `npm`
- `git`
- `live-server` (از طریق npm)

## منوی مدیریت

| گزینه | عملکرد |
|-------|---------|
| 1 | اجرای سرور |
| 2 | توقف سرور |
| 3 | ری‌استارت |
| 4 | وضعیت سرور |
| 5 | مشاهده لاگ |
| 0 | خروج |

## نکات مهم

- اینترنت برای بارگذاری `puter.js` از CDN الزامی است
- نیازی به API Key نیست — Puter.js احراز هویت را مدیریت می‌کند
- پورت پیش‌فرض: **38080**
