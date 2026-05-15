/* ============================================================
   Park N Munch — Home Page JavaScript
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  /* ---- Navbar ---- */
  const navbar  = document.querySelector('.navbar');
  const burger  = document.getElementById('navBurger');
  const mobileNav = document.getElementById('navMobile');

  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 40);
  }, { passive: true });

  burger.addEventListener('click', () => {
    burger.classList.toggle('open');
    mobileNav.classList.toggle('open');
  });

  mobileNav.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      burger.classList.remove('open');
      mobileNav.classList.remove('open');
    });
  });

  /* ---- Active nav link on scroll ---- */
  const sections = document.querySelectorAll('section[id]');
  const navLinks  = document.querySelectorAll('.nav-links a[href^="#"], .nav-mobile a[href^="#"]');

  const observeSection = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        navLinks.forEach(l => l.classList.remove('active'));
        navLinks.forEach(l => {
          if (l.getAttribute('href') === '#' + e.target.id) l.classList.add('active');
        });
      }
    });
  }, { rootMargin: '-40% 0px -55% 0px' });

  sections.forEach(s => observeSection.observe(s));

  /* ---- Build menu (home) — only runs if menu section exists in DOM ---- */
  const menuContainer = document.getElementById('menuContainer');
  const menuTabsEl    = document.getElementById('menuTabs');

  if (menuContainer && menuTabsEl) {
    let activeCategory = 'all';

    const renderMenuGrid = (category) => {
      let items;
      if (category === 'all') {
        items = MENU;
      } else {
        const mapped = VIRTUAL_CATS[category];
        items = mapped ? MENU.filter(i => mapped.includes(i.category)) : MENU.filter(i => i.category === category);
      }
      menuContainer.innerHTML = items.map(item => buildCard(item)).join('');
      menuContainer.querySelectorAll('.card-img img').forEach(img => {
        img.addEventListener('error', () => { img.classList.add('hidden'); });
      });
      menuContainer.querySelectorAll('.menu-card').forEach((c, i) => {
        c.style.opacity = '0';
        c.style.transform = 'translateY(16px)';
        setTimeout(() => {
          c.style.transition = 'opacity 0.35s ease, transform 0.35s ease';
          c.style.opacity = '1';
          c.style.transform = 'translateY(0)';
        }, i * 40);
      });
    };

    const buildCard = (item) => `
      <div class="menu-card anim">
        <div class="card-img cat-${item.category}">
          <div class="no-img">${item.emoji}</div>
          <img src="${item.image}" alt="${item.name}" loading="lazy">
          <span class="price-badge">£${item.price.toFixed(2)}</span>
        </div>
        <div class="card-body">
          <div class="card-name">${item.name}</div>
          <div class="card-desc">${item.desc}</div>
          <div class="card-foot">
            <div class="card-price">£${item.price.toFixed(2)}<small> GBP</small></div>
            <a href="order.html" class="card-action-btn">Order Now</a>
          </div>
        </div>
      </div>`;

    CATEGORIES.forEach(cat => {
      const btn = document.createElement('button');
      btn.className = 'm-tab' + (cat.id === 'all' ? ' active' : '');
      btn.dataset.cat = cat.id;
      btn.textContent = cat.label;
      btn.addEventListener('click', () => {
        menuTabsEl.querySelectorAll('.m-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeCategory = cat.id;
        renderMenuGrid(activeCategory);
      });
      menuTabsEl.appendChild(btn);
    });

    renderMenuGrid('all');
  }

  /* ---- Scroll animations (IntersectionObserver) ---- */
  const animObserver = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        animObserver.unobserve(e.target);
      }
    });
  }, { threshold: 0.12 });

  document.querySelectorAll('.anim').forEach(el => animObserver.observe(el));

  /* Re-observe after menu re-render */
  if (menuContainer) {
    const menuObs = new MutationObserver(() => {
      menuContainer.querySelectorAll('.anim:not(.in)').forEach(el => animObserver.observe(el));
    });
    menuObs.observe(menuContainer, { childList: true });
  }

  /* ---- Subtle hero parallax ---- */
  const heroBg = document.querySelector('.hero-bg');
  if (heroBg) {
    window.addEventListener('scroll', () => {
      if (window.scrollY < window.innerHeight) {
        heroBg.style.transform = `translateY(${window.scrollY * 0.3}px)`;
      }
    }, { passive: true });
  }

});
