// config.js — statik site için .env alternatifi
//
// Normalde API key gibi şeyler .env'de tutulur ve build aşamasında inject edilir.
// Ama burada build tool yok (Vite, Parcel vs.) - pure static.
// Bu yüzden config burada. ÖNEMLI notlar:
//
//   - Bu dosyayı Git'e commit etmeden önce gerçek key'leri koy
//   - Ama aslında EmailJS public key zaten frontend'de görünür, sorun yok
//   - Formspree endpoint de public - sadece kötüye kullanım riski var (spam)
//   - Gerçek gizli veri (DB şifresi vs.) asla burada olmamalı
//
// Üretim için daha iyi bir yol: Netlify Functions veya Vercel Edge ile
// key'leri server-side'a taşımak. Şimdilik bu yeterli.

const APP_CONFIG = Object.freeze({

  // ── Salon bilgileri ──────────────────────────────────────────────────────────
  // footer, iletişim sayfası ve form payload'ı buradan okuyor
  salon: {
    name:         'The Brush Art Hair Studio',
    phone:        '05368674601',           // href'te kullanmak için (tel: link)
    phoneDisplay: '0536 867 46 01',        // görünür format
    email:        'info@thebrusharths.com',
    address:      'Cihannüma, Abbasağa Sokağı No:8/A, 34022 Beşiktaş/İstanbul',
    instagram:    'https://instagram.com/thebrusharths',
    tiktok:       '#',
    hours:        'Pzt–Cmt: 09:00–20:00',
  },

  // ── Slider ayarları ──────────────────────────────────────────────────────────
  // yeni fotoğraf ekleyince buraya da ekle.
  // caption'lar slider'da ve galeri sayfasında kullanılıyor.
  // dosya bulunamazsa tarayıcı broken image gösterir - isim yazımına dikkat
  slider: {
    folder: 'kuaför resimleri/', // klasör adında boşluk var, URL'de sorun çıkarmaz ama dikkatli ol

    images: [
      { file: '1.jpg', caption: 'Profesyonel Balayage',  sub: 'Renk & Işıltı'        },
      { file: '2.jpg', caption: 'Saç Şekillendirme',     sub: 'Stil & Tasarım'        },
      { file: '3.jpg', caption: 'Renk Uygulaması',       sub: 'Boyama & Teknikler'    },
      { file: '4.jpg', caption: 'Premium Bakım',         sub: 'Keratin & Nem'         },
      { file: '5.jpg', caption: 'Saç Kesimi',            sub: 'Kesim & Şekillendirme' },
      { file: '6.jpg', caption: 'Özel Fön',              sub: 'Blowdry & Hacim'       },
      { file: '7.jpg', caption: 'Maşa & Topuz',          sub: 'Özel Gün Stili'        },
      { file: '8.jpg', caption: 'Gelin Hazırlığı',       sub: 'Gelin & Davet'         },
    ],

    autoplay: true,
    interval: 4500, // ms - 4.5 saniye, çok hızlı = sinir bozucu, çok yavaş = can sıkıcı
  },

  // ── Form / Randevu gönderimi ──────────────────────────────────────────────────
  //
  // Seçenek A — Formspree (önerilen, kolay kurulum):
  //   1. formspree.io → ücretsiz hesap aç
  //   2. "New Form" → isim ver → endpoint'i kopyala
  //      (örn: https://formspree.io/f/xpznkvwo)
  //   3. Aşağıdaki formspreeEndpoint'e yapıştır
  //   4. iletisim.html'deki <form action="..."> kısmını da güncelle
  //   → Artık her randevu direkt e-postana düşer, dashboard'dan da görürsün
  //
  // Seçenek B — EmailJS:
  //   1. emailjs.com → ücretsiz hesap → Email Service bağla (Gmail vs.)
  //   2. Template oluştur, {{from_name}} gibi değişkenler kullan
  //   3. useEmailJS: true yap, aşağıdaki key'leri doldur
  //   4. iletisim.html'e SDK script tag'ini ekle (yorum satırı olarak var)
  //
  form: {
    formspreeEndpoint: '__FORMSPREE_ENDPOINT__', // buraya endpoint gelecek
    useEmailJS: false,
    emailjs: {
      publicKey:  '__EMAILJS_PUBLIC_KEY__',
      serviceId:  '__EMAILJS_SERVICE_ID__',
      templateId: '__EMAILJS_TEMPLATE_ID__',
    },
  },

  // ── Feature flag'leri ────────────────────────────────────────────────────────
  // test için veya eski cihaz performans sorunlarında false yapılabilir
  features: {
    counterAnimation: true, // hero'daki rakam animasyonu
    scrollReveal:     true, // scroll'da elementlerin fade-in olması
  },

});
