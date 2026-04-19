'use strict';

// ─── GÜVENLİK YAKLAŞIMI ──────────────────────────────────────────────────────
//
// Statik sitede SQL Injection riski olmasa da XSS hala geçerli bir tehdit.
// Örneğin: birisi name alanına <script>alert(1)</script> yazarsa ve biz bunu
// innerHTML ile sayfaya basarsak çalışır. Bunu iki katmanda önlüyoruz:
//
//   1. sanitize() — HTML özel karakterleri escape eder (&, <, >, ", /)
//   2. stripTags() — kalan tag kalıplarını siler
//   3. Form verisi hiçbir zaman innerHTML'e gitmez, sadece JSON payload'a
//
// Honeypot (_gotcha): gerçek kullanıcılar görmez/doldurmaz (CSS ile hidden).
// Botların çoğu tüm alanları körce doldurur — bu alanı doldurursa sessizce drop.
// Formspree zaten bunu kendi de yapıyor ama ekstra kat zarar vermez.


// ─── SANİTİZASYON ────────────────────────────────────────────────────────────

// HTML entity encoding - OWASP'ın önerdiği sırayla yapılıyor.
// & mutlaka ilk encode edilmeli, yoksa &amp; içindeki & de encode edilir ve çift encode olur
function sanitize(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim();
}

// tag'leri tamamen söküp plain text bırakıyor.
// sanitize() ile birlikte kullanılıyor — önce tag'leri at, sonra kalan karakterleri escape et
function stripTags(str) {
  return String(str).replace(/<[^>]*>/g, '').trim();
}


