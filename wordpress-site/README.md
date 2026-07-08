# ÖZMAKSAN Web — Netlify + Decap CMS

Kurumsal site. İçerik `content/` altındaki JSON dosyalarından üretilir; düzenleme paneli `/admin`.

WordPress **kullanılmaz**.

---

## Hızlı başlangıç (yerel)

```bash
cd wordpress-site
npm run build
npm run serve
# http://127.0.0.1:8790/index.html
# http://127.0.0.1:8790/admin/  (local_backend için: npm run cms)
```

Yerel CMS düzenleme:

```bash
# terminal 1
npm run cms
# terminal 2
npm run serve
# admin → Login with Netlify Identity gerekmez; local proxy çalışır
```

---

## Yayınlama (Netlify)

1. Bu klasörü GitHub reposuna push et (`main` branch)
2. [netlify.com](https://netlify.com) → Import from Git → repo seç
3. Build: `node _build/build.mjs` · Publish: `.` (netlify.toml otomatik)
4. **Identity → Enable** → Registration: **Invite only**
5. **Identity → Services → Git Gateway → Enable**
6. **Invite users** → e-posta ile kendine davet gönder
7. `https://SITEN.netlify.app/admin/` → giriş yap → içerik düzenle → **Publish**

Detaylı adımlar: [`NETLIFY-KURULUM.md`](NETLIFY-KURULUM.md)

---

## İçerik yapısı

| Yol | Ne | Decap |
|-----|-----|--------|
| `content/site.json` | Firma, SSS, referanslar, sertifikalar | Site Ayarları |
| `content/products/*.json` | Ürünler | Ürünler |
| `content/news/*.json` | Haberler | Haberler |
| `assets/products/` | Ürün görselleri | Media |
| `assets/catalogs/` | PDF kataloglar | Media |
| `assets/news/` | Haber görselleri | Media |

Build komutu `content/` okuyup `*.html` üretir.

---

## Komutlar

| Komut | Açıklama |
|--------|---------|
| `npm run build` | HTML üret |
| `npm run serve` | Yerel önizleme |
| `npm run cms` | Decap local backend |
| `npm run fetch:news` | ozmaksan.com.tr haberlerini yeniden çek |
| `npm run fetch:products` | eski siteden ürün tamamla |

---

## Notlar

- `admin/config.yml` → panel alanları
- `_build/build.mjs` → şablonlar
- `_build/content-loader.mjs` → Decap JSON → site verisi
- Eski WordPress zip/xml dosyaları `.gitignore` altında; Netlify’a gitmez
