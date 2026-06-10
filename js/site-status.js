/* ============================================================
   Park N Munch — Site Status
   Fetches site_closed from Supabase settings and exposes
   window.SITE_CLOSED.  Realtime subscription pushes changes
   instantly so a page open in the browser updates live.
   ============================================================ */

(function () {
  window.SITE_CLOSED = false;

  const url = window.SUPABASE_URL;
  const key = window.SUPABASE_ANON_KEY;

  if (!url || !key) {
    window.siteStatusReady = Promise.resolve(false);
    return;
  }

  const db = window.supabase.createClient(url, key);

  window.siteStatusReady = (async function () {
    try {
      const { data } = await db
        .from('settings')
        .select('*')
        .eq('id', 'main')
        .single();
      if (data && data.site_closed != null) {
        window.SITE_CLOSED = !!data.site_closed;
      }
    } catch (e) {
      console.warn('[SiteStatus] Could not fetch settings:', e.message);
    }

    // Notify whichever page function registered for status changes
    if (typeof window.onSiteStatusChange === 'function') {
      window.onSiteStatusChange();
    }

    // Push live updates — if admin closes the site, page reacts immediately
    db.channel('site-status-customer')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'settings' },
        (payload) => {
          if (payload.new && payload.new.site_closed != null) {
            window.SITE_CLOSED = !!payload.new.site_closed;
            if (typeof window.onSiteStatusChange === 'function') {
              window.onSiteStatusChange();
            }
          }
        }
      )
      .subscribe();

    return window.SITE_CLOSED;
  })();
})();
