/*!
 * DevFest Mersin — Canlı Katılımcı Sayacı
 * Sıfır bağımlılık. Kommunity API'sini doğrudan tarayıcıdan okur.
 * Kullanım için README.md
 */
(function () {
  'use strict';

  var SECICI       = '.devfest-sayac';
  var ARALIK_MS    = 30000;  // iki istek arası
  var ZAMANASIMI   = 5000;   // tek isteğin üst sınırı
  var ARTIS_MS     = 700;    // yeni kayıt geldiğinde sayının geçiş süresi
  var ACILIS_MS    = 1600;   // sayfa açılışında 0'dan sayma süresi (maskotun alkışıyla aynı)
  var DEPO         = 'devfest-sayac';
  var API_KOK      = 'https://api.kommunity.com/api/v3';

  var HALKA_R = 90;
  var CEVRE   = 2 * Math.PI * HALKA_R;

  var VARSAYILAN = {
    topluluk: 'gdg-mersin',
    etkinlik: 'devfest-mersin-2026-bee55ede'
  };

  var bicim    = new Intl.NumberFormat('tr-TR');
  var azHareket = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');

  var ogeler   = [];
  var ayar     = null;
  var sonIyi   = null;   // { count, updatedAt } — bellekteki son geçerli değer
  var zamanlayici = null;
  var calisiyor = false;
  var sonDeneme  = 0;    // son isteğin başlangıç zamanı (ms)
  var sonCizilen = null; // en son ekrana yazılan sayı (olay yayını için)
  var kimlik     = 0;    // gradient id'leri çakışmasın diye

  /* ---------------------------------------------------------------- yardımcı */

  function gecerliSayi(d) {
    return typeof d === 'number' && isFinite(d) && Math.floor(d) === d && d >= 0;
  }

  function depodanOku() {
    try {
      var ham = localStorage.getItem(DEPO);
      if (!ham) return null;
      var k = JSON.parse(ham);
      return gecerliSayi(k.count) ? k : null;
    } catch (e) {
      return null;
    }
  }

  function depoyaYaz(kayit) {
    try {
      localStorage.setItem(DEPO, JSON.stringify(kayit));
    } catch (e) {
      /* özel sekme / dolu kota — sessizce geç, bellekteki sonIyi yeterli */
    }
  }

  /* ------------------------------------------------------------------ ağ */

  // Tek istek, tek deneme. Yeniden deneme yok — kaynağı yormayalım.
  function cek() {
    var kontrol = new AbortController();
    var saat = setTimeout(function () { kontrol.abort(); }, ZAMANASIMI);

    return fetch(ayar.url, {
      signal: kontrol.signal,
      headers: { 'Accept': 'application/json' },
      cache: 'no-store',
      credentials: 'omit'
    })
      .then(function (yanit) {
        if (!yanit.ok) throw new Error('http_' + yanit.status);
        return yanit.json();
      })
      .then(function (govde) {
        // Kendi proxy'mize bağlıysak sözleşme { count }, değilse Kommunity şeması.
        if (ayar.ozelEndpoint) {
          if (!gecerliSayi(govde && govde.count)) throw new Error('sema_bozuk');
          return govde.count;
        }
        var d = govde && govde.data;
        if (!d) throw new Error('sema_bozuk');
        if (d.show_user_count === false) throw new Error('count_hidden');
        if (!gecerliSayi(d.users_count)) throw new Error('sema_bozuk');
        return d.users_count;   // yanıttaki diğer 67 alana dokunulmaz
      })
      .finally(function () { clearTimeout(saat); });
  }

  /* ---------------------------------------------------------------- çizim */

  function oran(oge, sayi) {
    if (!oge._hedef) return 0;
    return Math.max(0, Math.min(1, sayi / oge._hedef));
  }

  // Sayı ve halka tek elden güncellenir; animasyonun her karesinde ikisi birlikte ilerler.
  function uygula(oge, sayi) {
    oge._sayiOge.textContent = bicim.format(sayi);
    if (oge._dolu) {
      oge._dolu.setAttribute('stroke-dasharray',
        (oran(oge, sayi) * CEVRE).toFixed(2) + ' ' + CEVRE.toFixed(2));
    }
  }

  function durdur(oge) {
    if (oge._kare) { cancelAnimationFrame(oge._kare); oge._kare = null; }
  }

  function animasyonla(oge, baslangic, bitis, sure) {
    durdur(oge);
    var t0 = performance.now();
    var fark = bitis - baslangic;

    function kare(simdi) {
      var o = Math.min((simdi - t0) / sure, 1);
      var yumusak = 1 - Math.pow(1 - o, 3);           // ease-out cubic
      uygula(oge, Math.round(baslangic + fark * yumusak));
      if (o < 1) oge._kare = requestAnimationFrame(kare);
      else { oge._kare = null; uygula(oge, bitis); }  // son kare tam değere otursun
    }
    oge._kare = requestAnimationFrame(kare);
  }

  function hedefEtiketi(oge, sayi) {
    if (!oge._hedefOge || !oge._hedef) return;
    var ulasildi = sayi >= oge._hedef;
    oge.classList.toggle('devfest-sayac--tamam', ulasildi);
    var metin = ulasildi ? 'hedef aşıldı' : 'hedef ' + bicim.format(oge._hedef);
    if (oge._hedefOge.textContent !== metin) oge._hedefOge.textContent = metin;
  }

  function ciz(sayi, kaynak) {
    var oncekiToplam = sonCizilen;
    var acilis       = oncekiToplam === null;   // sayfa açıldıktan sonraki ilk gerçek değer

    ogeler.forEach(function (oge) {
      oge.hidden = false;
      oge.dataset.kaynak = kaynak;   // CSS canlı noktasını buna göre gösterir
      hedefEtiketi(oge, sayi);

      if (oge._deger === sayi && !acilis) return;   // değişmediyse boşuna çizme

      var onceki = acilis ? 0 : oge._deger;         // her açılışta sıfırdan sayılır
      oge._deger = sayi;

      var animasyonlu = !(azHareket && azHareket.matches) &&
                        (acilis || (onceki != null && sayi > onceki));

      if (animasyonlu) {
        animasyonla(oge, onceki == null ? 0 : onceki, sayi, acilis ? ACILIS_MS : ARTIS_MS);
      } else {
        durdur(oge);
        uygula(oge, sayi);   // hareket kapalıysa ya da düşüşte (iptal) → doğrudan
      }

      // Ekran okuyucu animasyonun her karesini değil, yalnızca sonucu duyar.
      var duyuru = bicim.format(sayi) + ' kişi kayıtlı';
      if (oge._duyuru && oge._duyuru.textContent !== duyuru) oge._duyuru.textContent = duyuru;
    });

    if (oncekiToplam === sayi) return;
    sonCizilen = sayi;

    // Sayaç kendi işini bitirdi; kim dinlemek isterse (maskot vb.) haber alsın.
    // Bileşenler birbirini tanımaz, sadece bu olay üzerinden konuşur.
    var detay = {
      count:  sayi,
      onceki: oncekiToplam,
      artis:  acilis ? sayi : sayi - oncekiToplam,
      kaynak: kaynak,
      acilis: acilis,
      hedef:  ogeler[0] ? ogeler[0]._hedef : null
    };

    // Bir sonraki döngüde yay. Sayfa açılışında istek çok hızlı dönerse (önbellek,
    // yerel sunucu) bu olay, defer'li maskot.js daha çalışmadan çıkar ve kaçırılır.
    // setTimeout, tüm defer'li betiklerin çalışmasını garantiler.
    setTimeout(function () {
      document.dispatchEvent(new CustomEvent('devfest:sayac', { detail: detay }));
    }, 0);
  }

  function gizle() {
    ogeler.forEach(function (oge) { oge.hidden = true; });
  }

  /* ------------------------------------------------------- düşme zinciri */

  function birTur() {
    if (calisiyor) return Promise.resolve();
    calisiyor = true;
    sonDeneme = Date.now();

    return cek()
      .then(function (sayi) {
        sonIyi = { count: sayi, updatedAt: new Date().toISOString() };
        depoyaYaz(sonIyi);
        ciz(sayi, 'live');
      })
      .catch(function (hata) {
        if (window.console && console.debug) {
          console.debug('[sayac] canlı veri alınamadı:', hata && hata.message);
        }
        var kayit = sonIyi || depodanOku();
        if (kayit) ciz(kayit.count, 'stale');            // son iyi değer
        else if (ayar.yedek != null) ciz(ayar.yedek, 'fallback');
        else gizle();                                    // asla "0" gösterme
      })
      .finally(function () {
        calisiyor = false;
        planla();
      });
  }

  /* --------------------------------------------------------------- döngü */

  function planla() {
    clearTimeout(zamanlayici);
    if (document.hidden) return;   // arka plandayken istek yok

    // Bir sonraki istek, son denemeden tam ARALIK_MS sonra. Sekmeye uzun süre
    // sonra dönüldüyse kalan 0'dır ve anında tazelenir; hızlıca sekme değiştiren
    // kullanıcı ise istek yağmuruna sebep olmaz.
    var kalan = Math.max(0, ARALIK_MS - (Date.now() - sonDeneme));
    zamanlayici = setTimeout(birTur, kalan);   // setInterval değil: üst üste binmesin
  }

  function gorunurlukDegisti() {
    if (document.hidden) clearTimeout(zamanlayici);
    else planla();
  }

  /* ----------------------------------------------------------- başlatma */

  function ayarlariOku(oge) {
    var v = oge.dataset;
    var ozel = (v.endpoint || '').trim();
    var yedek = parseInt(v.yedek, 10);

    return {
      ozelEndpoint: !!ozel,
      url: ozel || (API_KOK + '/' +
            encodeURIComponent(v.topluluk || VARSAYILAN.topluluk) + '/events/' +
            encodeURIComponent(v.etkinlik || VARSAYILAN.etkinlik)),
      yedek: gecerliSayi(yedek) ? yedek : null
    };
  }

  function halkaKur(oge, gecisId) {
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('class', 'devfest-sayac__halka');
    svg.setAttribute('viewBox', '0 0 200 200');
    svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML =
      '<defs>' +
        '<linearGradient id="' + gecisId + '" x1="0" y1="0" x2="1" y2="1">' +
          '<stop offset="0" stop-color="var(--sayac-halka-bas)"/>' +
          '<stop offset="1" stop-color="var(--sayac-halka-son)"/>' +
        '</linearGradient>' +
      '</defs>' +
      '<circle class="devfest-sayac__halka-iz"   cx="100" cy="100" r="' + HALKA_R + '"/>' +
      '<circle class="devfest-sayac__halka-dolu" cx="100" cy="100" r="' + HALKA_R + '" ' +
              'stroke="url(#' + gecisId + ')" stroke-dasharray="0 ' + CEVRE.toFixed(2) + '"/>';
    return svg;
  }

  function hazirla(oge) {
    oge._sayiOge = oge.querySelector('.devfest-sayac__sayi');
    if (!oge._sayiOge) return false;

    kimlik += 1;
    oge._deger = null;
    oge._kare  = null;

    var hedef = parseInt(oge.dataset.hedef, 10);
    oge._hedef = gecerliSayi(hedef) && hedef > 0 ? hedef : null;

    if (oge.dataset.etiket) {
      var etiketOge = oge.querySelector('.devfest-sayac__etiket');
      if (etiketOge) etiketOge.textContent = oge.dataset.etiket;
    }

    // Sayı animasyon boyunca her karede değişiyor; ekran okuyucuya onu değil,
    // ayrı bir duyuru alanını okutuyoruz.
    oge._sayiOge.removeAttribute('aria-live');
    oge._sayiOge.setAttribute('aria-hidden', 'true');

    // Yazarın HTML'i sade kalsın diye iskeleti burada kuruyoruz.
    var ic = document.createElement('div');
    ic.className = 'devfest-sayac__ic';
    while (oge.firstChild) ic.appendChild(oge.firstChild);

    var nokta = document.createElement('span');
    nokta.className = 'devfest-sayac__nokta';
    nokta.setAttribute('aria-hidden', 'true');
    ic.insertBefore(nokta, ic.firstChild);

    var daire = document.createElement('div');
    daire.className = 'devfest-sayac__daire';
    if (oge._hedef) daire.appendChild(halkaKur(oge, 'devfest-sayac-gecis-' + kimlik));
    daire.appendChild(ic);
    oge.appendChild(daire);

    if (oge._hedef) {
      oge._hedefOge = document.createElement('span');
      oge._hedefOge.className = 'devfest-sayac__hedef';
      oge.appendChild(oge._hedefOge);
      oge._dolu = daire.querySelector('.devfest-sayac__halka-dolu');
    } else {
      oge.classList.add('devfest-sayac--hedefsiz');
    }

    oge._duyuru = document.createElement('span');
    oge._duyuru.className = 'devfest-sayac__duyuru';
    oge._duyuru.setAttribute('aria-live', 'polite');
    oge.appendChild(oge._duyuru);

    return true;
  }

  function basla() {
    var bulunan = [].slice.call(document.querySelectorAll(SECICI));
    ogeler = bulunan.filter(hazirla);
    if (!ogeler.length) return;

    // Sayfada birden çok sayaç olsa da tek döngü, tek istek; sonuç hepsine dağılır.
    ayar = ayarlariOku(ogeler[0]);

    // Son bilinen değer yalnızca düşme zinciri için yüklenir, ekrana basılmaz:
    // her açılışta sayaç sıfırdan sayarak güncel değere çıkar.
    sonIyi = depodanOku();

    document.addEventListener('visibilitychange', gorunurlukDegisti);
    birTur();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', basla);
  } else {
    basla();
  }
})();
