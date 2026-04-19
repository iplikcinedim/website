'use strict';

// slider.js — config.js'deki APP_CONFIG.slider'ı okur,
// o yüzden html'de bu dosyadan önce config.js yüklenmeli (zaten öyle)

(function () {
  const cfg     = APP_CONFIG.slider;
  const track   = document.getElementById('sliderTrack');
  const dotsEl  = document.getElementById('sliderDots');
  const prevBtn = document.getElementById('sliderPrev');
  const nextBtn = document.getElementById('sliderNext');

  // slider elementi yoksa veya hiç resim yoksa sessizce çık (galeri veya iletişim sayfası gibi)
  if (!track || !cfg?.images?.length) return;

  let current   = 0;
  let timer     = null;
  let isRunning = false; // tab gizlenince duraklatıp geri döndüğünde devam etmek için

  // ── Slide'ları DOM'a ekle ────────────────────────────────────────────────────
  cfg.images.forEach((item, i) => {
    const slide = document.createElement('div');
    slide.className = 'slide' + (i === 0 ? ' active' : '');
    slide.setAttribute('aria-hidden', i !== 0 ? 'true' : 'false');

    const img = document.createElement('img');
    img.src     = cfg.folder + item.file;
    img.alt     = item.caption || '';
    // ilk resim eager yükle (LCP için kritik), diğerleri lazy - performans için
    img.loading  = i === 0 ? 'eager' : 'lazy';
    img.decoding = 'async'; // tarayıcının decode işini async yapmasına izin ver

    const overlay = document.createElement('div');
    overlay.className = 'slide-overlay';

    const caption = document.createElement('div');
    caption.className = 'slide-caption';
    // caption HTML'i static ve bizim kontrolümüzde - güvenli innerHTML kullanımı
    caption.innerHTML =
      `<h3>${item.caption || ''}</h3>` +
      (item.sub ? `<p>${item.sub}</p>` : '');

    slide.append(img, overlay, caption);
    track.appendChild(slide);

    // dot'ları da aynı döngüde oluştur - ayrı loop gereksiz
    if (dotsEl) {
      const dot = document.createElement('button');
      dot.className = 'slider-dot' + (i === 0 ? ' active' : '');
      dot.setAttribute('aria-label', `Slayt ${i + 1}`);
      dot.addEventListener('click', () => goTo(i));
      dotsEl.appendChild(dot);
    }
  });

  const slides = track.querySelectorAll('.slide');
  const dots   = dotsEl ? dotsEl.querySelectorAll('.slider-dot') : [];

  // ── Slide geçişi ─────────────────────────────────────────────────────────────
  function goTo(index) {
    // aktif class'ı kaldır
    slides[current].classList.remove('active');
    slides[current].setAttribute('aria-hidden', 'true');
    if (dots[current]) dots[current].classList.remove('active');

    // modulo ile sonsuz döngü - son slide'dan sonraki ilk slide'a geç
    current = (index + slides.length) % slides.length;

    // CSS transform ile kaydır - her slide %100 width, N. slide için -N*100% yeterli
    track.style.transform = `translateX(-${current * 100}%)`;

    slides[current].classList.add('active');
    slides[current].setAttribute('aria-hidden', 'false');
    if (dots[current]) dots[current].classList.add('active');
  }

  const next = () => goTo(current + 1);
  const prev = () => goTo(current - 1);

  // ── Kontroller ───────────────────────────────────────────────────────────────
  nextBtn?.addEventListener('click', () => { next(); resetTimer(); });
  prevBtn?.addEventListener('click', () => { prev(); resetTimer(); });

  // klavye ile de gezilebilsin - accessibility için önemli
  document.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') { next(); resetTimer(); }
    if (e.key === 'ArrowLeft')  { prev(); resetTimer(); }
  });

  // ── Touch / Swipe ─────────────────────────────────────────────────────────────
  // passive: true şart - yoksa Chrome scroll performance uyarısı verir
  let touchStartX = 0;
  track.addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].clientX;
  }, { passive: true });

  track.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    // 40px threshold - küçük dokunuşlara tepki verme, kasıtlı swipe olsun
    if (Math.abs(dx) > 40) {
      dx < 0 ? next() : prev(); // sola kaydır = sonraki, sağa = önceki
      resetTimer();
    }
  }, { passive: true });

  // ── Autoplay ─────────────────────────────────────────────────────────────────
  function startTimer() {
    if (!cfg.autoplay) return;
    timer     = setInterval(next, cfg.interval || 4500);
    isRunning = true;
  }

  function resetTimer() {
    // kullanıcı manuel geçiş yapınca interval'i sıfırla,
    // yoksa hemen ardından otomatik geçiş oluyor ve çok hızlı hissettiriyor
    clearInterval(timer);
    startTimer();
  }

  // hover ve focus'ta duraklat - kullanıcı bir fotoğrafa bakarken geçiş sinir bozucu
  const wrapper = document.getElementById('mainSlider');
  if (wrapper) {
    wrapper.addEventListener('mouseenter', () => clearInterval(timer));
    wrapper.addEventListener('mouseleave', startTimer);
    // tab ile focus gelinince de dur - screen reader kullananlar için
    wrapper.addEventListener('focusin',  () => clearInterval(timer));
    wrapper.addEventListener('focusout', startTimer);
  }

  // tab arka planda/gizliyken autoplay kaynakları boşa harcamasın
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) clearInterval(timer);
    else if (isRunning)  startTimer();
  });

  startTimer();

})();
