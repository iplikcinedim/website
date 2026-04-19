'use strict';

// sayfanın tamamen yüklenmesini beklemek yerine DOMContentLoaded kullanıyoruz,
// çünkü görseller yüklensin diye beklememize gerek yok - DOM hazır olunca yeterli
function ready(fn) {
  if (document.readyState !== 'loading') fn();
  else document.addEventListener('DOMContentLoaded', fn);
}

ready(() => {
  initNav();
  initHeroReveal();
  initScrollReveal();
  initCounters();
  initSmoothScroll();
  setMinDate();
});


// ─── NAV ─────────────────────────────────────────────────────────────────────
function initNav() {
  const navbar    = document.getElementById('navbar');
  const navToggle = document.getElementById('navToggle');
  const navLinks  = document.getElementById('navLinks');

  if (!navbar) return;

  // 40px'den sonra glassmorphism efekti devreye giriyor.
  // ilk başta transparant bırakmak istedik ki hero ile nav birbirine karışmasın.
  // çok az scroll'da bile geçiş olmasın diye 40 seçtik, 10-15 çok erken tetikleniyordu
  const SCROLL_THRESHOLD = 40;

  function onScroll() {
    navbar.classList.toggle('scrolled', window.scrollY > SCROLL_THRESHOLD);
  }

  // passive: true — scroll event'te preventDefault çağırmayacağız,
  // bunu belirtince tarayıcı rendering'i optimize ediyor (özellikle mobile'da fark yapar)
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll(); // sayfa yenilenmişse scroll pozisyonu korunabilir, bir kere çalıştır

  // ── Mobile hamburger menü ──────────────────────────────────────────────────
  if (navToggle && navLinks) {

    navToggle.addEventListener('click', () => {
      const isOpen = navToggle.getAttribute('aria-expanded') === 'true';
      navToggle.setAttribute('aria-expanded', String(!isOpen));
      navLinks.classList.toggle('open', !isOpen);

      // menü açıkken sayfanın arkasının scroll etmesini engelle,
      // özellikle iOS'ta bu olmadan kullanıcı hem menüyü hem arka planı kaydırıyor
      document.body.style.overflow = isOpen ? '' : 'hidden';
    });

    // link'e tıklayınca menü kapansın - yoksa kullanıcı yeni sayfaya gider ama
    // menü hala açık görünebilir (özellikle back button ile geri gelince)
    navLinks.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', closeMobileMenu);
    });

    // menünün dışına tıklanınca da kapansın
    document.addEventListener('click', e => {
      if (!navbar.contains(e.target)) closeMobileMenu();
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeMobileMenu();
    });
  }

  function closeMobileMenu() {
    navToggle?.setAttribute('aria-expanded', 'false');
    navLinks?.classList.remove('open');
    document.body.style.overflow = '';
  }

  // ── Aktif sayfa linki highlight ────────────────────────────────────────────
  // IntersectionObserver ile hangi section'da olduğumuzu takip ediyoruz.
  // rootMargin ile viewport'un üst %40'ını ve alt %55'ini "görmüyoruz",
  // böylece anchor link tıklandığında değil, gerçekten o section'ın ortasına
  // gelindiğinde aktif link değişiyor — çok daha doğal hissettiriyor
  const sections = document.querySelectorAll('section[id], footer[id]');
  const links    = document.querySelectorAll('.nav-link[data-nav]');

  if (sections.length && links.length) {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        links.forEach(l => l.classList.remove('active'));
        document.querySelector(`.nav-link[href="#${entry.target.id}"]`)?.classList.add('active');
      });
    }, { rootMargin: '-40% 0px -55% 0px' });

    sections.forEach(s => obs.observe(s));
  }
}


// ─── HERO REVEAL ─────────────────────────────────────────────────────────────
function initHeroReveal() {
  // animasyonları hemen başlatmak yerine küçük bir delay koyuyoruz.
  // neden? tarayıcı CSS dosyalarını parse etmeyi tamamlamadan body.loaded
  // class'ı gelirse animation başlayamadan bitiyor (özellikle yavaş bağlantılarda).
  // 60ms yeterli - daha fazlası kullanıcının animasyonu kaçırmasına neden olur
  requestAnimationFrame(() => {
    setTimeout(() => document.body.classList.add('loaded'), 60);
  });
}


