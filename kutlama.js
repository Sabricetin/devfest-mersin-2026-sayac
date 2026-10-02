/*!
 * DevFest Mersin — Hedef Kutlaması
 * sayac.js'in yaydığı "devfest:sayac" olayını dinler. Sayı hedefe ulaşınca
 * ekranı kaplayan bir kutlama açar: ortada dans eden maskot, etrafta konfeti.
 * Süre dolunca kendini kapatır. Sayacı tanımaz; dosya silinse sayfa aynen çalışır.
 */
(function () {
  'use strict';

  var SECICI   = '.devfest-kutlama';
  var SURE_MS  = 10000;   // kutlama ekranda ne kadar kalsın
  var SONUS_MS = 600;     // kapanış solma süresi (kutlama.css ile aynı)
  var PATLAMA  = 70;      // merkezden fışkıran parça
  var YAGMUR   = 90;      // yukarıdan yağan parça
  var RENKLER  = ['#4285f4', '#ea4335', '#fbbc04', '#34a853', '#ffffff'];

  var azHareket = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
  var bicim = new Intl.NumberFormat('tr-TR');

  var kap = null, hedef = 1000, acildi = false, saat = null, oncekiOdak = null;

  /* -------------------------------------------------------------- konfeti */

  function arada(a, b) { return a + Math.random() * (b - a); }

  function parca(renk) {
    var p = document.createElement('i');
    var yuvarlak = Math.random() < 0.35;
    p.style.setProperty('--renk', renk);
    p.style.setProperty('--g', arada(6, 12).toFixed(1) + 'px');
    p.style.setProperty('--y', (yuvarlak ? 0 : arada(10, 18)).toFixed(1) + 'px');
    if (yuvarlak) p.className = 'yuvarlak';
    return p;
  }

  // Açılış patlaması: parçalar ekranın ortasından dışarı fırlar.
  function patlama(kat) {
    for (var i = 0; i < PATLAMA; i++) {
      var p = parca(RENKLER[i % RENKLER.length]);
      var aci = arada(0, Math.PI * 2);
      var guc = arada(18, 62);
      p.className += ' patla';
      p.style.setProperty('--dx', (Math.cos(aci) * guc).toFixed(1) + 'vmin');
      p.style.setProperty('--dy', (Math.sin(aci) * guc + arada(10, 40)).toFixed(1) + 'vmin');
      p.style.setProperty('--don', Math.round(arada(-900, 900)) + 'deg');
      p.style.animationDelay = Math.round(arada(0, 260)) + 'ms';
      p.style.animationDuration = arada(1.1, 2.0).toFixed(2) + 's';
      kat.appendChild(p);
    }
  }

  // Ardından sürekli yağmur: kutlama boyunca üstten düşmeye devam eder.
  function yagmur(kat, sure) {
    for (var i = 0; i < YAGMUR; i++) {
      var p = parca(RENKLER[i % RENKLER.length]);
      p.className += ' yag';
      p.style.left = arada(-2, 102).toFixed(1) + '%';
      p.style.setProperty('--don', Math.round(arada(-1080, 1080)) + 'deg');
      p.style.setProperty('--kay', arada(-8, 8).toFixed(1) + 'vw');
      p.style.animationDuration = arada(2.6, 5.2).toFixed(2) + 's';
      // Gecikme penceresi: son parçalar da kapanmadan yere varsın. Üst sınır,
      // uzun provalarda (?kutlama-sure) yağmurun seyrelmemesi için.
      p.style.animationDelay =
        Math.round(arada(0, Math.min(Math.max(0, sure - 3200), 8000))) + 'ms';
      kat.appendChild(p);
    }
  }

  /* -------------------------------------------------------------- iskelet */

  function kur(sayi, sure) {
    kap.innerHTML = '';

    var kat = document.createElement('div');
    kat.className = 'devfest-kutlama__konfeti';
    kat.setAttribute('aria-hidden', 'true');
    kap.appendChild(kat);

    if (!(azHareket && azHareket.matches)) {
      patlama(kat);
      yagmur(kat, sure);
    }

    var ic = document.createElement('div');
    ic.className = 'devfest-kutlama__ic';

    var maskot = document.createElement('div');
    maskot.className = 'devfest-maskot devfest-kutlama__maskot';
    maskot.dataset.oto = 'hayir';                       // kendi dansı var, alkışa katılmaz
    maskot.dataset.foto = kap.dataset.foto || '';
    if (kap.dataset.odak) maskot.dataset.odak = kap.dataset.odak;
    if (kap.dataset.zoom) maskot.dataset.zoom = kap.dataset.zoom;
    maskot.setAttribute('aria-hidden', 'true');
    ic.appendChild(maskot);

    var baslik = document.createElement('p');
    baslik.className = 'devfest-kutlama__sayi';
    baslik.textContent = bicim.format(sayi) + ' kişi!';
    ic.appendChild(baslik);

    var alt = document.createElement('p');
    alt.className = 'devfest-kutlama__alt';
    alt.textContent = 'Hedefe ulaştık 🎉';
    ic.appendChild(alt);

    var kapat = document.createElement('button');
    kapat.type = 'button';
    kapat.className = 'devfest-kutlama__kapat';
    kapat.textContent = 'Kapat';
    kapat.addEventListener('click', function (o) { o.stopPropagation(); kapa(); });
    ic.appendChild(kapat);

    kap.appendChild(ic);

    if (window.DevfestMaskot && window.DevfestMaskot.kur) window.DevfestMaskot.kur(maskot);
    return kapat;
  }

  /* ------------------------------------------------------------ aç / kapa */

  function tusla(olay) {
    if (olay.key === 'Escape' || olay.key === 'Esc') kapa();
  }

  // Prova kancası: ?kutlama-sure=60000 ile kutlamayı uzun süre açık tutup
  // dansı ve konfetiyi rahatça ayarlayabilirsin. Üretimde data-sure geçerli.
  function sureOku() {
    var m = /[?&]kutlama-sure=(\d+)/.exec(location.search);
    if (m) return parseInt(m[1], 10);
    return parseInt(kap.dataset.sure, 10);
  }

  function ac(sayi) {
    var sure = sureOku();
    if (!isFinite(sure) || sure < 1000) sure = SURE_MS;

    oncekiOdak = document.activeElement;
    var kapat = kur(sayi, sure);

    kap.hidden = false;
    document.documentElement.classList.add('devfest-kutlama-acik');
    // Reflow, sonra sınıf: geçiş baştan oynasın. requestAnimationFrame KULLANMA —
    // sekme arka plandayken rAF donar ve kutlama opacity:0'da takılı kalırdı.
    void kap.offsetWidth;
    kap.classList.add('devfest-kutlama--acik');

    kap.addEventListener('click', kapa);
    document.addEventListener('keydown', tusla);
    try { kapat.focus({ preventScroll: true }); } catch (e) { /* eski tarayıcı */ }

    saat = setTimeout(kapa, sure);
  }

  function kapa() {
    if (kap.hidden) return;
    clearTimeout(saat);
    kap.removeEventListener('click', kapa);
    document.removeEventListener('keydown', tusla);

    kap.classList.remove('devfest-kutlama--acik');
    setTimeout(function () {
      kap.hidden = true;
      kap.innerHTML = '';                               // konfetiyi DOM'da bırakma
      document.documentElement.classList.remove('devfest-kutlama-acik');
      if (oncekiOdak && oncekiOdak.focus) {
        try { oncekiOdak.focus({ preventScroll: true }); } catch (e) { /* yok sayılır */ }
      }
    }, azHareket && azHareket.matches ? 0 : SONUS_MS);
  }

  /* ------------------------------------------------------------- başlatma */

  function basla() {
    kap = document.querySelector(SECICI);
    if (!kap) return;

    var h = parseInt(kap.dataset.hedef, 10);
    if (isFinite(h) && h > 0) hedef = h;

    function isle(d) {
      if (acildi) return;                               // sayfa başına bir kez
      if (typeof d.count !== 'number' || d.count < hedef) return;
      acildi = true;
      // Açılışta sayaç sıfırdan hedefe sayıyor; kutlama o gösteri bitince başlasın.
      setTimeout(function () { ac(d.count); }, d.acilis ? 1700 : 250);
    }

    document.addEventListener('devfest:sayac', function (olay) { isle(olay.detail); });

    // Sayaç bu betik çalışmadan önce yayın yapmış olabilir.
    if (window.DevfestSayac && window.DevfestSayac.son) isle(window.DevfestSayac.son);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', basla);
  } else {
    basla();
  }
})();
