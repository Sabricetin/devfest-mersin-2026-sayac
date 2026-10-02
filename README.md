# DevFest Mersin — Canlı Katılımcı Sayacı

Kommunity'deki kayıtlı katılımcı sayısını sitede canlı gösterir. Backend yok, bağımlılık yok, build adımı yok. `index.html` hazır bir demo sayfasıdır; sayaç bileşeni ise bağımsızdır, herhangi bir sayfaya taşınabilir.

## Kullanım

Sayacı başka bir sayfaya eklemek için üç parça yeterli:

```html
<link rel="stylesheet" href="sayac.css">
<link rel="stylesheet" href="maskot.css">

<div class="devfest-sayac" data-yedek="530" data-hedef="1000">
  <span class="devfest-sayac__sayi" aria-live="polite">–</span>
  <span class="devfest-sayac__etiket">kişi kayıtlı</span>
</div>
<div class="devfest-maskot" data-foto="maskot.png"></div>

<script src="sayac.js" defer></script>
<script src="maskot.js" defer></script>
```

Aynı sayfada birden fazla sayaç olabilir; hepsi tek bir istek döngüsünü paylaşır. Birden fazla maskot koyabilirsin; hepsi tek olay üzerinden tetiklenir. Maskot istemiyorsan `maskot.*` satırlarını sil — sayaç tek başına çalışır.

## Ayarlar (`data-*` öznitelikleri)

| Öznitelik | Varsayılan | Açıklama |
|---|---|---|
| `data-topluluk` | `gdg-mersin` | Kommunity topluluk slug'ı |
| `data-etkinlik` | `devfest-mersin-2026-bee55ede` | Kommunity etkinlik slug'ı |
| `data-yedek` | — | Veri hiç alınamazsa gösterilecek son bilinen sayı |
| `data-hedef` | — | Katılımcı hedefi. Verilirse sayının etrafında ilerleme halkası çizilir. Boş bırakılırsa halka çıkmaz. |
| `data-etiket` | — | Sayının yanındaki metni değiştirir |
| `data-endpoint` | — | Doluysa Kommunity yerine bu URL çağrılır, yanıt `{ "count": 530 }` beklenir |

Stil için CSS değişkenleri: `--sayac-renk`, `--sayac-etiket-renk`, `--sayac-hedef-renk`, `--sayac-nokta-renk`, `--sayac-font-boyut`, `--sayac-daire` (halkanın çapı), `--sayac-halka-bas` / `--sayac-halka-son` (halka gradyanı), `--sayac-halka-iz`.

## Hedef halkası

`data-hedef="1000"` verildiğinde sayının etrafında dairesel bir ilerleme halkası çizilir ve altında `hedef 1.000` yazar. Halka saat 12 yönünden başlar, GDG mavisinden yeşile doğru dolar.

- Halka, sayı animasyonuyla **aynı anda** ilerler; sayı sayarken halka da dolar.
- Sayı hedefe ulaşırsa halka tamamen yeşile döner ve etiket `hedef aşıldı` olur. Halka %100'ü geçmez.
- Hedefi değiştirmek için tek yer: `index.html` içindeki `data-hedef`.

## Maskot

Sayının iki yanında duran karakterler. Sayı her arttığında **alkışlarlar** ve kafalarının üstünden yeşil `+1` balonları yükselir. Sakin dururken hafifçe nefes alırlar.

`index.html` içinde **iki maskot** var: solda `Maskot/maskot-2.png`, sağda `Maskot/maskot.png`. İstediğin kadar ekleyebilirsin — her `.devfest-maskot` öğesi kendi fotoğrafını ve çerçeve ayarını taşır, hepsi aynı sayaç olayını dinler. Aynı anda tıpatıp aynı hareketi yapmasınlar diye her maskot bir öncekinden 140 ms sonra alkışlar.

Her balon **tek bir kaydı** temsil eder, üzerinde hep `+1` yazar. Kaç kişi eklendiyse o kadar balon çıkar (aynı anda 3 kişi kaydolduysa 3 balon), bir seride en çok 7 tane. Balonlar hafif yatay dağılımla çıkar, üst üste binmesinler diye.

