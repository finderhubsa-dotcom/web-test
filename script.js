/* ========================================
   FINDER — script.js
   ======================================== */

// ----- Staff login banner -----
const staffBanner = document.getElementById('staffBanner');
const staffBannerClose = document.getElementById('staffBannerClose');
const STAFF_BANNER_KEY = 'finderStaffBannerDismissed';

function applyStaffBannerOffset() {
  if (!staffBanner) return;
  if (staffBanner.hidden) {
    document.documentElement.style.setProperty('--banner-height', '0px');
    document.body.classList.remove('has-staff-banner');
  } else {
    document.documentElement.style.setProperty('--banner-height', `${staffBanner.offsetHeight}px`);
    document.body.classList.add('has-staff-banner');
  }
}

if (staffBanner) {
  if (sessionStorage.getItem(STAFF_BANNER_KEY) === '1') {
    staffBanner.hidden = true;
  }
  applyStaffBannerOffset();
  window.addEventListener('resize', applyStaffBannerOffset);

  staffBannerClose.addEventListener('click', () => {
    staffBanner.hidden = true;
    sessionStorage.setItem(STAFF_BANNER_KEY, '1');
    applyStaffBannerOffset();
  });
}

// ----- Navbar scroll effect -----
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 30);
});

// ----- Mobile burger menu -----
const burger = document.getElementById('burger');
const navLinks = document.getElementById('navLinks');

burger.addEventListener('click', () => {
  navLinks.classList.toggle('open');
  // Animate burger lines
  const spans = burger.querySelectorAll('span');
  const isOpen = navLinks.classList.contains('open');
  if (isOpen) {
    spans[0].style.transform = 'translateY(7px) rotate(45deg)';
    spans[1].style.opacity = '0';
    spans[2].style.transform = 'translateY(-7px) rotate(-45deg)';
  } else {
    spans[0].style.transform = '';
    spans[1].style.opacity = '';
    spans[2].style.transform = '';
  }
});

// Close menu when a nav link is clicked
navLinks.querySelectorAll('.nav__link').forEach(link => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('open');
    burger.querySelectorAll('span').forEach(s => {
      s.style.transform = '';
      s.style.opacity = '';
    });
  });
});

// ----- Active nav link on scroll -----
const sections = document.querySelectorAll('section[id], footer[id]');
const links = document.querySelectorAll('.nav__link');

const observerOptions = {
  root: null,
  rootMargin: '-40% 0px -55% 0px',
  threshold: 0
};

const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      links.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${entry.target.id}`) {
          link.classList.add('active');
        }
      });
    }
  });
}, observerOptions);

sections.forEach(section => observer.observe(section));

// ----- Scroll-reveal for cards -----
const revealEls = document.querySelectorAll(
  '.feature-item, .how__step, .app-card'
);

const revealObserver = new IntersectionObserver(
  entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12 }
);

revealEls.forEach((el, i) => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(24px)';
  el.style.transition = `opacity 0.5s ease ${i * 0.07}s, transform 0.5s ease ${i * 0.07}s`;
  revealObserver.observe(el);
});


// ----- WhatsApp link from Firebase AdminContacts -----
(async function loadWhatsApp() {
  try {
    const res = await fetch(
      'https://taxi-tracking-app-36aca-default-rtdb.firebaseio.com/AdminContacts.json'
    );
    if (!res.ok) return;
    const data = await res.json();
    if (!data) return;

    // Support either a plain string, or an object with a phone/whatsapp field
    let phone =
      typeof data === 'string'
        ? data
        : data.whatsapp || data.phone || data.number || data.phoneNumber || null;

    if (!phone) {
      // Try first value if it's a flat object
      const firstVal = Object.values(data)[0];
      if (typeof firstVal === 'string') phone = firstVal;
    }

    if (!phone) return;

    // Normalise: strip spaces, dashes, parentheses; ensure it starts with country code
    const cleaned = phone.replace(/[\s\-().]/g, '');
    const link = document.getElementById('whatsappLink');
    if (link) {
      link.href = `https://wa.me/${cleaned}`;
      link.style.display = '';
    }
  } catch (e) {
    // Silently fail — WhatsApp link just stays hidden
  }
})();

// ----- Respect reduced motion -----
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  revealEls.forEach(el => {
    el.style.opacity = '1';
    el.style.transform = 'none';
    el.style.transition = 'none';
  });
}