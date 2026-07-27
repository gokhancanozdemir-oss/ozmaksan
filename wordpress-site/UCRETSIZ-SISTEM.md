# Ücretsiz mimari — CMS ≠ Deploy

## Sorun
Eski sistemde her “Yayınla” Netlify’da **yeni deploy** açıyordu (~15 kredi). Bu yüzden kota bitiyordu.

## Yeni sistem
| Ne | Nerede | Deploy? |
|---|---|---|
| Metin / ürün / haber | GitHub `content/` | **Hayır** |
| Fotoğraf / PDF | GitHub `assets/` | **Hayır** |
| Site kodu (CSS, şablon) | GitHub + host build | Evet (nadiren) |

Ziyaretçi tarayıcısı içeriği **GitHub raw** üzerinden okur → Publish sonrası sayfa yenileyince metin/görsel güncellenir.

---

## 1) Cloudflare Pages (önerilen ücretsiz host)

1. [dash.cloudflare.com](https://dash.cloudflare.com) → Workers & Pages → Create → Pages → Connect Git  
2. Repo: `gokhancanozdemir-oss/ozmaksan`  
3. Ayarlar:
   - **Root directory:** `wordpress-site`
   - **Build command:** `node _build/write-catalog.mjs && node _build/build-all.mjs`
   - **Build output:** `.`
   - **Build watch paths — Exclude:** `content/**`, `assets/products/**`, `assets/news/**`, `assets/catalogs/**`, `assets/uploads/**`
4. Deploy → size `*.pages.dev` adresi verir  
5. İsterseniz `ozmaksan.com.tr` DNS’ini Cloudflare’e bağlayın  

Netlify’ı kapatabilirsiniz; kredi gerekmez.

---

## 2) CMS girişi (GitHub OAuth — bir kez)

Panel artık Netlify Identity kullanmıyor; GitHub ile giriş.

```bash
cd cms-oauth
npx wrangler login
npx wrangler secret put GITHUB_CLIENT_ID
npx wrangler secret put GITHUB_CLIENT_SECRET
npx wrangler deploy
```

GitHub → Settings → Developer settings → **OAuth App**:
- Homepage: sitenizin adresi  
- Callback: `https://ozmaksan-cms-auth.<HESAP>.workers.dev/callback`

Deploy sonrası çıkan Worker URL’sini `wordpress-site/admin/config.yml` içindeki `base_url` alanına yazın, commit edin.

Panel: `https://SITENIZ/admin/` → Login with GitHub → **Publish**

---

## 3) Netlify’da kalırsanız

`netlify.toml` içindeki `ignore` sayesinde **sadece içerik** değişince build **atlanır** (kredi yanmaz).  
Kod değişince build çalışır.

Site kredi yüzünden tamamen durduysa yine Cloudflare’e geçin.

---

## Yerel CMS (geliştirme)

```bash
cd wordpress-site
npx --yes decap-server
# başka terminalde
npm run serve
# http://localhost:8790/admin/
```