**Fotoğrafı değiştirmek:** Görseli klasöre koy ve ilgili maskotun `data-foto` değerini o dosya adı yap — kafa olarak yuvarlak kırpılıp yerleşir.

- Arka planı silinmiş (şeffaf) PNG en iyi sonucu verir; şeffaf kısımlar beyaz zemine oturur.
- Kare olmayan görsellerde kırpma kaçınılmazdır. Hangi bölgenin kalacağını `data-odak` ve `data-zoom` belirler (aşağıda).
- 400–600 piksel fazlasıyla yeterli, daha büyüğü boşuna indirilir.
- Fotoğraf yoksa ya da yüklenemezse karakter **çizim bir yüzle** görünür, sayfa bozulmaz. (Dosya yokken konsolda bir 404 görürsün, zararsızdır.)
- Başka birinin fotoğrafını koyacaksan iznini almış ol.

| Öznitelik | Varsayılan | Açıklama |
|---|---|---|
| `data-foto` | `maskot.png` | Kafadaki görselin yolu. Boş bırakılırsa hep çizim yüz kullanılır. |
| `data-odak` | `50% 40%` | Kırpmada hangi noktanın ortada kalacağı — CSS `object-position` gibi. `0% 0%` sol üst, `100% 100%` sağ alt. |
| `data-zoom` | `1` | Yakınlaştırma. Yüz dairede küçük kalıyorsa `1.2`–`1.5` dene. 1'in altı yok sayılır. |

**Yeni fotoğrafı çerçevelemek:** Önce `data-odak` ve `data-zoom` olmadan bak. Yüz küçük kalıyorsa `data-zoom` değerini artır; yana/yukarı kaçıyorsa `data-odak` yüzdelerini oynat. Tarayıcı konsolunda anında denemek için:

```js
var m = document.querySelector('.devfest-maskot');
m.dataset.zoom = '1.4'; m.dataset.odak = '50% 10%'; location.reload();
```

Şu an `index.html` içindeki değerler mevcut fotoğraflara göre ayarlıdır:

| Konum | Fotoğraf | Çerçeve |
|---|---|---|
| Sol | `maskot-2.png` | `data-odak="36% 0%" data-zoom="1.2"` |
| Sağ | `maskot.png` | `data-odak="52% 0%" data-zoom="1.27"` |

**Fotoğrafı değiştirirsen o maskotun bu iki değerini yeniden ayarlaman gerekir.**

Stil değişkenleri: `--maskot-genislik`, `--maskot-renk`, `--maskot-eldiven`, `--maskot-ayakkabi`, `--maskot-halka`.

**Ne zaman alkışlar:** sayfa açılışında (sayaç sıfırdan sayarken) her zaman; sonrasında yalnızca taze veride (`live`) gerçek bir artış olduğunda. Sayı düştüğünde ve eski veri (`stale`/`fallback`) gösterilirken sessiz kalır.

**Nasıl bağlı:** Sayaç ile maskot birbirini tanımaz. Sayaç, sayı değiştiğinde `document` üzerinde `devfest:sayac` olayını yayar; maskot bunu dinler. Elle test etmek için tarayıcı konsoluna:

```js
document.dispatchEvent(new CustomEvent('devfest:sayac', {
  detail: { count: 533, onceki: 530, artis: 3, kaynak: 'live', acilis: false, hedef: 1000 }
}));
```

Olay alanları: `count` (yeni sayı), `onceki`, `artis` (fark; açılışta sayının kendisi), `kaynak` (`live`/`stale`/`fallback`), `acilis` (sayfa açılışındaki ilk değer mi), `hedef`.

## 1000'e son 23 kişi

Sayacın altında 23 maskotluk bir sıra durur. Kutular **en baştan** gri silüet olarak görünür — kim olduğu belli olmayan 23 kişi, dolmayı bekler. Sayı **978'e** gelince ilki dolar; sonra her yeni kayıtta sıradaki kutu bir fotoğrafla dolar, yerine oturur ve tek başına alkışlar. 978 → 1000 arası tam 23 kayıt eder, yani her kutu bir kişiye denk gelir.

