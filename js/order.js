/* ============================================================
   Park N Munch — Order Page JavaScript
   ============================================================ */

document.addEventListener('DOMContentLoaded', async () => {

  /* ---- LOADING STATE ---- */
  const menuLoadingEl = document.getElementById('menuLoading');
  const menuErrorEl   = document.getElementById('menuError');
  const menuRetryBtn  = document.getElementById('menuRetryBtn');
  const orderGridEl   = document.getElementById('orderGrid');

  function showMenuLoading() {
    if (menuLoadingEl) menuLoadingEl.classList.remove('hidden');
    if (menuErrorEl)   menuErrorEl.classList.remove('visible');
    if (orderGridEl)   orderGridEl.style.display = 'none';
  }

  function showMenuReady() {
    if (menuLoadingEl) menuLoadingEl.classList.add('hidden');
    if (menuErrorEl)   menuErrorEl.classList.remove('visible');
    if (orderGridEl)   orderGridEl.style.display = '';
  }

  function showMenuError() {
    if (menuLoadingEl) menuLoadingEl.classList.add('hidden');
    if (menuErrorEl)   menuErrorEl.classList.add('visible');
    if (orderGridEl)   orderGridEl.style.display = 'none';
  }

  /* ── Wait for Supabase menu to load ── */
  try {
    await window.menuReady;
    if (MENU.length === 0) throw new Error('Empty menu');
    showMenuReady();
  } catch {
    showMenuError();
    // Allow retry — re-run the whole init after a fresh fetch
    if (menuRetryBtn) {
      menuRetryBtn.addEventListener('click', async () => {
        showMenuLoading();
        try {
          await window.menuReady;
          if (MENU.length === 0) throw new Error('Still empty');
          showMenuReady();
          renderOrderGrid(activeCategory);
          renderCart();
        } catch {
          showMenuError();
        }
      });
    }
    // Don't abort — keep running so cart/checkout still work if user has items
  }

  /* ---- STATE ---- */
  let cart = [];

  /* ---- NAVBAR ---- */
  const navbar    = document.querySelector('.navbar');
  const burger    = document.getElementById('navBurger');
  const mobileNav = document.getElementById('navMobile');

  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 40);
  }, { passive: true });

  if (burger) {
    burger.addEventListener('click', () => {
      burger.classList.toggle('open');
      mobileNav.classList.toggle('open');
    });
    mobileNav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      burger.classList.remove('open');
      mobileNav.classList.remove('open');
    }));
  }

  /* ---- HELPERS ---- */
  function filterItems(category) {
    if (category === 'all')     return MENU;
    if (category === 'popular') return POPULAR_IDS.map(id => MENU.find(m => m.id === id)).filter(Boolean);
    const mapped = VIRTUAL_CATS[category];
    if (mapped) return MENU.filter(i => mapped.includes(i.category));
    return MENU.filter(i => i.category === category);
  }

  function makeCartKey(item, customisation) {
    if (!customisation) return `${item.id}_plain`;
    if (customisation.drink) return `${item.id}_${customisation.drink}`;
    const addonStr = (customisation.addons || []).map(a => a.id).sort().join(',');
    const styleStr = customisation.style || 'plain';
    return `${item.id}_${styleStr}_${addonStr}_${customisation.meal || ''}`;
  }

  function entryPrice(entry) {
    const base = entry.item.price;
    if (!entry.customisation) return base;
    const addons = (entry.customisation.addons || []).reduce((s, a) => s + a.price, 0);
    const meal   = entry.customisation.meal ? MEAL_UPGRADE_PRICE : 0;
    return base + addons + meal;
  }

  function buildCustomLines(customisation) {
    if (!customisation) return '';
    if (customisation.drink) return '';
    if (customisation.garage) {
      return customisation.garage.map(sel =>
        `<div class="ci-custom-line">${sel.qty > 1 ? sel.qty + '× ' : ''}${sel.item.name}${sel.style ? ` <span class="cc-tag">${sel.style}</span>` : ''}</div>`
      ).join('');
    }
    const lines = [];
    if (customisation.style) {
      lines.push(`<div class="ci-custom-line"><span class="cc-tag">${customisation.style}</span></div>`);
    }
    if (customisation.addons && customisation.addons.length) {
      lines.push(`<div class="ci-custom-line">+ ${customisation.addons.map(a => a.name).join(', ')}</div>`);
    }
    if (customisation.meal) {
      lines.push(`<div class="ci-custom-line">Meal · ${customisation.meal}</div>`);
    }
    return lines.join('');
  }

  function buildItemName(entry) {
    const { item, customisation } = entry;
    if (!customisation) return item.name;
    if (customisation.drink)  return `${item.name} - ${customisation.drink}`;
    if (customisation.garage) {
      const parts = customisation.garage.map(s =>
        `${s.qty > 1 ? s.qty + '× ' : ''}${s.item.name}${s.style ? ` (${s.style})` : ''}`
      );
      return `${item.name}: ${parts.join(', ')}`;
    }
    const parts = [];
    if (customisation.style)          parts.push(customisation.style);
    if (customisation.addons?.length) parts.push(customisation.addons.map(a => a.name).join(', '));
    if (customisation.meal)           parts.push(`Meal: ${customisation.meal}`);
    return parts.length ? `${item.name} (${parts.join(' · ')})` : item.name;
  }

  /* ---- BUILD MENU GRID ---- */
  const orderGrid = document.getElementById('orderGrid');
  const orderTabs = document.getElementById('orderTabs');
  let activeCategory = 'all';

  function buildOrderCard(item) {
    return `
      <div class="menu-card" data-id="${item.id}">
        <div class="card-img cat-${item.category}">
          <div class="no-img">${item.emoji}</div>
          <img src="${item.image}" alt="${item.name}" loading="lazy">
          <span class="price-badge">£${item.price.toFixed(2)}</span>
        </div>
        <div class="card-body">
          <div class="card-name">${item.name}</div>
          <div class="card-desc">${item.desc}</div>
          <button class="add-btn" data-id="${item.id}">
            <span>+</span> Add to Cart
          </button>
        </div>
      </div>`;
  }

  function renderOrderGrid(category) {
    const items = filterItems(category);
    orderGrid.innerHTML = items.map(buildOrderCard).join('');

    orderGrid.querySelectorAll('.card-img img').forEach(img => {
      img.addEventListener('error', () => img.classList.add('hidden'));
    });

    orderGrid.querySelectorAll('.menu-card').forEach((c, i) => {
      c.style.opacity   = '0';
      c.style.transform = 'translateY(12px)';
      setTimeout(() => {
        c.style.transition = 'opacity 0.28s ease, transform 0.28s ease';
        c.style.opacity    = '1';
        c.style.transform  = 'translateY(0)';
      }, i * 30);
    });

    orderGrid.querySelectorAll('.add-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id   = btn.dataset.id;
        const item = MENU.find(m => m.id === id);
        if (!item) return;
        if (item.category === 'burgers') {
          openBurgerModal(item);
        } else if (item.isGarage) {
          openGarageModal();
        } else if (item.hasDrinkChoice) {
          openCansModal(item);
        } else {
          addToCart(item, null, btn);
        }
      });
    });

    updateAddButtons();
  }

  // Build tabs
  CATEGORIES.forEach(cat => {
    const btn = document.createElement('button');
    btn.className   = 'o-tab' + (cat.id === activeCategory ? ' active' : '');
    btn.dataset.cat = cat.id;
    btn.innerHTML   = `${cat.emoji} ${cat.label}`;
    btn.addEventListener('click', () => {
      orderTabs.querySelectorAll('.o-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeCategory = cat.id;
      renderOrderGrid(activeCategory);
    });
    orderTabs.appendChild(btn);
  });

  // URL param routing — jump straight to a category
  const urlParams = new URLSearchParams(window.location.search);
  const paramCat  = urlParams.get('category');
  if (paramCat && CATEGORIES.find(c => c.id === paramCat)) {
    activeCategory = paramCat;
    const targetBtn = orderTabs.querySelector(`[data-cat="${paramCat}"]`);
    if (targetBtn) {
      orderTabs.querySelector('.o-tab.active')?.classList.remove('active');
      targetBtn.classList.add('active');
    }
  }

  renderOrderGrid(activeCategory);

  /* ---- CART CORE ---- */
  function addToCart(item, customisation, btn, note = '') {
    const cartKey  = makeCartKey(item, customisation);
    const existing = cart.find(c => c.cartKey === cartKey);
    if (existing) {
      existing.qty++;
    } else {
      cart.push({ item, qty: 1, cartKey, customisation, note });
    }
    if (btn) {
      btn.classList.add('added');
      btn.innerHTML = '<span>✓</span> Added!';
      setTimeout(() => {
        btn.classList.remove('added');
        btn.innerHTML = '<span>+</span> Add to Cart';
        updateAddButtons();
      }, 1100);
    }
    const toastLabel = (customisation && customisation.drink)
      ? `${item.name} - ${customisation.drink}`
      : item.name;
    showToast(toastLabel);
    renderCart();
  }

  function removeFromCart(cartKey) {
    cart = cart.filter(c => c.cartKey !== cartKey);
    renderCart();
    updateAddButtons();
  }

  function changeQty(cartKey, delta) {
    const entry = cart.find(c => c.cartKey === cartKey);
    if (!entry) return;
    entry.qty += delta;
    if (entry.qty <= 0) removeFromCart(cartKey);
    else renderCart();
  }

  function getTotal()      { return cart.reduce((s, e) => s + entryPrice(e) * e.qty, 0); }
  function getTotalItems() { return cart.reduce((s, c) => s + c.qty, 0); }

  function renderCart() {
    const csItems         = document.getElementById('csItems');
    const csEmpty         = document.getElementById('csEmpty');
    const csCountBadge    = document.getElementById('csCountBadge');
    const summarySubtotal = document.getElementById('summarySubtotal');
    const summaryTotal    = document.getElementById('summaryTotal');
    const checkoutBtnEl   = document.getElementById('checkoutBtn');

    const totalItems = getTotalItems();
    const total      = getTotal();

    if (csCountBadge)    csCountBadge.textContent   = totalItems;
    if (summarySubtotal) summarySubtotal.textContent = '£' + total.toFixed(2);
    if (summaryTotal)    summaryTotal.textContent    = '£' + total.toFixed(2);
    if (checkoutBtnEl)   checkoutBtnEl.disabled      = cart.length === 0;

    if (cart.length === 0) {
      if (csEmpty) csEmpty.style.display = 'flex';
      if (csItems) { csItems.innerHTML = ''; csItems.style.display = 'none'; }
      updateOrderSummaryMini();
      updateStickyCart();
      return;
    }

    if (csEmpty) csEmpty.style.display = 'none';
    if (csItems) csItems.style.display = 'flex';

    csItems.innerHTML = cart.map(entry => {
      const { item, qty, cartKey, customisation } = entry;
      const lineTotal    = entryPrice(entry) * qty;
      const customLines  = buildCustomLines(customisation);
      const displayName  = (customisation && customisation.drink)
        ? `${item.name} - ${customisation.drink}`
        : item.name;
      return `
        <div class="cart-item">
          <div class="ci-img">
            <img src="${item.image}" alt="${displayName}"
                 onerror="this.classList.add('hidden');this.nextElementSibling.style.display='block'"
                 loading="lazy">
            <span style="display:none;font-size:1.5rem">${item.emoji}</span>
          </div>
          <div class="ci-details">
            <div class="ci-name">${displayName}</div>
            ${customLines ? `<div class="ci-customs">${customLines}</div>` : ''}
            <div class="ci-price">£${lineTotal.toFixed(2)}</div>
            <div class="ci-controls">
              <button class="qty-btn" data-action="dec" data-key="${cartKey}">−</button>
              <span class="qty-val">${qty}</span>
              <button class="qty-btn" data-action="inc" data-key="${cartKey}">+</button>
              <button class="ci-remove" data-key="${cartKey}" title="Remove">✕</button>
            </div>
            <div class="ci-note-wrap">
              <textarea class="ci-note-input" data-key="${cartKey}"
                placeholder="Add a note (e.g. no onions, extra sauce)" rows="1">${entry.note || ''}</textarea>
            </div>
          </div>
        </div>`;
    }).join('');

    csItems.querySelectorAll('.qty-btn').forEach(b => {
      b.addEventListener('click', () => changeQty(b.dataset.key, b.dataset.action === 'inc' ? 1 : -1));
    });
    csItems.querySelectorAll('.ci-remove').forEach(b => {
      b.addEventListener('click', () => removeFromCart(b.dataset.key));
    });
    csItems.querySelectorAll('.ci-note-input').forEach(ta => {
      const entry = cart.find(c => c.cartKey === ta.dataset.key);
      ta.addEventListener('input', () => { if (entry) entry.note = ta.value; });
      ta.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) e.preventDefault(); });
    });

    updateOrderSummaryMini();
    updateStickyCart();
  }

  function updateAddButtons() {
    document.querySelectorAll('.add-btn').forEach(btn => {
      const id   = btn.dataset.id;
      const item = MENU.find(m => m.id === id);
      if (!item || item.category === 'burgers' || item.isGarage || item.hasDrinkChoice) {
        btn.innerHTML = '<span>+</span> Add to Cart';
        btn.classList.remove('added');
        return;
      }
      const inCartQty = cart.filter(c => c.item.id === id).reduce((s, c) => s + c.qty, 0);
      if (inCartQty > 0) {
        btn.innerHTML = `<span>✓</span> In Cart (${inCartQty})`;
        btn.classList.add('added');
      } else {
        btn.innerHTML = '<span>+</span> Add to Cart';
        btn.classList.remove('added');
      }
    });
  }

  /* ---- BURGER CUSTOMISATION MODAL ---- */
  const burgerModalOverlay = document.getElementById('burgerModalOverlay');
  let modalItem = null;

  function updateModalPrice() {
    if (!modalItem) return;
    let price = modalItem.price;
    burgerModalOverlay.querySelectorAll('.bm-addon-cb:checked').forEach(cb => {
      const addon = BURGER_ADDONS.find(a => a.id === cb.dataset.addonId);
      if (addon) price += addon.price;
    });
    const mealToggle = document.getElementById('bmMealToggle');
    if (mealToggle && mealToggle.checked) price += MEAL_UPGRADE_PRICE;
    document.getElementById('bmCurrentPrice').textContent = '£' + price.toFixed(2);
  }

  function openBurgerModal(item) {
    modalItem = item;

    document.getElementById('bmItemName').textContent  = item.name;
    document.getElementById('bmItemDesc').textContent  = item.desc;
    document.getElementById('bmBasePrice').textContent = '£' + item.price.toFixed(2);

    // Show style section only for RS3 / RS5
    const styleSection = document.getElementById('bmStyleSection');
    if (styleSection) styleSection.style.display = item.hasStyle ? '' : 'none';

    // Reset style selection
    burgerModalOverlay.querySelectorAll('input[name="bmStyle"]').forEach(r => r.checked = false);
    // Reset addon checkboxes
    burgerModalOverlay.querySelectorAll('.bm-addon-cb').forEach(c => c.checked = false);
    // Reset meal toggle
    const mealToggle = document.getElementById('bmMealToggle');
    mealToggle.checked = false;
    document.getElementById('bmDrinksWrap').classList.remove('visible');
    document.getElementById('bmMealRow').classList.remove('active');
    // Re-select first drink as default
    const firstDrink = burgerModalOverlay.querySelector('input[name="bmDrink"]');
    if (firstDrink) firstDrink.checked = true;

    // Clear errors and note
    document.getElementById('bmStyleError').classList.remove('show');
    document.getElementById('bmDrinkError').classList.remove('show');
    const bmNoteEl = document.getElementById('bmNote');
    if (bmNoteEl) bmNoteEl.value = '';

    updateModalPrice();
    burgerModalOverlay.classList.add('open');
    document.body.classList.add('modal-active');
    document.body.style.overflow = 'hidden';
  }

  function closeBurgerModal() {
    burgerModalOverlay.classList.remove('open');
    document.body.classList.remove('modal-active');
    document.body.style.overflow = '';
    modalItem = null;
  }

  if (burgerModalOverlay) {
    // Build drink options once
    const drinksList = document.getElementById('bmDrinksList');
    drinksList.innerHTML = MEAL_DRINKS.map((d, i) => `
      <label class="bm-drink-row">
        <input type="radio" name="bmDrink" value="${d}" ${i === 0 ? 'checked' : ''}>
        ${d}
      </label>`).join('');

    // Close on backdrop click
    burgerModalOverlay.addEventListener('click', e => {
      if (e.target === burgerModalOverlay) closeBurgerModal();
    });

    document.getElementById('bmClose').addEventListener('click', closeBurgerModal);

    // Style radio change
    burgerModalOverlay.querySelectorAll('.bm-style-radio').forEach(r => {
      r.addEventListener('change', () => {
        document.getElementById('bmStyleError').classList.remove('show');
        updateModalPrice();
      });
    });

    // Addon checkbox change
    burgerModalOverlay.querySelectorAll('.bm-addon-cb').forEach(cb => {
      cb.addEventListener('change', updateModalPrice);
    });

    // Meal toggle
    const mealToggle  = document.getElementById('bmMealToggle');
    const mealRow     = document.getElementById('bmMealRow');
    const drinksWrap  = document.getElementById('bmDrinksWrap');

    mealToggle.addEventListener('change', () => {
      drinksWrap.classList.toggle('visible', mealToggle.checked);
      mealRow.classList.toggle('active', mealToggle.checked);
      document.getElementById('bmDrinkError').classList.remove('show');
      updateModalPrice();
    });

    // Submit
    document.getElementById('bmSubmit').addEventListener('click', () => {
      // Style is only required for RS3 / RS5
      const styleInput = burgerModalOverlay.querySelector('.bm-style-radio:checked');
      if (modalItem && modalItem.hasStyle && !styleInput) {
        document.getElementById('bmStyleError').classList.add('show');
        return;
      }

      const mealOn     = mealToggle.checked;
      const drinkInput = burgerModalOverlay.querySelector('input[name="bmDrink"]:checked');
      if (mealOn && !drinkInput) {
        document.getElementById('bmDrinkError').classList.add('show');
        return;
      }

      const checkedAddons = [...burgerModalOverlay.querySelectorAll('.bm-addon-cb:checked')]
        .map(cb => BURGER_ADDONS.find(a => a.id === cb.dataset.addonId))
        .filter(Boolean);

      const customisation = {
        style:  styleInput ? styleInput.value : null,
        addons: checkedAddons,
        meal:   mealOn ? drinkInput.value : null,
      };

      const note = (document.getElementById('bmNote')?.value || '').trim();
      addToCart(modalItem, customisation, null, note);
      closeBurgerModal();
    });
  }

  /* ---- MY GARAGE MODAL ---- */
  const garageOverlay = document.getElementById('garageOverlay');
  let garageSelection = []; // [{ item, qty, style }]

  function garageTotal() {
    return garageSelection.reduce((s, e) => s + e.qty, 0);
  }

  function openGarageModal() {
    garageSelection = [];
    renderGarageBody();
    garageOverlay.classList.add('open');
    document.body.classList.add('modal-active');
    document.body.style.overflow = 'hidden';
  }

  function closeGarageModal() {
    garageOverlay.classList.remove('open');
    document.body.classList.remove('modal-active');
    document.body.style.overflow = '';
  }

  function renderGarageBody() {
    const burgers  = MENU.filter(m => m.category === 'burgers');
    const total    = garageTotal();
    const gmCount  = document.getElementById('gmCount');
    const gmSubmit = document.getElementById('gmSubmit');
    const gmError  = document.getElementById('gmError');

    if (gmCount)  gmCount.textContent = total;
    if (gmSubmit) gmSubmit.disabled   = total !== 3;
    if (gmError)  gmError.style.visibility = total === 3 ? 'hidden' : 'visible';

    const gmBody = document.getElementById('gmBody');
    if (!gmBody) return;

    gmBody.innerHTML = burgers.map(burger => {
      const sel   = garageSelection.find(s => s.item.id === burger.id);
      const qty   = sel ? sel.qty : 0;
      const style = sel ? sel.style : null;

      return `
        <div class="gm-card${qty > 0 ? ' selected' : ''}" data-id="${burger.id}">
          <div class="gm-card-img">
            <img src="${burger.image}" alt="${burger.name}" loading="lazy"
                 onerror="this.classList.add('hidden')">
          </div>
          <div class="gm-card-info">
            <div class="gm-card-name">${burger.name}</div>
            <div class="gm-card-price">£${burger.price.toFixed(2)}</div>
            ${burger.hasStyle && qty > 0 ? `
              <div class="gm-style-row">
                <label class="gm-style-opt">
                  <input type="radio" name="gm-style-${burger.id}" value="Normal" ${style !== 'Spicy' ? 'checked' : ''}>
                  Normal
                </label>
                <label class="gm-style-opt">
                  <input type="radio" name="gm-style-${burger.id}" value="Spicy" ${style === 'Spicy' ? 'checked' : ''}>
                  Spicy
                </label>
              </div>` : ''}
          </div>
          <div class="gm-card-controls">
            <button class="gm-qty-btn gm-dec" data-id="${burger.id}"${qty === 0 ? ' disabled' : ''}>−</button>
            <span class="gm-qty-val">${qty}</span>
            <button class="gm-qty-btn gm-inc" data-id="${burger.id}"${total >= 3 && qty === 0 ? ' disabled' : ''}>+</button>
          </div>
        </div>`;
    }).join('');

    gmBody.querySelectorAll('.gm-inc').forEach(btn => {
      btn.addEventListener('click', () => {
        if (garageTotal() >= 3) return;
        const id   = btn.dataset.id;
        const item = MENU.find(m => m.id === id);
        const sel  = garageSelection.find(s => s.item.id === id);
        if (sel) { sel.qty++; } else { garageSelection.push({ item, qty: 1, style: item.hasStyle ? 'Normal' : null }); }
        renderGarageBody();
      });
    });

    gmBody.querySelectorAll('.gm-dec').forEach(btn => {
      btn.addEventListener('click', () => {
        const id  = btn.dataset.id;
        const sel = garageSelection.find(s => s.item.id === id);
        if (!sel) return;
        sel.qty--;
        if (sel.qty <= 0) garageSelection = garageSelection.filter(s => s.item.id !== id);
        renderGarageBody();
      });
    });

    gmBody.querySelectorAll('input[type="radio"]').forEach(radio => {
      radio.addEventListener('change', () => {
        const id  = radio.name.replace('gm-style-', '');
        const sel = garageSelection.find(s => s.item.id === id);
        if (sel) sel.style = radio.value;
      });
    });
  }

  if (garageOverlay) {
    garageOverlay.addEventListener('click', e => { if (e.target === garageOverlay) closeGarageModal(); });
    document.getElementById('gmClose').addEventListener('click', closeGarageModal);
    document.getElementById('gmSubmit').addEventListener('click', () => {
      if (garageTotal() !== 3) return;
      const garageItem    = MENU.find(m => m.isGarage);
      const customisation = { garage: garageSelection.map(s => ({ item: s.item, qty: s.qty, style: s.style })) };
      addToCart(garageItem, customisation, null);
      closeGarageModal();
    });
  }

  /* ---- CHECKOUT VIEW ---- */
  const cvCheckout  = document.getElementById('cvCheckout');
  const checkoutBtn = document.getElementById('checkoutBtn');
  const cpBack      = document.getElementById('cpBack');

  function openCheckout() {
    cvCheckout.classList.add('open');
    updateOrderSummaryMini();
    cvCheckout.querySelector('.cv-checkout-body').scrollTop = 0;
  }

  function closeCheckout() {
    cvCheckout.classList.remove('open');
  }

  if (checkoutBtn) checkoutBtn.addEventListener('click', () => { if (cart.length > 0) openUpsellModal(); });
  if (cpBack)      cpBack.addEventListener('click', closeCheckout);

  /* ---- UPSELL MODAL ---- */
  const UPSELL_CATS    = ['milkshakes', 'cakes'];
  const upsellOverlay  = document.getElementById('upsellOverlay');
  const umItemsEl      = document.getElementById('umItems');
  const umContinueBtn  = document.getElementById('umContinue');
  const umCloseBtn     = document.getElementById('umClose');

  function openUpsellModal() {
    const suggestions = MENU
      .filter(item => UPSELL_CATS.includes(item.category) && !cart.some(e => e.item.id === item.id));

    if (!suggestions.length) { openCheckout(); return; }

    umItemsEl.innerHTML = suggestions.map(item => {
      const premium = item.category === 'milkshakes' || item.category === 'cakes';
      return `
      <div class="um-item${premium ? ' um-item--premium' : ''}" data-id="${item.id}" role="button" tabindex="0" aria-label="Add ${item.name}">
        <div class="um-item-thumb">
          <img src="${item.image}" alt="${item.name}" loading="lazy"
               onerror="this.parentElement.innerHTML='<span class=\\'um-emoji-fb\\'>${item.emoji}</span>'">
        </div>
        <div class="um-item-name">${item.name}</div>
        <div class="um-item-price">£${item.price.toFixed(2)}</div>
        <div class="um-add-icon" aria-hidden="true">+</div>
      </div>`;
    }).join('');

    umItemsEl.querySelectorAll('.um-item').forEach(card => {
      const addFn = () => {
        if (card.classList.contains('added')) return;
        const id   = card.dataset.id;
        const item = MENU.find(m => m.id === id);
        if (!item) return;
        if (item.hasDrinkChoice) {
          closeUpsellModal();
          openCansModal(item);
          return;
        }
        addToCart(item, null, null);
        card.classList.add('added');
        const icon = card.querySelector('.um-add-icon');
        if (icon) icon.textContent = '✓';
      };
      card.addEventListener('click', addFn);
      card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); addFn(); } });
    });

    upsellOverlay.classList.add('open');
    document.body.classList.add('modal-active');
    document.body.style.overflow = 'hidden';
  }

  function closeUpsellModal() {
    upsellOverlay.classList.remove('open');
    document.body.classList.remove('modal-active');
    document.body.style.overflow = '';
  }

  if (upsellOverlay) {
    upsellOverlay.addEventListener('click', e => { if (e.target === upsellOverlay) closeUpsellModal(); });
  }
  if (umCloseBtn)    umCloseBtn.addEventListener('click', closeUpsellModal);
  if (umContinueBtn) umContinueBtn.addEventListener('click', () => { closeUpsellModal(); openCheckout(); });

  function updateOrderSummaryMini() {
    const osm      = document.getElementById('osMiniItems');
    const osmTotal = document.getElementById('osMiniTotal');
    if (!osm) return;
    osm.innerHTML = cart.map(entry =>
      `<div class="osm-item">
        <span class="osm-n">${entry.item.name} × ${entry.qty}</span>
        <span class="osm-p">£${(entryPrice(entry) * entry.qty).toFixed(2)}</span>
      </div>`
    ).join('');
    if (osmTotal) osmTotal.textContent = '£' + getTotal().toFixed(2);
  }

  /* ---- FORM VALIDATION & SUBMISSION ---- */
  const checkoutForm   = document.getElementById('checkoutForm');
  const regInput       = document.getElementById('carReg');
  const nameInput      = document.getElementById('custName');
  const phoneInput     = document.getElementById('custPhone');
  const regError       = document.getElementById('regError');
  const nameError      = document.getElementById('nameError');
  const phoneError     = document.getElementById('phoneError');
  const successOverlay = document.getElementById('successOverlay');
  const scClose        = document.getElementById('scClose');
  const scRegDisplay   = document.getElementById('scRegDisplay');

  function sanitiseText(val) {
    return (val || '').replace(/<[^>]*>/g, '').trim();
  }

  function isValidUKPhone(val) {
    const digits = val.replace(/[\s\-\(\)]/g, '');
    return /^(0\d{9,10}|\+44\d{9,10})$/.test(digits);
  }

  if (regInput) {
    regInput.addEventListener('input', () => {
      regInput.value = regInput.value.toUpperCase();
      regInput.classList.remove('error');
      regError.classList.remove('show');
    });
  }

  if (nameInput) {
    nameInput.addEventListener('input', () => {
      nameInput.classList.remove('error');
      nameError.classList.remove('show');
    });
  }

  if (phoneInput) {
    phoneInput.addEventListener('input', () => {
      // Strip everything except digits and a leading +
      const raw = phoneInput.value;
      const clean = raw.startsWith('+')
        ? '+' + raw.slice(1).replace(/\D/g, '')
        : raw.replace(/\D/g, '');
      phoneInput.value = clean;
      phoneInput.classList.remove('error');
      phoneError.classList.remove('show');
    });
  }

  if (checkoutForm) {
    checkoutForm.addEventListener('submit', e => {
      e.preventDefault();
      let valid = true;

      const nameVal = sanitiseText(nameInput.value);
      if (nameVal.length < 2) {
        nameInput.classList.add('error');
        nameError.textContent = nameVal.length === 0
          ? 'Name is required'
          : 'Name must be at least 2 characters';
        nameError.classList.add('show');
        valid = false;
      } else {
        nameInput.classList.remove('error');
        nameError.classList.remove('show');
      }

      const phoneVal = phoneInput.value.trim();
      if (!phoneVal) {
        phoneInput.classList.add('error');
        phoneError.textContent = 'Phone number is required';
        phoneError.classList.add('show');
        valid = false;
      } else if (!isValidUKPhone(phoneVal)) {
        phoneInput.classList.add('error');
        phoneError.textContent = 'Enter a valid UK number (e.g. 07700 900000)';
        phoneError.classList.add('show');
        valid = false;
      } else {
        phoneInput.classList.remove('error');
        phoneError.classList.remove('show');
      }

      const regVal = regInput.value.trim().toUpperCase();
      if (regVal.replace(/\s/g, '').length < 2) {
        regInput.classList.add('error');
        regError.textContent = regVal.length === 0
          ? 'Car registration is required'
          : 'Enter a valid registration';
        regError.classList.add('show');
        regInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        valid = false;
      } else {
        regInput.classList.remove('error');
        regError.classList.remove('show');
      }

      if (!valid || cart.length === 0) return;
      redirectToStripe(nameVal, phoneVal, regVal);
    });
  }

  async function redirectToStripe(name, phone, reg) {
    const submitBtn  = checkoutForm.querySelector('.form-submit');
    const stripeErr  = document.getElementById('stripeError');
    const original   = submitBtn.innerHTML;

    submitBtn.disabled  = true;
    submitBtn.innerHTML = 'Redirecting to payment&hellip;';
    if (stripeErr) stripeErr.textContent = '';

    try {
      const items = cart.map(entry => ({
        name:     buildItemName(entry) + (entry.note ? ` [Note: ${sanitiseText(entry.note).slice(0, 100)}]` : ''),
        price:    entryPrice(entry),
        quantity: entry.qty,
      }));

      const customer = { name, phone, carReg: reg };

      const res = await fetch('/.netlify/functions/create-checkout-session', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ items, customer }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Checkout failed');
      stripeRedirecting = true;
      window.location.href = data.url;

    } catch (err) {
      console.error('Stripe redirect error:', err);
      submitBtn.disabled  = false;
      submitBtn.innerHTML = original;
      if (stripeErr) stripeErr.textContent = 'Payment failed — please try again or contact us.';
    }
  }

  if (scClose) {
    scClose.addEventListener('click', () => successOverlay.classList.remove('open'));
  }

  if (successOverlay) {
    successOverlay.addEventListener('click', e => {
      if (e.target === successOverlay) successOverlay.classList.remove('open');
    });
  }

  /* ---- CANS DRINK SELECTION MODAL ---- */
  const cansModalOverlay = document.getElementById('cansModalOverlay');
  let cansItem = null;

  function openCansModal(item) {
    cansItem = item;
    cansModalOverlay.querySelectorAll('input[name="cmDrink"]').forEach(r => r.checked = false);
    document.getElementById('cmError').classList.remove('show');
    cansModalOverlay.classList.add('open');
    document.body.classList.add('modal-active');
    document.body.style.overflow = 'hidden';
  }

  function closeCansModal() {
    cansModalOverlay.classList.remove('open');
    document.body.classList.remove('modal-active');
    document.body.style.overflow = '';
    cansItem = null;
  }

  if (cansModalOverlay) {
    cansModalOverlay.addEventListener('click', e => {
      if (e.target === cansModalOverlay) closeCansModal();
    });

    document.getElementById('cmClose').addEventListener('click', closeCansModal);

    document.getElementById('cmSubmit').addEventListener('click', () => {
      const drinkInput = cansModalOverlay.querySelector('input[name="cmDrink"]:checked');
      if (!drinkInput) {
        document.getElementById('cmError').classList.add('show');
        return;
      }
      addToCart(cansItem, { drink: drinkInput.value }, null);
      closeCansModal();
    });
  }

  /* ---- TOAST NOTIFICATION ---- */
  const cartToast    = document.getElementById('cartToast');
  const toastMsgEl   = document.getElementById('toastMsg');
  const toastViewBtn = document.getElementById('toastViewBtn');
  let toastTimer     = null;

  function showToast(itemName) {
    if (!cartToast) return;
    if (toastMsgEl) toastMsgEl.textContent = itemName + ' added';
    cartToast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => cartToast.classList.remove('show'), 2600);
  }

  if (toastViewBtn) {
    toastViewBtn.addEventListener('click', () => {
      cartToast.classList.remove('show');
      const cartPanel = document.getElementById('cartPanel');
      if (cartPanel) cartPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  /* ---- STICKY CART BAR (mobile) ---- */
  const stickyCartBar = document.getElementById('stickyCartBar');
  const scbCountEl    = document.getElementById('scbCount');
  const scbTotalEl    = document.getElementById('scbTotal');

  function updateStickyCart() {
    if (!stickyCartBar) return;
    const items = getTotalItems();
    const total = getTotal();
    if (items > 0) {
      stickyCartBar.classList.add('visible');
      if (scbCountEl) scbCountEl.textContent = items;
      if (scbTotalEl) scbTotalEl.textContent = '£' + total.toFixed(2);
    } else {
      stickyCartBar.classList.remove('visible');
    }
  }

  if (stickyCartBar) {
    stickyCartBar.addEventListener('click', () => {
      const cartPanel = document.getElementById('cartPanel');
      if (cartPanel) cartPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    stickyCartBar.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        stickyCartBar.click();
      }
    });
  }

  /* ---- CART ABANDONMENT PROTECTION ---- */
  let stripeRedirecting  = false;
  let pendingNavigation  = null;

  const abandonOverlay = document.getElementById('abandonOverlay');
  const abandonKeepBtn = document.getElementById('abandonKeep');
  const abandonLeaveBtn = document.getElementById('abandonLeave');

  function openAbandonModal() {
    abandonOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeAbandonModal() {
    abandonOverlay.classList.remove('open');
    document.body.style.overflow = '';
    pendingNavigation = null;
  }

  if (abandonKeepBtn) abandonKeepBtn.addEventListener('click', closeAbandonModal);

  if (abandonLeaveBtn) {
    abandonLeaveBtn.addEventListener('click', () => {
      stripeRedirecting = true; // suppress beforeunload during redirect
      const dest = pendingNavigation;
      abandonOverlay.classList.remove('open');
      document.body.style.overflow = '';
      pendingNavigation = null;
      if (dest === '__BACK__') {
        window.location.href = document.referrer || 'index.html';
      } else {
        window.location.href = dest;
      }
    });
  }

  // Native protection: refresh, tab close, external navigation
  window.addEventListener('beforeunload', e => {
    if (cart.length > 0 && !stripeRedirecting) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  // Intercept internal link clicks (nav, footer, any <a>)
  document.addEventListener('click', e => {
    if (stripeRedirecting) return;
    const link = e.target.closest('a[href]');
    if (!link) return;
    const href = link.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('javascript:') ||
        href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
    if (cart.length === 0) return;
    e.preventDefault();
    pendingNavigation = href;
    openAbandonModal();
  }, true); // capture phase catches all clicks before other handlers

  // Back button protection — push state so we can intercept popstate
  history.pushState({ protected: true }, '');
  window.addEventListener('popstate', () => {
    if (cart.length > 0 && !stripeRedirecting) {
      history.pushState({ protected: true }, ''); // stay on page
      pendingNavigation = '__BACK__';
      openAbandonModal();
    }
  });

  /* ---- INITIAL RENDER ---- */
  renderCart();

  /* ---- REALTIME MENU UPDATE HANDLER ---- */
  // Called by supabase-menu.js whenever a product changes
  window.onMenuUpdate = () => {
    renderOrderGrid(activeCategory);
    updateAddButtons();
    updateStickyCart();
  };

});
