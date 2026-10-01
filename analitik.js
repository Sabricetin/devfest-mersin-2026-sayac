/*!
 * DevFest Mersin — Ziyaretçi Analitiği (Google Analytics 4)
 *
 * Sayfa gösterimi, tekil ziyaretçi, trafik kaynağı, konum ve tıklama olaylarını
 * GA4'e yazar. Sayacı ve maskotu tanımaz; sayaçla ilgili tek bağı, onun yaydığı
 * "devfest:sayac" olayını dinlemesi. Bu dosya silinse sayfa aynen çalışır.
 *
 * KVKK: ölçüm Consent Mode v2 ile çerezsiz ve kimliksiz başlar. Ziyaretçi onay
 * verirse çerezli ölçüme geçilir, reddederse çerezsiz hâlde kalır.
 *
 * Ölçüm kimliği index.html'deki script etiketinden okunur:
 *   <script src="analitik.js" defer data-ga4="G-XXXXXXXXXX"></script>
 */
(function () {
  'use strict';

  var ORNEK_ID = 'G-XXXXXXXXXX';   // README'deki örnek; gerçek kimlikle değişene kadar ölçüm kapalı
  var ONAY_DEPO = 'devfest-onay';  // 'kabul' | 'ret'
  var BEKLEME_MS = 500;            // onay güncellemesi için gtag'in bekleyeceği süre

  // currentScript yalnızca betik çalışırken geçerlidir; DOMContentLoaded
  // geri çağrısında null olur. Bu yüzden etiketi şimdi yakalıyoruz.
  var kendiEtiket = document.currentScript;

  var olcumId = null;
  var onayDurumu = null;

  /* ---------------------------------------------------------------- yardımcı */

  function depodanOku() {
    try {
      var d = localStorage.getItem(ONAY_DEPO);
      return d === 'kabul' || d === 'ret' ? d : null;
    } catch (e) {
      return null;   // özel sekme — her açılışta sorulur, çerezsiz ölçüm sürer
    }
  }

  function depoyaYaz(deger) {
    try {
      localStorage.setItem(ONAY_DEPO, deger);
    } catch (e) {
      /* kota dolu / özel sekme — seçim bu oturum için geçerli, sessizce geç */
    }
  }

  function kimlikOku() {
    // Betik satır içine taşınmış ya da eski bir tarayıcıda currentScript
    // boş dönmüşse seçiciyle aranır.
    var etiket = kendiEtiket || document.querySelector('script[data-ga4]');
    var id = etiket ? (etiket.dataset.ga4 || '').trim() : '';
    return id && id !== ORNEK_ID ? id : null;
  }

  // Tarayıcı "izlenmek istemiyorum" diyorsa onay hiç sorulmaz, çerezsiz kalınır.
  function izlemeReddi() {
    var d = navigator.doNotTrack || window.doNotTrack || navigator.msDoNotTrack;
    return d === '1' || d === 'yes';
  }

  function gtag() {
    window.dataLayer.push(arguments);
  }

  /* ------------------------------------------------------------------ gtag */

  function olcumuKur() {
    window.dataLayer = window.dataLayer || [];

    // Önce reddet, sonra gerekiyorsa aç. Sıra önemli: gtag.js yüklenmeden
    // yazıldığı için ilk istek daha yolda çerezsiz moda geçmiş olur.
    gtag('consent', 'default', {
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'denied',
      wait_for_update: BEKLEME_MS
    });

    if (onayDurumu === 'kabul') izinVer();

    gtag('js', new Date());
    gtag('config', olcumId);

    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(olcumId);
    s.onerror = function () {
      if (window.console && console.debug) {
        console.debug('[analitik] gtag.js yüklenemedi (reklam blokeri olabilir)');
      }
    };
    document.head.appendChild(s);
  }

  function izinVer() {
    gtag('consent', 'update', { analytics_storage: 'granted' });
  }

  // Ölçüm kapalıysa (kimlik girilmemiş) olay göndermek hata değil, sessiz geçiş.
  function olay(ad, parametreler) {
    if (!olcumId) return;
    gtag('event', ad, parametreler || {});
  }

  /* ------------------------------------------------------------ onay şeridi */

  function onaySeridi() {
    var kap = document.createElement('div');
    kap.className = 'devfest-onay';
    kap.setAttribute('role', 'region');
    kap.setAttribute('aria-label', 'Çerez tercihi');

    var metin = document.createElement('p');
    metin.className = 'devfest-onay__metin';
    metin.textContent = 'Kaç kişinin sayfayı gördüğünü ölçmek için Google Analytics ' +
      'kullanıyoruz. Reddedersen hiçbir çerez yazılmaz; yalnızca kimliksiz, toplu ' +
      'sayfa gösterimi sayılır.';

    var dugmeler = document.createElement('div');
    dugmeler.className = 'devfest-onay__dugmeler';

    function dugmeYap(yazi, sinif, secim) {
      var d = document.createElement('button');
      d.type = 'button';
      d.className = 'devfest-onay__dugme devfest-onay__dugme--' + sinif;
      d.textContent = yazi;
      d.addEventListener('click', function () {
        depoyaYaz(secim);
        onayDurumu = secim;
        if (secim === 'kabul') izinVer();
        olay('cerez_secimi', { secim: secim });
        kap.remove();
      });
      return d;
    }

    dugmeler.appendChild(dugmeYap('Reddet', 'ret', 'ret'));
    dugmeler.appendChild(dugmeYap('Kabul et', 'kabul', 'kabul'));

    kap.appendChild(metin);
    kap.appendChild(dugmeler);
    document.body.appendChild(kap);
  }

  /* ------------------------------------------------------------- tıklamalar */

  function digerAlan(baglanti) {
    return baglanti.host && baglanti.host !== location.host;
  }

  // Tek dinleyici, yakalama yok: data-olay varsa o ad, yoksa dışa giden her
  // bağlantı "disi_baglanti" olarak yazılır. Sayfaya yeni buton eklenince
  // burası değişmez.
  function tiklamalariDinle() {
    document.addEventListener('click', function (e) {
      var baglanti = e.target.closest && e.target.closest('a[href]');
      if (!baglanti) return;

      var ad = (baglanti.dataset.olay || '').trim();
      if (!ad && !digerAlan(baglanti)) return;   // iç bağlantı ve etiketsiz → ilgilenmiyoruz

      olay(ad || 'disi_baglanti', {
        baglanti_metni: (baglanti.textContent || '').trim().slice(0, 100),
        hedef_alan: baglanti.host,
        hedef_url: baglanti.href
      });
    });
  }

  /* ----------------------------------------------------------------- sayaç */

  // Ziyaretçinin gerçekten canlı veri görüp görmediğini ölçer: kaynak 'live'
  // değilse (API düşmüş, yedek sayı gösterilmiş) bu raporda ortaya çıkar.
  // Yalnızca açılıştaki ilk değer yazılır; 30 sn'lik her turda olay üretmez.
  function sayaciDinle() {
    document.addEventListener('devfest:sayac', function (e) {
      var d = e.detail;
      if (!d.acilis) return;
      var p = { kayit_sayisi: d.count, veri_kaynagi: d.kaynak };
      // Boş parametre göndermemek için oran yalnızca hedef varken eklenir.
      if (d.hedef) p.hedefe_oran = Math.round((d.count / d.hedef) * 100);
      olay('sayac_goruldu', p);
    });
  }

  /* --------------------------------------------------------------- başlatma */

  function basla() {
    olcumId = kimlikOku();
    onayDurumu = depodanOku();

    if (!olcumId) {
      if (window.console && console.debug) {
        console.debug('[analitik] ölçüm kimliği yok, analitik kapalı ' +
                      '(index.html → data-ga4)');
      }
      return;   // şerit de gösterilmez: ölçüm yokken onay istemek anlamsız
    }

    olcumuKur();
    tiklamalariDinle();
    sayaciDinle();

    if (!onayDurumu && !izlemeReddi()) onaySeridi();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', basla);
  } else {
    basla();
  }
})();