Silüetleri eşikten önce de göstermek bilinçli: sayfaya gelen "bunlar kim, ne zaman dolacak?" diye merak etsin. Başlık da eşiğe kadar bunu söyler — *"1.000'e 68 kişi — son 23'ü tek tek burada belirecek"*.

Son üç kutu sabittir ve **yeşil halkayla** ayrışır:

| Kutu | Kayıt | Fotoğraf |
|------|-------|----------|
| 1–20 | 978–997 | havuz (`galeri.js` içindeki `HAVUZ` sırası) |
| 21 | 998 | `sabri.png` |
| 22 | 999 | `nur.png` |
| 23 | 1000 | `mert.png` |

Dağılım **kodda sabittir**: `HAVUZ` dizisi bir kez karıştırılıp yazıldı, rastgelelik çalışma anında üretilmez. Böylece herkes aynı sırayı görür ve sayfa yenilenince fotoğraflar yer değiştirmez. Sırayı değiştirmek istersen diziyi elle karıştırman yeterli.

Hangi kutunun dolu olduğu **yalnızca sayıdan türer** (`sayı >= 978 + sıra`). Ayrı bir kayıt tutulmaz; sayfayı geç açan da, yenileyen de doğru tabloyu görür.

**Eşiği veya hedefi değiştirmek:** `index.html`'deki `data-baslangic` ve `data-hedef`. Kutu sayısı aradaki farktan türer, final üçlüsü her zaman sona oturur.

**Fotoğraf eklemek/değiştirmek:** Görseli `Maskot/` klasörüne koy, `galeri.js`'teki listeye `{ dosya: 'ad.png', odak: '50% 20%', zoom: 1.4 }` olarak yaz. `odak`/`zoom` yüzün daire içinde nereye oturacağını belirler (maskot bölümündeki kurallarla aynı); mevcut değerler her fotoğrafın yüzü bulunarak hesaplandı. Dosya eksikse o kutu silüet kalır, sayfa bozulmaz.

Galeri tamamen dekoratiftir: `aria-hidden` taşır, çünkü sayıyı zaten sayacın duyuru alanı okur. 23 maskotun sakin duruş animasyonu kapalıdır — hareket yalnızca bir kutu dolarken olur.

**Prova:** `?demo=` ile sayıyı elle sür, ağa çıkılmaz.

```
?demo=977    23 silüet bekliyor, hiçbiri dolu değil (eşik altı)
?demo=990    ilk 13 kutu dolu
?demo=1000   hepsi dolu, final üçlüsü yeşil
?demo=auto   974'ten 1000'e birer birer tırmanır (tam prova)
```

## Hedef kutlaması

Sayı **1000'e** ulaştığında ekranı kaplayan bir kutlama açılır: ortada **Mert'in**
fotoğrafıyla dans eden büyük bir maskot, etrafta konfeti, altında "1.000 kişi!".
**10 saniye** sonra kendiliğinden kapanır.

Konfeti iki katmandır: açılışta ekranın ortasından dışarı fışkıran bir patlama,
ardından kutlama boyunca üstten süzülen yağmur. Kütüphane yok, hepsi CSS animasyonu.

**Ne zaman açılır:** sayı hedefe ulaştığı anda ve 1000'e ulaşıldıktan sonra sayfayı
her açanda. Aynı sayfada bir kezden fazla açılmaz (30 saniyelik tazeleme döngüsü
tekrar tetiklemez).

**Nasıl kapanır:** 10 saniye dolunca, "Kapat" düğmesiyle, ekranın herhangi bir
yerine tıklayınca ya da `Esc` ile. Kutlama açıkken arkadaki sayfa kaydırılamaz.

**Ayarlar** — hepsi `index.html`'deki `.devfest-kutlama` öğesinde:

| Öznitelik | Ne yapar |
|-----------|----------|
| `data-hedef` | Hangi sayıda açılacağı |
| `data-sure` | Ekranda kalma süresi (ms) |
| `data-foto` | Ortadaki maskotun fotoğrafı |
| `data-odak` / `data-zoom` | Fotoğrafın daire içindeki çerçevelemesi |

**Prova:** `?kutlama-sure=180000` ile kutlamayı uzun süre açık tutabilirsin —
dansı ve konfetiyi rahatça ayarlamak için. `?demo=1000` ile sayıyı hedefe
sabitleyip doğrudan kutlamayı açarsın.

