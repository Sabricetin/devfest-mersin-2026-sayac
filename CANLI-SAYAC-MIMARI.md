# Canlı Katılımcı Sayacı – Mimari ve Uygulama Talimatı

> Bu doküman Claude Code'a verilecek. Önce tamamını oku, sonra "Çalışma Kuralları" bölümüne uyarak uygula. Belirsiz bir noktada tahmin yürütme, dur ve sor.

---

## 1. Amaç

DevFest Mersin 2026 etkinliğinin Kommunity üzerindeki kayıtlı katılımcı sayısını, kendi sitemizde **canlı sayaç** olarak göstermek.

**Başarı tanımı:** Ziyaretçi sayfayı açtığında güncel sayıyı görür, sayfa açık kaldıkça sayı ~30 sn'de bir kendiliğinden güncellenir. Kaynak (Kommunity) çökse bile sayaç **asla boş, 0 ya da hatalı görünmez**.

## 2. Kapsam

**Kapsam içi**
- Kommunity'den sayıyı çeken küçük bir sunucu tarafı endpoint (proxy + cache).
- Sitede gösterilecek, bağımsız çalışan bir sayaç bileşeni (vanilla JS, framework'e bağımlı değil).
- Hata, gecikme ve yedek (fallback) davranışları.
- Testler ve kısa README.

**Kapsam dışı (yapma)**
- Veritabanı, kullanıcı girişi, admin paneli.
- WebSocket / SSE. Sayı saniyede değişmiyor, polling yeterli.
- Kommunity'ye yazma işlemi veya katılımcı listesini/kişisel verilerini çekmek ya da saklamak.

## 3. Bilinen Gerçekler (doğrulandı)

| Konu | Değer |
|---|---|
| Kaynak endpoint | `GET https://api.kommunity.com/api/v3/gdg-mersin/events/devfest-mersin-2026-bee55ede` |
| Kimlik doğrulama | Gerekmiyor (herkese açık, token yok) |
| Yanıt biçimi | JSON, `{ "data": { ... } }` |
| Sayaç alanı | `data.users_count` (tamsayı, şu an 530) |
| Görünürlük bayrağı | `data.show_user_count` (`true`) |
| Kapasite | `data.rsvp_limit` = `null` (sınır yok) |
| Bekleme listesi | `data.waiting_list_count` (0) |
| Etkinlik tarihi | 17 Ekim 2026, 09:00–17:00 (Europe/Istanbul) |

**Uyarı:** `/api/v3/` belgelenmemiş bir endpoint. Kommunity kendi uygulaması için kullanıyor, bize verilmiş bir sözleşme yok. Şema değişebilir. Bu yüzden tasarım "bozulursa sessizce geri düş" ilkesiyle kurulur.

## 4. Mimari

```
Ziyaretçi tarayıcısı
   │  (her 30 sn)  GET /api/katilimci
   ▼
Sunucu fonksiyonu  ──►  CDN/Edge cache (30 sn taze, 5 dk stale-if-error)
   │  cache miss olunca
   ▼
Kommunity API (timeout 5 sn)
   │
   ├─ başarılı → { count, updatedAt, source:"live" }
   └─ hata/timeout/şema bozuk → son iyi değer (varsa) → yoksa FALLBACK_COUNT
                                 { count, updatedAt, source:"stale"|"fallback" }
```

**Neden bu tasarım**
- Tarayıcı Kommunity'yi doğrudan çağırmaz: CORS riski yok, ham API adresi ve yapısı istemciye sızmaz.
- Edge cache sayesinde 10.000 ziyaretçi de olsa Kommunity'ye dakikada en fazla ~2 istek gider. Rate limit ve engellenme riski düşer.
- İstemci tek bir küçük JSON okur (`count`), Kommunity'nin devasa yanıtını (takvim linkleri, ICS, konuşmacılar) taşımaz.

## 5. Teknoloji Kararı

Sitenin altyapısı belli değil. Aşağıdaki sırayla karar ver:

1. Depoda zaten bir altyapı varsa (Next.js, Astro, Vercel/Netlify/Cloudflare yapılandırması) **onu kullan**, yeni araç ekleme.
2. Hiçbiri yoksa varsayılan: **Vercel Serverless Function** (`api/katilimci.js`, Node 20) + statik HTML/JS bileşeni.
3. Cloudflare Workers veya Netlify Functions gerekirse aynı sözleşmeyi (bölüm 6) koru, sadece kabuğu değiştir.

Bağımlılık hedefi: **sıfır çalışma zamanı bağımlılığı**. Sadece yerleşik `fetch` ve `AbortController`.

## 6. Sözleşme (API Contract)

`GET /api/katilimci`

Başarılı yanıt `200`:

```json
{
  "count": 530,
  "updatedAt": "2026-09-30T12:00:00.000Z",
  "source": "live"
}
```

- `source`: `"live"` (taze veri) | `"stale"` (Kommunity'den alınamadı, son iyi değer) | `"fallback"` (hiç veri yok, ortam değişkeninden)
- `count`: her zaman negatif olmayan tamsayı.
- Yanıt başlıkları: `Cache-Control: public, s-maxage=30, stale-while-revalidate=120, stale-if-error=300` ve `Content-Type: application/json; charset=utf-8`.

Sayı hiçbir şekilde üretilemiyorsa (fallback de tanımsızsa) `503` ve `{ "error": "unavailable" }`. İstemci bu durumda sayaç alanını **gizler**, "0" göstermez.

## 7. Backend Gereksinimleri

**Dosya:** `api/katilimci.js`

1. **Yapılandırma ortam değişkenlerinden okunur, koda gömülmez:**
   - `KOMMUNITY_COMMUNITY_SLUG` = `gdg-mersin`
   - `KOMMUNITY_EVENT_SLUG` = `devfest-mersin-2026-bee55ede`
   - `FALLBACK_COUNT` = son bilinen sayı (elle güncellenir, opsiyonel ama önerilir)
   - `ALLOWED_ORIGINS` = virgülle ayrılmış liste (sayaç farklı alan adında gösterilecekse)
2. **Timeout:** `AbortController` ile 5 sn. Süre dolarsa hata say.
3. **Doğrulama (şema savunması):** Yanıtı şu koşulla kabul et: `Number.isInteger(data.users_count) && data.users_count >= 0`. Aksi halde hata say. `data.show_user_count === false` ise sayı gizlenmiş demektir, bunu da hata say ve log'a "count_hidden" yaz.
4. **Son iyi değer:** Modül seviyesinde `lastGood = { count, updatedAt }` tut. Fonksiyon sıcak kaldığı sürece işe yarar, garanti değildir. Asıl koruma `stale-if-error` cache başlığıdır.
5. **Düşme davranışı sırası:** live → lastGood (`stale`) → `FALLBACK_COUNT` (`fallback`) → `503`.
6. **Yeniden deneme yok.** Bir istek, bir deneme. Kommunity'yi yormayalım.
7. **Giden isteğe** açıklayıcı bir `User-Agent` ekle: `sabri-devfest-counter/1.0`.
8. **Kişisel veri:** Kommunity yanıtındaki katılımcı, lider, üye isimleri/avatarları gibi hiçbir alanı loglama, saklama ya da iletme. Sadece `users_count` işlenir.
9. **Loglama:** Sadece `source` değeri, hata kodu ve süre. Yanıt gövdesi loglanmaz.
10. **CORS:** Aynı alan adında gerekmez. `ALLOWED_ORIGINS` doluysa ve `Origin` listede ise `Access-Control-Allow-Origin` döndür. `*` kullanma.
11. Sadece `GET` ve `OPTIONS` kabul et, diğerlerine `405`.

## 8. Frontend Gereksinimleri

**Dosyalar:** `public/sayac.js`, `public/sayac.css` (ya da mevcut sitenin yapısına uygun yer) ve örnek `public/ornek.html`.

**Kullanım (HTML tarafı):**

```html
<div class="devfest-sayac" data-endpoint="/api/katilimci" data-etiket="kişi kayıtlı">
  <span class="devfest-sayac__sayi" aria-live="polite">–</span>
  <span class="devfest-sayac__etiket">kişi kayıtlı</span>
</div>
<script src="/sayac.js" defer></script>
```

**Davranış:**
- Sayfa yüklenince bir kez, sonra **30 sn'de bir** çek. `setInterval` yerine önceki istek bitince zamanlayan `setTimeout` zinciri kullan (istekler üst üste binmesin).
- **Sekme görünür değilken** (`document.hidden`) çekme. Tekrar görünür olunca hemen bir kez çek.
- **Animasyon:** Sayı değişince eski değerden yeniye 600–800 ms'de sayarak geçsin (`requestAnimationFrame`, ease-out). `prefers-reduced-motion: reduce` varsa animasyonsuz, direkt değiştir.
- **Sadece artışı animasyonla göster.** Sayı düşerse (iptal) animasyonsuz direkt yeni değeri yaz. Sayacı sahte biçimde yüksek tutma, gösterilen değer her zaman sunucudan gelen değerdir.
- **Sayı biçimi:** `Intl.NumberFormat('tr-TR')` (1.234 gibi).
- **Durumlar:**
  - *Yükleniyor:* `–` göster, "0" yazma.
  - *Başarılı:* sayıyı göster.
  - *Hata ama önceden değer var:* eski değeri göster, sessiz kal.
  - *Hata ve hiç değer yok:* bileşenin tamamını gizle (`hidden`).
- **Küçük "canlı" göstergesi:** `source === "live"` iken yanıp sönen nokta. `stale`/`fallback` iken nokta yok. (CSS animasyonu, reduced-motion'a saygılı.)
- **Erişilebilirlik:** `aria-live="polite"` yalnızca sayı alanında. Her 30 sn'de ekran okuyucuyu rahatsız etmemek için **sayı değişmediyse DOM'u güncelleme**.
- Global kirlilik yok: kodu IIFE içine al, sadece `.devfest-sayac` öğelerini bul ve başlat. Aynı sayfada birden fazla sayaç olsa da tek bir `fetch` döngüsü paylaşılsın.
- CSS değişkenleriyle özelleştirilebilir (`--sayac-renk`, `--sayac-font-boyut`), karanlık/aydınlık temaya `prefers-color-scheme` ile uyum.

## 9. Dosya Yapısı (varsayılan senaryo)

```
/
├─ api/
│  └─ katilimci.js
├─ public/
│  ├─ sayac.js
│  ├─ sayac.css
│  └─ ornek.html
├─ test/
│  ├─ katilimci.test.js
│  └─ fixtures/kommunity-ornek.json
├─ .env.example
├─ vercel.json          (gerekirse)
└─ README.md
```

Mevcut bir projeye ekleniyorsa yapıyı projenin kendi kuralına uydur.

## 10. Test Gereksinimleri

Node'un yerleşik test koşucusunu (`node --test`) kullan, ek bağımlılık ekleme. `fetch` mock'lanır.

**Backend testleri (en az):**
1. Geçerli yanıt → `count:530`, `source:"live"`.
2. `users_count` string ("530") ya da negatif → geçersiz sayılır, düşme zincirine girer.
3. `users_count` eksik (şema değişti) → düşme zinciri.
4. `show_user_count:false` → düşme zinciri.
5. Timeout → düşme zinciri.
6. HTTP 500 / geçersiz JSON → düşme zinciri.
7. Hiç veri ve `FALLBACK_COUNT` yok → `503`.
8. Yanıt gövdesinde isim/avatar gibi alanların **bulunmadığı** doğrulanır.
9. `POST` → `405`.

`test/fixtures/kommunity-ornek.json` için gerçek yanıtın **yalnızca** `users_count`, `show_user_count`, `rsvp_limit`, `waiting_list_count` alanlarını içeren kırpılmış bir kopyasını kullan, kişi verisi koyma.

**Frontend:** Sayı biçimlendirme ve durum geçişlerini test edilebilir saf fonksiyonlara ayır ve onları test et. Tarayıcı testi zorunlu değil.

## 11. Kabul Kriterleri

- [ ] `/api/katilimci` gerçek Kommunity verisiyle `count: 530` (veya güncel değer) döndürüyor.
- [ ] Ard arda 50 istek atıldığında Kommunity'ye en fazla 1–2 istek gidiyor (cache çalışıyor).
- [ ] Kommunity URL'si yanlış yapılandırılınca yanıt `stale`/`fallback` oluyor, sayfa bozulmuyor.
- [ ] Ağ kapalıyken sayaç boş ya da "0" göstermiyor.
- [ ] Sekme arka plandayken ağ isteği atılmıyor.
- [ ] `prefers-reduced-motion` açıkken animasyon yok.
- [ ] Tüm testler geçiyor, `.env.example` var, sırlar repoda yok.
- [ ] Yanıtta ve loglarda hiçbir kişisel veri yok.

## 12. Riskler ve Önlemler

| Risk | Olasılık | Önlem |
|---|---|---|
| Kommunity endpoint şemasını değiştirir | Düşük–orta | Şema doğrulama, `stale`/`fallback` zinciri, `FALLBACK_COUNT` |
| Kommunity IP'yi/isteği sınırlar | Düşük | Edge cache, tek deneme, açıklayıcı User-Agent |
| Organizatör "kişi sayısını göster"i kapatır | Düşük | `show_user_count` kontrolü, fallback |
| Cold start yüzünden ilk istek yavaş | Orta | 5 sn timeout, istemci sessizce eski değeri tutar |
| Sayı ile "1000+" iddiası tutarsız görünür | Yüksek (içerik) | Sayaç sadece gerçek veriyi gösterir, hedefi sen belirlemeden koyma |
| Resmî olmayan API kullanımı | Var | Kommunity ekibinden yazılı izin/resmî API iste, README'ye not düş |

## 13. Çalışma Kuralları (Claude Code için)

1. **Önce keşfet:** Depoyu oku, mevcut altyapıyı ve `CLAUDE.md` varsa kurallarını tespit et. Bölüm 5'teki karar sırasını uygula ve seçimini tek paragrafla açıkla.
2. **Sonra plan:** Kod yazmadan önce yapılacak dosya listesini ve ilerleme sırasını kısaca yaz, onay bekle.
3. **Test önce:** Önce backend testlerini yaz (kırmızı), sonra uygulamayı yaz (yeşil).
4. **Küçük adımlar, küçük commit'ler:** Backend → testler → frontend → örnek sayfa → README.
5. **Basit tut:** Bağımlılık ekleme, gereksiz soyutlama yapma, framework'e sürükleme.
6. **Sır yok:** Gerçek anahtar/token yok zaten, yine de tüm yapılandırma `.env.example` üzerinden.
7. **Doğrulama:** Bitirmeden gerçek endpoint'e bir kez istek atıp çıktıyı göster. Sadece `count` ve `source` göster, yanıtın kalanını yazdırma.
8. **Belirsizlik:** Kapsam dışı bir şeye ihtiyaç duyarsan ya da bu dokümanla çelişen bir durum bulursan dur ve sor.

## 14. README'de Bulunması Gerekenler

- Sayaç nasıl siteye eklenir (3 satırlık kullanım).
- Ortam değişkenleri tablosu.
- Etkinlik değişirse hangi iki değişkenin güncelleneceği.
- `FALLBACK_COUNT`'un elle nasıl güncelleneceği.
- Bilinen risk: Kommunity endpoint'i belgelenmemiştir.
- Etkinlik günü kontrol listesi (endpoint yanıt veriyor mu, cache başlıkları doğru mu, fallback güncel mi).