// ─── SCROLL REVEAL ───────────────────────────────────────────────────────────
function initScrollReveal() {
  if (!APP_CONFIG.features.scrollReveal) return;

  const targets = document.querySelectorAll('[data-scroll-reveal]');
  if (!targets.length) return;

  // threshold 0.12 — elementin %12'si göründüğünde tetikleniyor.
  // 0 yapınca çok erken (element neredeyse görünmüyor), 0.5 yapınca çok geç.
  // rootMargin -40px — viewport'un tam alt kenarından biraz önce tetikle,
  // böylece element ekranda belirdiğinde animasyon zaten bitmiş oluyor
  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('in-view');
      obs.unobserve(entry.target); // bir kere çalıştır, tekrar observe etme
    });
  }, {
    threshold:  0.12,
    rootMargin: '0px 0px -40px 0px',
  });

  targets.forEach(el => obs.observe(el));
}


// ─── SAYAÇ ANİMASYONU ────────────────────────────────────────────────────────
function initCounters() {
  if (!APP_CONFIG.features.counterAnimation) return;

  const counters = document.querySelectorAll('.stat-num[data-count]');
  if (!counters.length) return;

  function animateCounter(el) {
    const target   = parseInt(el.dataset.count, 10);
    const duration = 1600; // 1.6sn - çok hızlı olunca sayıyı göremiyorsun, çok yavaş sıkıcı
    const start    = performance.now();

    function step(now) {
      const progress = Math.min((now - start) / duration, 1);

      // ease-out cubic: başta hızlı, sonda yavaşlıyor
      // linear'a göre çok daha doğal görünüyor
      const eased  = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(eased * target);

      // 1000+ değerler için "2.0K" formatı kullanıyoruz
      el.textContent = target >= 1000
        ? (current >= 1000 ? (current / 1000).toFixed(1) + 'K' : current)
        : current;

      if (progress < 1) requestAnimationFrame(step);
      else el.textContent = target >= 1000 ? (target / 1000).toFixed(1) + 'K' : target;
    }

    requestAnimationFrame(step);
  }

  // sadece kullanıcı o section'a scroll edince başlat,
  // sayfa açılınca hemen başlarsa hero bile görünmeden sayaç bitmiş olur
  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      animateCounter(entry.target);
      obs.unobserve(entry.target);
    });
  }, { threshold: 0.5 });

  counters.forEach(c => obs.observe(c));
}


// ─── SMOOTH SCROLL ───────────────────────────────────────────────────────────
function initSmoothScroll() {
  // CSS scroll-behavior: smooth zaten var ama bazı tarayıcılar
  // (özellikle eski Safari) bunu desteklemeyebilir.
  // ayrıca nav yüksekliği kadar offset eklemek için JS gerekiyor zaten.
  // scroll-padding-top ile bunu CSS'de hallettik ama bu JS fallback olarak kalsın
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', e => {
      const id = anchor.getAttribute('href').slice(1);
      if (!id) return;

      const target = document.getElementById(id);
      if (!target) return;

      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}


// ─── MİN TARİH ───────────────────────────────────────────────────────────────
function setMinDate() {
  const dateInput = document.getElementById('apptDate');
  if (!dateInput) return;

  // timezone offset trick: new Date() her zaman UTC verir,
  // ama input[type=date] yerel tarihi bekler.
  // bu olmadan Türkiye'deyken bugünün tarihi seçilemiyor çünkü
  // UTC'ye göre bir önceki gün sayılıyor (UTC+3 farkından dolayı)
  const today  = new Date();
  const offset = today.getTimezoneOffset() * 60000;
  const local  = new Date(today - offset);
  dateInput.min = local.toISOString().slice(0, 10);
}
