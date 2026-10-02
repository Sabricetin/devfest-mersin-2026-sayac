/*!
 * DevFest Mersin — 1000'e Son 23 Kişi Galerisi
 * sayac.js'in yaydığı "devfest:sayac" olayını dinler. Sayı eşiğe gelince
 * 23 maskot kutusu silüet olarak açılır; her yeni kayıt sıradakini doldurur.
 * Maskot çizimini maskot.js'in açtığı DevfestMaskot API'si üretir; burada
 * yalnızca "hangi kutu ne zaman dolar" mantığı var.
 */
(function () {
  'use strict';

  var SECICI      = '.devfest-galeri';
  var BASLANGIC   = 978;    // ilk kutunun temsil ettiği kayıt
  var HEDEF       = 1000;
  var KUTU_SAYISI = 0;      // aralıktan türer: HEDEF - BASLANGIC + 1 → 23
  var ACILIS_MS   = 1600;   // sayac.js'in sıfırdan sayma süresiyle aynı
  var YAYILMA_MS  = 500;    // yeni kayıtta "+1" balonlarının dağılımı
  var KLASOR      = 'Maskot/';

  // Daire içine yerleşim: kare olmayan görsellerde kırpma kaçınılmaz, hangi
  // bölgenin kalacağını bunlar belirler. Fotoğrafa özel ayar için aşağıdaki
  // listede o kayda odak/zoom yaz; yoksa bunlar kullanılır.
  var VARSAYILAN_ODAK = '50% 35%';
  var VARSAYILAN_ZOOM = 1.15;

  // Havuz: 20 fotoğraf, bir kez karıştırılmış SABİT sırayla. Sıra kodda
  // durduğu için herkes aynı dağılımı görür, sayfa yenilenince değişmez.
  // odak/zoom her fotoğrafın yüzüne göre hesaplandı (bkz. README).
  var HAVUZ = [
    { dosya: 'maskot-11.webp', odak: '63% 10%', zoom: 3.2 },
    { dosya: 'maskot-19.webp', odak: '47% 10%', zoom: 3.2 },
    { dosya: 'maskot-4.webp', odak: '65% 36%', zoom: 3.2 },
    { dosya: 'maskot-16.webp', odak: '34% 6%', zoom: 1.51 },
    { dosya: 'maskot-8.webp', odak: '38% 0%', zoom: 2.14 },
    { dosya: 'maskot-22.webp', odak: '60% 30%', zoom: 3.2 },
    { dosya: 'maskot-13.webp', odak: '44% 4%', zoom: 2.08 },
    { dosya: 'Maskot-3.webp', odak: '57% 0%', zoom: 1.03 },
    { dosya: 'maskot-17.webp', odak: '31% 9%', zoom: 2.2 },
    { dosya: 'maskot-6.webp', odak: '43% 35%', zoom: 2.22 },
    { dosya: 'maskot-20.webp', odak: '51% 0%', zoom: 3.2 },
    { dosya: 'maskot-9.webp', odak: '49% 1%', zoom: 2.46 },
    { dosya: 'maskot-14.webp', odak: '50% 27%', zoom: 2.71 },
    { dosya: 'maskot-21.webp', odak: '71% 11%', zoom: 1.61 },
    { dosya: 'maskot-5.webp', odak: '52% 27%', zoom: 3.2 },
    { dosya: 'maskot-12.webp', odak: '53% 0%', zoom: 1.12 },
    { dosya: 'maskot-18.webp', odak: '57% 14%', zoom: 3.2 },
    { dosya: 'maskot-7.webp', odak: '26% 0%', zoom: 1.15 },
    { dosya: 'maskot-15.webp', odak: '100% 50%', zoom: 1.0 },
    { dosya: 'maskot-10.webp', odak: '46% 16%', zoom: 3.2 }
  ];

  // Finalin sahipleri. Sıra sabit: 998 → 999 → 1000.
  var OZEL = [
    { dosya: 'sabri.webp', odak: '32% 31%', zoom: 2.59 },   // 998
    { dosya: 'nur.webp', odak: '52% 19%', zoom: 1.98 },   // 999
    { dosya: 'mert.webp', odak: '42% 0%', zoom: 1.35 }    // 1000
  ];

  var bicim     = new Intl.NumberFormat('tr-TR');
  var azHareket = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');

  var bolum   = null;
  var baslik  = null;
  var kutular = [];
  var api     = null;

  /* -------------------------------------------------------------- kurulum */

  // Son OZEL.length kutu finalin sahiplerinin, kalanı havuzdan sırayla.
  // Aralık büyütülürse havuz başa sarar; kutu fotoğrafsız kalmasın.
  function kayitlar() {
    var havuzlu = Math.max(0, KUTU_SAYISI - OZEL.length);
    var liste = [];
    for (var i = 0; i < havuzlu; i++) liste.push(HAVUZ[i % HAVUZ.length]);
    return liste.concat(OZEL.slice(Math.max(0, OZEL.length - KUTU_SAYISI)));
  }

  function kutuYap(sira, kayit) {
    var kutu = document.createElement('div');
    kutu.className = 'devfest-galeri__kutu';
    // Finalin üç kutusu dolarken ayrı vurgu alır.
    if (sira >= KUTU_SAYISI - OZEL.length) kutu.classList.add('devfest-galeri__kutu--final');

    var maskot = document.createElement('div');
    maskot.className = 'devfest-maskot';
    maskot.dataset.foto = '';          // boş doğar: fotoğraf yüklenmez, silüet kalır
    maskot.dataset.oto  = 'hayir';     // maskot.js'in toplu alkışına katılmaz
    maskot.dataset.odak = kayit.odak || VARSAYILAN_ODAK;
    maskot.dataset.zoom = kayit.zoom || VARSAYILAN_ZOOM;

    kutu.appendChild(maskot);
    api.kur(maskot);

    return { kutu: kutu, maskot: maskot, yol: KLASOR + kayit.dosya, dolu: false };
  }

  function iskelet() {
    baslik = document.createElement('p');
    baslik.className = 'devfest-galeri__baslik';
    bolum.appendChild(baslik);

    var izgara = document.createElement('div');
    izgara.className = 'devfest-galeri__izgara';

    kutular = kayitlar().map(function (kayit, i) {
      var k = kutuYap(i, kayit);
      izgara.appendChild(k.kutu);
      return k;
    });

    bolum.appendChild(izgara);
  }

  /* -------------------------------------------------------------- doldurma */

  function doldur(k, alkisli) {
    if (k.dolu) return;
    k.dolu = true;
    api.foto(k.maskot, k.yol);                       // dosya yoksa sessizce silüet kalır
    k.kutu.classList.add('devfest-galeri__kutu--dolu');
    if (alkisli) api.alkisla(k.maskot, 1, YAYILMA_MS);
  }

  function basligiYaz(sayi) {
    var kalan = HEDEF - sayi;
    var metin;
    if (sayi < BASLANGIC) {
      // Kutular henüz dolmaya başlamadı: boş silüetler merak uyandırsın,
      // başlık da ne olacağını söylesin.
      metin = bicim.format(HEDEF) + "'e <b>" + bicim.format(kalan) + '</b> kişi — ' +
              'son ' + bicim.format(KUTU_SAYISI) + "'ü tek tek burada belirecek";
    } else if (kalan > 0) {
      metin = bicim.format(HEDEF) + "'e son <b>" + bicim.format(kalan) + '</b> kişi';
    } else {
      metin = '<b>' + bicim.format(HEDEF) + ' kişi</b> — hedefe ulaşıldı 🎉';
    }
    if (baslik.innerHTML !== metin) baslik.innerHTML = metin;
  }

  /* ---------------------------------------------------------------- olay */

  var sonSira = 0;

  function guncelle(d) {
    var sayi = d.count;
    if (typeof sayi !== 'number' || !isFinite(sayi)) return;
    if (d.sira && d.sira <= sonSira) return;   // aynı yayını iki kez işleme
    sonSira = d.sira || 0;

    // Eşiğin altında da sıra görünür: 23 boş silüet dolmayı bekler.
    // Kutular yalnızca sayı eşiğe geldiğinde birer birer dolmaya başlar.
    bolum.hidden = false;
    basligiYaz(sayi);
    if (sayi < BASLANGIC) return;

    var olmasiGereken = Math.min(KUTU_SAYISI, sayi - BASLANGIC + 1);

    // Kutlama yalnızca taze veriyle gelen gerçek artışta. Açılış, düşüş ve
    // stale/fallback geçişleri sessiz dolar — maskot.js'teki kuralın aynısı.
    var kutlama = d.artis > 0 && !d.acilis && d.kaynak === 'live';

    var bekleyen = [];
    for (var i = 0; i < olmasiGereken; i++) {
      if (!kutular[i].dolu) bekleyen.push(kutular[i]);
    }
    if (!bekleyen.length) return;

    if (kutlama) {
      bekleyen.forEach(function (k) { doldur(k, true); });
      return;
    }

    // Sayfa açılışında geçmiş kutular sayacın sayma süresine yayılarak,
    // alkışsız dolar; sayı yukarı tırmanırken kutular da arkasından dolar.
    if (azHareket && azHareket.matches) {
      bekleyen.forEach(function (k) { doldur(k, false); });
      return;
    }
    var adim = ACILIS_MS / bekleyen.length;
    bekleyen.forEach(function (k, i) {
      setTimeout(function () { doldur(k, false); }, Math.round(i * adim));
    });
  }

  /* ------------------------------------------------------------- başlatma */

  function basla() {
    bolum = document.querySelector(SECICI);
    if (!bolum) return;

    api = window.DevfestMaskot;
    if (!api || !api.kur) {   // maskot.js yoksa galeri de yok
      if (window.console && console.debug) {
        console.debug('[galeri] maskot.js bulunamadı, galeri kurulmadı');
      }
      return;
    }

    var ozel = parseInt(bolum.dataset.baslangic, 10);
    if (isFinite(ozel) && ozel > 0) BASLANGIC = ozel;
    var ozelHedef = parseInt(bolum.dataset.hedef, 10);
    if (isFinite(ozelHedef) && ozelHedef > 0) HEDEF = ozelHedef;

    // Kutu sayısı aralıktan türer; eşik kaydırılırsa final üçlüsü yine sona oturur.
    KUTU_SAYISI = HEDEF - BASLANGIC + 1;
    if (KUTU_SAYISI < 1) return;

    iskelet();
    document.addEventListener('devfest:sayac', function (olay) { guncelle(olay.detail); });

    // Sayaç bu betik çalışmadan önce yayın yapmış olabilir (defer'li betikler
    // sırayla yüklenirken tarayıcı bekler ve o aralıkta olay çıkar).
    if (window.DevfestSayac && window.DevfestSayac.son) guncelle(window.DevfestSayac.son);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', basla);
  } else {
    basla();
  }
})();
