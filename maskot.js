/*!
 * DevFest Mersin — Alkışlayan Maskot
 * sayac.js'in yaydığı "devfest:sayac" olayını dinler; sayı artınca alkışlar.
 * Sayacı tanımaz, sayaç da bunu tanımaz. İkisi ayrı ayrı çalışabilir.
 */
(function () {
  'use strict';

  var SECICI    = '.devfest-maskot';
  var ALKIS_MS  = 1600;   // maskot.css'teki alkış animasyonu ile aynı olmalı
  var BALON_AZAMI  = 7;    // bir seride çıkan en çok balon (üst üste binmesinler)
  var YAYILMA_ACILIS = 1200;  // açılışta balonların dağıldığı süre (sayaç dolarken)
  var YAYILMA_ARTIS  = 500;   // yeni kayıt geldiğinde
  var KAYDIRMA_MS  = 140;  // birden çok maskot varsa aralarındaki gecikme
  var VARSAYILAN_FOTO = 'maskot.png';
  var KUTU = { x: 56, y: 18, boy: 88 };   // kafadaki fotoğraf alanı (SVG birimi)

  var azHareket = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
  var sayac = 0;   // clipPath id'leri çakışmasın diye

  /* ------------------------------------------------------------------ SVG */

  function svgIskelet(kirpId) {
    return '' +
    '<svg class="devfest-maskot__svg" viewBox="0 0 200 264" aria-hidden="true" focusable="false">' +
      '<defs>' +
        '<clipPath id="' + kirpId + '"><circle cx="100" cy="62" r="44"/></clipPath>' +
      '</defs>' +

      '<g class="devfest-maskot__govde">' +

        /* bacaklar + ayakkabılar */
        '<g class="devfest-maskot__bacak devfest-maskot__bacak--sol">' +
          '<rect x="78" y="182" width="17" height="58" rx="8.5" class="devfest-maskot__uzuv"/>' +
          '<ellipse cx="82" cy="244" rx="16" ry="9.5" class="devfest-maskot__ayakkabi"/>' +
        '</g>' +
        '<g class="devfest-maskot__bacak devfest-maskot__bacak--sag">' +
          '<rect x="105" y="182" width="17" height="58" rx="8.5" class="devfest-maskot__uzuv"/>' +
          '<ellipse cx="118" cy="244" rx="16" ry="9.5" class="devfest-maskot__ayakkabi"/>' +
        '</g>' +

        /* boyun + gövde */
        '<rect x="92" y="96" width="16" height="28" rx="8" class="devfest-maskot__uzuv"/>' +
        '<rect x="70" y="112" width="60" height="80" rx="28" class="devfest-maskot__uzuv"/>' +

        /* alkış çarpma parıltısı — eller buluştuğu anda parlar */
        '<g class="devfest-maskot__carpma">' +
          '<path d="M100 142 l0 -12"/><path d="M86 149 l-11 -8"/><path d="M114 149 l11 -8"/>' +
          '<path d="M82 163 l-13 0"/><path d="M118 163 l13 0"/>' +
        '</g>' +

        /* kollar + eldiven eller (omuzdan döner) */
        '<g class="devfest-maskot__kol devfest-maskot__kol--sol">' +
          '<rect x="58" y="120" width="17" height="49" rx="8.5" class="devfest-maskot__uzuv"/>' +
          '<circle cx="66.5" cy="172" r="13" class="devfest-maskot__eldiven"/>' +
        '</g>' +
        '<g class="devfest-maskot__kol devfest-maskot__kol--sag">' +
          '<rect x="125" y="120" width="17" height="49" rx="8.5" class="devfest-maskot__uzuv"/>' +
          '<circle cx="133.5" cy="172" r="13" class="devfest-maskot__eldiven"/>' +
        '</g>' +

        /* kafa: halka + fotoğraf; fotoğraf yoksa çizim yüz */
        '<g class="devfest-maskot__kafa">' +
          '<circle cx="100" cy="62" r="47" class="devfest-maskot__halka"/>' +
          '<circle cx="100" cy="62" r="44" class="devfest-maskot__yuzzemin"/>' +
          '<image class="devfest-maskot__foto" clip-path="url(#' + kirpId + ')"/>' +
          '<g class="devfest-maskot__yuz">' +
            '<circle cx="86" cy="57" r="5"/><circle cx="114" cy="57" r="5"/>' +
            '<path d="M83 74 q17 15 34 0" fill="none" stroke-width="5" stroke-linecap="round"/>' +
          '</g>' +
        '</g>' +

      '</g>' +
    '</svg>';
  }

  /* -------------------------------------------------------------- kurulum */

  function sayiOku(deger, varsayilan) {
    var s = parseFloat(deger);
    return isFinite(s) ? s : varsayilan;
  }

  // Fotoğrafı daire içine yerleştirir. Kare olmayan görsellerde kırpma kaçınılmaz;
  // hangi bölgenin kalacağını data-odak (CSS object-position gibi) ve data-zoom belirler.
  function cerceve(kap, tabiiG, tabiiY) {
    var ham   = (kap.dataset.odak || '50% 40%').trim().split(/\s+/);
    var odakX = Math.max(0, Math.min(1, sayiOku(ham[0], 50) / 100));
    var odakY = Math.max(0, Math.min(1, sayiOku(ham[1], 40) / 100));
    var zoom  = Math.max(1, sayiOku(kap.dataset.zoom, 1));

    var olcek = Math.max(KUTU.boy / tabiiG, KUTU.boy / tabiiY) * zoom;  // "cover" + yakınlaştırma
    var g = tabiiG * olcek;
    var y = tabiiY * olcek;

    return {
      g: g, y: y,
      x:   KUTU.x + (KUTU.boy - g) * odakX,
      ust: KUTU.y + (KUTU.boy - y) * odakY
    };
  }

  function fotografYukle(kap, yol) {
    if (!yol) return;
    // Önce bellekte dene: yüklenmezse çizim yüz olduğu gibi kalsın, SVG'de boş kare olmasın.
    var deneme = new Image();
    deneme.onload = function () {
      var img = kap.querySelector('.devfest-maskot__foto');
      var c = cerceve(kap, deneme.naturalWidth, deneme.naturalHeight);

      img.setAttribute('width',  c.g);
      img.setAttribute('height', c.y);
      img.setAttribute('x',      c.x);
      img.setAttribute('y',      c.ust);
      // Oranı zaten kendimiz koruduk; tarayıcı ikinci kez hizalamaya çalışmasın.
      img.setAttribute('preserveAspectRatio', 'none');

      img.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', yol);
      img.setAttribute('href', yol);
      kap.classList.add('devfest-maskot--fotolu');
    };
    deneme.onerror = function () {
      if (window.console && console.debug) {
        console.debug('[maskot] fotoğraf bulunamadı, çizim yüz kullanılıyor:', yol);
      }
    };
    deneme.src = yol;
  }

  function hazirla(kap) {
    sayac += 1;
    kap.innerHTML = svgIskelet('devfest-maskot-kirp-' + sayac);

    var yol = kap.dataset.foto;
    fotografYukle(kap, yol === undefined ? VARSAYILAN_FOTO : yol);
    return kap;
  }

  /* --------------------------------------------------------------- alkış */

  // Her balon tek bir kaydı temsil eder: üstünde hep "+1" yazar.
  // Kendi animasyonu bitince kendini siler, birikme olmaz.
  function balonCikar(kap, gecikmeMs) {
    var balon = document.createElement('span');
    balon.className = 'devfest-maskot__artis';
    balon.setAttribute('aria-hidden', 'true');   // sayıyı zaten sayaç duyuruyor
    balon.textContent = '+1';
    // Hafif yatay dağılım, balonlar tam üst üste binmesin.
    balon.style.setProperty('--kayma', (Math.random() * 68 - 34).toFixed(1) + 'px');
    if (gecikmeMs) balon.style.animationDelay = gecikmeMs + 'ms';
    balon.addEventListener('animationend', function () {
      if (balon.parentNode) balon.parentNode.removeChild(balon);
    });
    kap.appendChild(balon);
  }

  function alkisla(kap, artis, yayilma) {
    // Kaç kişi eklendiyse o kadar "+1" balonu; çok büyük artışlarda üst sınır var.
    var adet = Math.max(1, Math.min(BALON_AZAMI, artis));

    if (azHareket && azHareket.matches) {
      balonCikar(kap, 0);   // hareket istenmiyorsa tek, duran balon; alkış yok
      return;
    }

    var aralik = adet > 1 ? yayilma / (adet - 1) : 0;
    for (var i = 0; i < adet; i++) balonCikar(kap, Math.round(i * aralik));

    if (kap._alkisSaat) clearTimeout(kap._alkisSaat);
    kap.classList.remove('devfest-maskot--alkis');
    void kap.offsetWidth;   // animasyonu baştan başlatmak için reflow
    kap.classList.add('devfest-maskot--alkis');
    kap._alkisSaat = setTimeout(function () {
      kap.classList.remove('devfest-maskot--alkis');
    }, ALKIS_MS);
  }

  /* ------------------------------------------------------------- başlatma */

  function basla() {
    var maskotlar = [].slice.call(document.querySelectorAll(SECICI)).map(hazirla);
    if (!maskotlar.length) return;

    document.addEventListener('devfest:sayac', function (olay) {
      var d = olay.detail;
      // Açılışta (sayaç sıfırdan sayarken) her zaman alkışlar.
      // Sonrasında yalnızca taze veriyle gelen gerçek artışta; düşüş ve
      // stale/fallback geçişleri sessizdir.
      if (d.artis <= 0) return;
      if (!d.acilis && d.kaynak !== 'live') return;
      var yayilma = d.acilis ? YAYILMA_ACILIS : YAYILMA_ARTIS;
      // Sayfada birden çok maskot varsa tıpatıp aynı anda değil, hafif kaydırmalı
      // alkışlasınlar; tek ağızdan tek hareket robotik duruyor.
      maskotlar.forEach(function (kap, i) {
        if (!i) { alkisla(kap, d.artis, yayilma); return; }
        if (kap._sira) clearTimeout(kap._sira);
        kap._sira = setTimeout(function () { alkisla(kap, d.artis, yayilma); }, i * KAYDIRMA_MS);
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', basla);
  } else {
    basla();
  }
})();
