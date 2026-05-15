/* ============================================================
   Park N Munch — Dynamic Menu Loader
   Fetches products from Supabase and populates global MENU.
   Sets up realtime subscription so changes push instantly.
   ============================================================ */

(function () {
  const url = window.SUPABASE_URL;
  const key = window.SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.error('[Menu] Supabase config missing — using static fallback');
    window.menuReady = Promise.resolve();
    return;
  }

  const db = window.supabase.createClient(url, key);

  /* ── Convert a products row into the shape order.js expects ── */
  function rowToItem(p) {
    const mods = p.modifiers || {};
    return {
      id:             p.id,
      name:           p.name,
      category:       p.category,
      desc:           p.description || '',
      price:          Number(p.price),
      image:          p.image_url || '',
      emoji:          p.emoji || '🍔',
      hasStyle:       Boolean(mods.hasStyle),
      isGarage:       Boolean(mods.isGarage),
      hasDrinkChoice: Boolean(mods.hasDrinkChoice),
      popular:        Boolean(p.popular),
      sort_order:     p.sort_order || 0,
    };
  }

  /* ── Rebuild global MENU and POPULAR_IDS from fetched rows ── */
  function applyProducts(rows) {
    window.MENU = rows.map(rowToItem);
    window.POPULAR_IDS = rows
      .filter(p => p.popular)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      .map(p => p.id);
  }

  /* ── Fetch active products ──────────────────────────────── */
  async function fetchMenu() {
    const { data, error } = await db
      .from('products')
      .select('*')
      .eq('active', true)
      .order('sort_order', { ascending: true })
      .order('name',       { ascending: true });

    if (error) throw error;
    applyProducts(data || []);
  }

  /* ── Initial load — order.js awaits this ────────────────── */
  window.menuReady = fetchMenu().catch(err => {
    console.error('[Menu] Initial fetch failed:', err.message);
    // MENU stays as the empty fallback from menu-data.js
  });

  /* ── Realtime subscription — pushes changes to live page ── */
  db.channel('products-customer')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'products' },
      async () => {
        try {
          await fetchMenu();
          if (typeof window.onMenuUpdate === 'function') {
            window.onMenuUpdate();
          }
        } catch (err) {
          console.error('[Menu] Realtime refresh failed:', err.message);
        }
      }
    )
    .subscribe();
})();