`prefers-reduced-motion` açıkken konfeti ve dans devre dışı; fotoğraf, sayı ve
kapatma düğmesi hareketsiz görünür.

## Bakım

**Etkinlik değişirse** yalnızca iki öznitelik güncellenir — `data-topluluk` ve `data-etkinlik`. Slug'ları Kommunity etkinlik adresinden alabilirsin:
`kommunity.com/<topluluk>/events/<etkinlik>`

**`data-yedek` nasıl güncellenir:** Elle. Ara sıra güncel sayıyı alıp HTML'deki değeri değiştir. Bu sayı yalnızca hem canlı veri hem de tarayıcıdaki kayıt yokken (ilk ziyaret + API erişilemez) devreye girer.

```bash
curl -s https://api.kommunity.com/api/v3/gdg-mersin/events/devfest-mersin-2026-bee55ede \
  | python3 -c "import json,sys; print(json.load(sys.stdin)['data']['users_count'])"
```

## Açılış animasyonu

Sayfa her açıldığında (ve her yenilendiğinde) sayaç **sıfırdan başlayıp** o anki gerçek sayıya kadar 1,6 saniyede sayar. Aynı anda halka dolar, maskot alkışlar ve sayaç dolarken kafasının üstünden arka arkaya `+1` balonları yükselir (1,2 saniyeye yayılmış 7 balon).

Bu yalnızca bir açılış gösterisidir; gösterilen değer her zaman kaynaktan gelen gerçek sayıdır. Veri hiç alınamazsa sayma başlamaz — bileşen `–` gösterir veya tamamen gizlenir, **hiçbir zaman `0`'da kalmaz**.

## Nasıl çalışıyor

- Sayfa yüklenince bir kez, sonra 30 saniyede bir istek. Sekme arka plandayken istek atılmaz, sekmeye dönünce anında tazelenir.
- Her istek 5 saniye sonra iptal edilir. Yeniden deneme yok.
- **Düşme zinciri:** canlı veri → tarayıcıda saklanan son geçerli değer → `data-yedek` → hiçbiri yoksa bileşen tamamen gizlenir. Sayaç hiçbir koşulda boş veya `0` göstermez.
- Yanıp sönen yeşil nokta yalnızca veri gerçekten tazeyken görünür; eski veri gösterilirken nokta söner.
- Sayı yalnızca **artarken** animasyonla geçer. Düşerse (kayıt iptali) doğrudan yazılır — gösterilen değer her zaman kaynaktaki gerçek değerdir.
- `prefers-reduced-motion` açıkken açılış sayması, artış animasyonu, yanıp sönme ve maskotun alkışı devre dışı; sayı doğrudan yazılır, artış tek bir hareketsiz `+1` balonuyla gösterilir.
- Ekran okuyucu, animasyonun her karesini değil yalnızca son değeri duyar: `sayac.js` görünen sayıyı `aria-hidden` yapar ve ayrı, görünmez bir `aria-live` alanına yalnızca sonucu yazar. HTML'deki `aria-live` gerekli değildir, kalsa da zararsızdır.

**Gizlilik:** Kommunity yanıtındaki 68 alandan yalnızca `users_count` ve `show_user_count` okunur. Katılımcı isimleri, avatarlar veya başka kişisel veri okunmaz, saklanmaz, iletilmez. `localStorage`'a yalnızca sayı ve zaman damgası yazılır.

## Ziyaretçi analitiği

`analitik.js` sayfayı Google Analytics 4'e bağlar: toplam sayfa gösterimi, tekil ziyaretçi, trafik kaynağı, şehir/ülke, cihaz ve tıklama olayları. Sayacı ve maskotu tanımaz; dosya silinirse sayfa aynen çalışır.

### Kurulum