// ─── VALİDASYON KURALLARI ────────────────────────────────────────────────────
const V = {

  firstName(v) {
    const s = stripTags(v);
    if (!s)            return 'Ad zorunludur.';
    if (s.length < 2)  return 'En az 2 karakter olmalı.';
    if (s.length > 50) return 'En fazla 50 karakter.';
    // \p{L} — Unicode letter kategorisi. Türkçe ğüşıöç gibi karakterleri de kabul ediyor.
    // sadece /[a-zA-Z]/ yazarsak Türkçe isimler reddedilir, bunu öğrendim :)
    if (!/^[\p{L}\s'-]+$/u.test(s)) return 'Geçersiz karakter.';
    return null;
  },

  lastName(v) {
    const s = stripTags(v);
    if (!s)            return 'Soyad zorunludur.';
    if (s.length < 2)  return 'En az 2 karakter olmalı.';
    if (s.length > 50) return 'En fazla 50 karakter.';
    if (!/^[\p{L}\s'-]+$/u.test(s)) return 'Geçersiz karakter.';
    return null;
  },

  phone(v) {
    // boşluk, tire, parantez varsa sil - kullanıcılar formatı farklı yazıyor
    const s = stripTags(v).replace(/[\s\-().]/g, '');
    if (!s) return 'Telefon numarası zorunludur.';

    // Türk GSM formatları: 05xx, 0090 5xx, +90 5xx
    // 5 ile başlaması şart - sabit hat numarası olmasın diye
    // ikinci regex international format için fallback - +49, +1 vs. girerlerse de geçsin
    if (!/^(\+90|0090|0)?[5]\d{9}$/.test(s) && !/^\+?\d{7,15}$/.test(s)) {
      return 'Geçerli bir telefon girin.';
    }
    return null;
  },

  email(v) {
    const s = stripTags(v);
    if (!s) return 'E-posta zorunludur.';
    // RFC 5321'in tam implementasyonu çok karmaşık, bu regex %99 vakayı yakalar.
    // örneğin "a+b@sub.domain.co" formatını kabul ediyor, dogru
    // tek tırnaklı veya parantezli adresleri reddediyor ama bu kullanımda sorun olmaz
    if (!/^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(s)) {
      return 'Geçerli bir e-posta girin.';
    }
    if (s.length > 100) return 'E-posta çok uzun.';
    return null;
  },

  service(v) {
    // select değeri boş string veya undefined gelirse hata ver
    if (!v || v === '') return 'Lütfen bir hizmet seçin.';
    return null;
  },

  apptDate(v) {
    if (!v) return 'Lütfen bir tarih seçin.';
    const d = new Date(v);
    // invalid date kontrolü - new Date('abc') NaN döner ama hata fırlatmaz
    if (isNaN(d.getTime())) return 'Geçersiz tarih.';

    const today = new Date();
    today.setHours(0, 0, 0, 0); // bugünün başlangıcı - saati sıfırla
    if (d < today) return 'Geçmiş tarih seçilemez.';
    return null;
  },
};


// ─── FORM BAŞLATMA ───────────────────────────────────────────────────────────
(function initForm() {
  const form      = document.getElementById('appointmentForm');
  const submitBtn = document.getElementById('submitBtn');
  const successEl = document.getElementById('formSuccess');
  if (!form) return; // bu JS her sayfada yükleniyor, form olmayan sayfalarda sessizce çık

  // min tarihi bugün olarak ayarla (timezone fix'i için main.js'deki notlara bak)
  const dateInput = form.elements['apptDate'];
  if (dateInput) {
    const today = new Date();
    dateInput.min = new Date(today - today.getTimezoneOffset() * 60000)
      .toISOString().slice(0, 10);
  }

  // blur'da validate et (kullanıcı alandan çıkınca) - submit'te değil.
  // UX açısından daha iyi: hata mesajı kullanıcı yazmayı bitirince çıkar,
  // yazarken çıkarsa sinir bozucu ("Ad zorunludur" 1 harf yazmışken görmek gibi)
  Object.keys(V).forEach(name => {
    const el = form.elements[name];
    if (!el) return;

    el.addEventListener('blur', () => validateField(form, name));

    // kullanıcı hatayı düzeltmeye başlarsa mesajı anlık güncelle
    // ama sadece zaten error state'deyse - aksi halde her tuşa basışta validate olur
    el.addEventListener('input', () => {
      if (el.closest('.form-group')?.classList.contains('error')) {
        validateField(form, name);
      }
    });
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();

    // honeypot dolu mu? bot, sessizce drop et
    // kullanıcıya hata gösterme - botlar bunu anlayıp strateji değiştirmesin
    const hp = form.elements['_gotcha'];
    if (hp?.value.trim()) return;

    // tüm alanları validate et, ilk hatalı alana focus at
    const invalid = Object.keys(V).filter(n => validateField(form, n));
    if (invalid.length) {
      form.elements[invalid[0]]?.focus();
      return;
    }

    setLoading(submitBtn, true);

    try {
      await submitForm(form);
      form.reset();
      if (successEl) {
        successEl.hidden = false;
        successEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      // 9 saniye sonra success mesajını kaldır - çok uzun bırakma ama acele ettirme
      setTimeout(() => { if (successEl) successEl.hidden = true; }, 9000);
    } catch (err) {
      console.error('[Form submit hatası]', err);
      // telefon numarasını hata mesajına ekle - kullanıcı alternatif yol bilsin
      showError(form, 'Bir hata oluştu. Lütfen tekrar deneyin veya bizi arayın: 0536 867 46 01');
    } finally {
      // başarılı da olsa hatalı da olsa butonu geri normale al
      setLoading(submitBtn, false);
    }
  });
})();


// ─── ALAN VALİDASYONU ────────────────────────────────────────────────────────
function validateField(form, name) {
  const el    = form.elements[name];
  const errEl = document.getElementById(name + 'Error');
  const group = el?.closest('.form-group');
  if (!el || !group) return null;

  const err = V[name]?.(el.value) ?? null;

  // hata varsa class ekle (CSS border rengi vs. için), yoksa temizle
  group.classList.toggle('error', !!err);
  if (errEl) errEl.textContent = err ?? '';

  return err; // null = geçerli, string = hata mesajı
}


// ─── FORM GÖNDERİM YÖNLENDIRME ───────────────────────────────────────────────
async function submitForm(form) {
  const cfg = APP_CONFIG.form;
  if (cfg.useEmailJS) return submitViaEmailJS(form);
  return submitViaFormspree(form, cfg.formspreeEndpoint);
}

// Formspree — https://formspree.io'dan endpoint al, config.js'e yapıştır
// JSON ile gönderiyoruz çünkü multipart/form-data'ya göre daha temiz
// ve Formspree ikisini de destekliyor
async function submitViaFormspree(form, endpoint) {
  if (!endpoint || endpoint.startsWith('__')) {
    // endpoint ayarlanmamış, dev ortamında payload'ı sadece logla
    // böylece form UI'ını gerçek backend olmadan test edebilirsin
    console.log('[DEV] Formspree endpoint ayarlanmamış. Gönderilecek veri:', buildPayload(form));
    return;
  }

  const res = await fetch(endpoint, {
    method:  'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept':       'application/json', // bu header olmadan Formspree HTML döner
    },
    body: JSON.stringify(buildPayload(form)),
  });

  if (!res.ok) {
    // Formspree hata detayını JSON'da gönderiyor, onu almaya çalış
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error ?? `HTTP ${res.status}`);
  }
}

// EmailJS alternatifi - SDK'yı iletisim.html'e eklemen gerekiyor önce:
// <script src="https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js"></script>
async function submitViaEmailJS(form) {
  if (typeof emailjs === 'undefined') {
    console.warn('[EmailJS] SDK yüklü değil. HTML dosyasına script tag ekle.');
    console.log('[DEV] Gönderilecek veri:', buildPayload(form));
    return;
  }
  const cfg = APP_CONFIG.form.emailjs;
  const p   = buildPayload(form);
  return emailjs.send(cfg.serviceId, cfg.templateId, {
    from_name:  `${p.firstName} ${p.lastName}`,
    from_email: p.email,
    from_phone: p.phone,
    service:    p.service,
    date:       p.date,
    time:       p.time,
    message:    p.message,
    reply_to:   p.email, // cevap doğrudan müşteriye gidebilsin
  });
}


// ─── PAYLOAD ─────────────────────────────────────────────────────────────────
function buildPayload(form) {
  const f = form.elements;
  // her alan sanitize ediliyor - zaten validate ettik ama double-check zarar vermez
  return {
    firstName: sanitize(f.firstName?.value ?? ''),
    lastName:  sanitize(f.lastName?.value  ?? ''),
    phone:     sanitize(f.phone?.value     ?? ''),
    email:     sanitize(f.email?.value     ?? ''),
    service:   sanitize(f.service?.value   ?? ''),
    date:      sanitize(f.apptDate?.value  ?? ''),
    time:      sanitize(f.apptTime?.value  ?? ''),
    message:   sanitize(f.message?.value   ?? ''),
    salon:     APP_CONFIG.salon.name,
    timestamp: new Date().toISOString(), // hangi saat geldiği logda görünsün
  };
}


// ─── UI YARDIMCILARI ─────────────────────────────────────────────────────────
function setLoading(btn, on) {
  if (!btn) return;
  btn.classList.toggle('loading', on);
  btn.disabled = on; // çift submit'i engelle
}

function showError(form, msg) {
  // varsa mevcut hata elementini bul, yoksa yarat
  let el = form.querySelector('.global-form-err');
  if (!el) {
    el = document.createElement('p');
    el.className = 'global-form-err form-error';
    el.style.cssText = 'margin-top:.5rem; font-size:.85rem;';
    form.appendChild(el);
  }
  // ÖNEMLI: innerHTML değil textContent - kullanıcı verisi burada olmasa da alışkanlık
  el.textContent = msg;
  setTimeout(() => el.remove(), 7000);
}
