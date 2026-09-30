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

`index.html` içinde **iki maskot** var: solda `maskot-2.png`, sağda `maskot.png`. İstediğin kadar ekleyebilirsin — her `.devfest-maskot` öğesi kendi fotoğrafını ve çerçeve ayarını taşır, hepsi aynı sayaç olayını dinler. Aynı anda tıpatıp aynı hareketi yapmasınlar diye her maskot bir öncekinden 140 ms sonra alkışlar.

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
- [ ] `maskot.png` ve `maskot-2.png` yerinde mi (yoksa çizim yüz görünür)

## Dosyalar

```
index.html   demo / landing sayfası
sayac.js     sayaç bileşeni (sıfır bağımlılık)
sayac.css    sayaç stilleri
maskot.js    alkışlayan karakter (sayacı tanımaz, olayla bağlı)
maskot.css   maskot stilleri ve animasyonları
maskot.png   sağdaki maskotun fotoğrafı
maskot-2.png soldaki maskotun fotoğrafı
```

`CANLI-SAYAC-MIMARI.md` ilk tasarım dokümanıdır. Sunucu tarafı bir proxy öngörüyordu; CORS'un açık olduğu doğrulandığı için proxy yapılmadı, koruma katmanı istemci tarafına taşındı.
