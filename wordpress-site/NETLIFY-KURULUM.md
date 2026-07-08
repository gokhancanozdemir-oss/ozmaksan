# Netlify + Decap CMS — Kurulum

## 1) GitHub
`wordpress-site/` klasörünü (bu klasörü) yeni bir repo'ya push et. Branch: **main**.

Gerekli klasörler: `admin/`, `content/`, `assets/`, `_build/`, `netlify.toml`, CSS/JS/logo.

## 2) Netlify
1. Add site → Import from Git → GitHub
2. Build command: `node _build/build.mjs`
3. Publish directory: `.`
4. Deploy

## 3) Identity + Git Gateway
1. Site configuration → **Identity** → Enable
2. Registration preferences → **Invite only**
3. Services → **Git Gateway** → Enable
4. Invite users → kendi e-postan

## 4) Admin
`https://SITE.netlify.app/admin/`

- **Site Ayarları** → iletişim, SSS, referanslar
- **Ürünler** → ürün ekle / düzenle
- **Haberler** → haber ekle / düzenle

Publish → GitHub commit → Netlify rebuild (~1–2 dk).

## 5) Domain
Domain management → `ozmaksan.com.tr` ekle → DNS.

## Yerel test
```bash
npm run cms    # terminal 1
npm run serve  # terminal 2 → http://127.0.0.1:8790/admin/
```