1. [analytics.google.com](https://analytics.google.com) → hesap + mülk oluştur (ülke Türkiye, para birimi TRY).
2. Platform olarak **Web**'i seç, site adresini gir (`https://sabricetin.github.io/devfest-mersin-2026-sayac/`).
3. Açılan ekrandaki **ölçüm kimliğini** (`G-` ile başlar) kopyala.
4. `index.html`'in sonundaki satırda `G-XXXXXXXXXX` yerine yapıştır:

```html
<script src="analitik.js" defer data-ga4="G-ABC1234567"></script>
```

5. Commit + push. GitHub Pages yayınlayınca GA4 → **Raporlar → Gerçek zamanlı**'da kendini görürsün.

Kimlik `G-XXXXXXXXXX` olarak kaldığı sürece analitik tamamen kapalıdır: istek gitmez, çerez şeridi çıkmaz. Yani bu dosyalar yerel testte ve geliştirme sırasında yolda durmaz.

### Hazır gelen raporlar

| Soru | GA4'te nereye bakılır |
| --- | --- |
| Kaç sayfa gösterimi oldu | Raporlar → Etkileşim → Sayfalar ve ekranlar |
| Kaç farklı kişi girdi | Raporlar → Edinme → Genel bakış (`Etkin kullanıcılar`) |
| Nereden geldiler | Raporlar → Edinme → Trafik edinme (`Oturum kaynağı / aracı`) |
| Hangi şehirden | Raporlar → Kullanıcı → Demografi → Ayrıntılar → Şehir |
| Telefon mu bilgisayar mı | Raporlar → Teknoloji → Genel bakış |
| Şu anda kaç kişi sitede | Raporlar → Gerçek zamanlı |

### Sayfaya özel olaylar

| Olay | Ne zaman | Parametreler |
| --- | --- | --- |
| `kayit_tikla` | "Ücretsiz kayıt ol" butonu tıklandığında | `baglanti_metni`, `hedef_alan`, `hedef_url` |
| `disi_baglanti` | Etiketsiz, başka siteye giden her bağlantıda | aynı |
| `sayac_goruldu` | Sayaç ilk gerçek değerini çizdiğinde | `kayit_sayisi`, `veri_kaynagi`, `hedefe_oran` |
| `cerez_secimi` | Çerez şeridinde seçim yapıldığında | `secim` (`kabul` / `ret`) |

`sayac_goruldu`'nun `veri_kaynagi` parametresi işin sağlık göstergesidir: `live` değilse o ziyaretçi canlı veriyi değil, yedek sayıyı görmüştür. Etkinlik haftası bu oranı izlemek, API'nin sessizce düşüp düşmediğini söyler.

Sayfaya yeni bir buton eklersen `data-olay="..."` yazman yeterli; `analitik.js` değişmez.

```html
<a href="https://maps.app.goo.gl/..." data-olay="yol_tarifi">Yol tarifi</a>
```

**Önemli:** Parametreler GA4 raporlarında kendiliğinden görünmez. Yönetici → Veri görüntüleme → **Özel tanımlar** → *Özel boyut oluştur* ile her parametreyi bir kez kaydet (`veri_kaynagi`, `hedef_alan`, `secim`); sayısal olanlar (`kayit_sayisi`, `hedefe_oran`) için *özel metrik*. Kayıttan sonraki veri raporlanır, geçmişe dönük çalışmaz — bu yüzden kurulumla aynı gün yap.

### Hangi paylaşım işe yaradı

GA4 referrer'ı kendisi okur ama Instagram bio'su, WhatsApp ve QR kod referrer göndermez; hepsi "doğrudan" görünür. Paylaşacağın bağlantıya etiket ekle:

```
...github.io/devfest-mersin-2026-sayac/?utm_source=instagram&utm_medium=bio
...github.io/devfest-mersin-2026-sayac/?utm_source=whatsapp&utm_medium=grup
...github.io/devfest-mersin-2026-sayac/?utm_source=afis&utm_medium=qr
```

Bunlar *Trafik edinme* raporunda ayrı satırlar olarak görünür.

### Görsel pano

Kalıcı bir ekran istiyorsan: [Looker Studio](https://lookerstudio.google.com) → Oluştur → Rapor → veri kaynağı **Google Analytics** → mülkünü seç. Sürükle-bırak ile sayfa gösterimi, kaynak kırılımı, Türkiye haritası ve `kayit_tikla` sayısını tek sayfaya koyup linkini ekiple paylaşabilirsin. Ücretsiz.

### KVKK ve gizlilik

- Ölçüm **Consent Mode v2** ile başlar: onay verilene kadar `analytics_storage: denied`, yani çerez yazılmaz, ziyaretçi kimliklendirilmez — yalnızca kimliksiz toplu gösterim sayılır.
- Şeritte **Kabul et**'e basılırsa çerezli ölçüme geçilir, seçim `localStorage`'da saklanır ve bir daha sorulmaz.
- Tarayıcı **Do Not Track** gönderiyorsa şerit hiç gösterilmez, çerezsiz modda kalınır.
- Kişi bazında "kim tıkladı" verisi ne toplanır ne de toplanabilir; GA4 toplu veri verir, IP'yi saklamaz.

Analitiği tamamen kapatmak için `index.html`'deki `analitik.js` ve `analitik.css` satırlarını sil — başka hiçbir yere dokunman gerekmez.

## Yerel test

```bash
python3 -m http.server 8000
# http://localhost:8000
```

`index.html`'i çift tıklayarak **açma.** `file://` ile tarayıcı `Origin: null` gönderir, Kommunity bu durumda CORS izni vermez ve sayaç yedek değere düşer. Mutlaka bir sunucu üzerinden aç.

## Bilinen risk

`api.kommunity.com/api/v3/` **belgelenmemiş** bir endpoint'tir. Kommunity kendi uygulaması için kullanır, bize verilmiş bir sözleşme yoktur:

- Şema haber verilmeden değişebilir → sayaç yedek değere düşer, sayfa bozulmaz.
- Tarayıcıdan doğrudan çağrılabilmesi Kommunity'nin CORS ayarına bağlıdır (30 Eylül 2026 itibarıyla her origin'e izin veriliyor). Bu kapanırsa çözüm: sayıyı çeken küçük bir sunucu fonksiyonu yazıp `data-endpoint` ile ona bağlanmak — bileşenin geri kalanı aynı kalır.
- Organizatör Kommunity'de "katılımcı sayısını göster"i kapatırsa (`show_user_count: false`) sayaç yedek değere düşer.

Kalıcı kullanım için Kommunity ekibinden resmî API erişimi istemek en sağlıklısı.

## Etkinlik günü kontrol listesi

- [ ] Endpoint yanıt veriyor mu (yukarıdaki `curl` komutu bir sayı döndürüyor mu)
- [ ] Sayfa canlıda açılıyor, yeşil nokta yanıp sönüyor mu (= veri taze)
- [ ] `data-yedek` değeri güncel mi
- [ ] Mobilde ve karanlık temada görünüm bozuk değil mi
- [ ] `Maskot/maskot.png` ve `Maskot/maskot-2.png` yerinde mi (yoksa çizim yüz görünür)
- [ ] `?demo=auto` ile galeri provası yapıldı mı (23 kutu, final sırası doğru mu)
- [ ] `?demo=1000` ile kutlama provası yapıldı mı (Mert dans ediyor, konfeti akıyor)
- [ ] GA4 gerçek zamanlı raporu kendi ziyaretini görüyor mu

## Dosyalar

```
index.html   demo / landing sayfası
sayac.js     sayaç bileşeni (sıfır bağımlılık)
sayac.css    sayaç stilleri
maskot.js    alkışlayan karakter (sayacı tanımaz, olayla bağlı)
maskot.css   maskot stilleri ve animasyonları
galeri.js    1000'e son 23 kişi sırası (maskot.js'in API'sini kullanır)
galeri.css   galeri stilleri
kutlama.js   hedefe ulaşınca açılan tam ekran kutlama
kutlama.css  kutlama katmanı, dans ve konfeti
Maskot/      tüm fotoğraflar (üstteki iki maskot + galeri havuzu + final üçlüsü)
analitik.js  GA4 ölçümü + çerez onayı (sayacı tanımaz, olayla bağlı)
analitik.css çerez onay şeridinin stilleri
```

`CANLI-SAYAC-MIMARI.md` ilk tasarım dokümanıdır. Sunucu tarafı bir proxy öngörüyordu; CORS'un açık olduğu doğrulandığı için proxy yapılmadı, koruma katmanı istemci tarafına taşındı.
