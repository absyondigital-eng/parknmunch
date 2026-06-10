/* ============================================================
   Park N Munch — Site Status
   Fetches site_closed from Supabase and keeps it in sync.
   Uses two mechanisms so the page updates without a refresh:
     1. Polling every 10 s  — always works, no config needed
     2. Realtime subscription — instant if enabled in Supabase
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

  async function fetchStatus() {
    try {
      const { data } = await db
        .from('settings')
        .select('site_closed')
        .eq('id', 'main')
        .single();
      if (data && data.site_closed != null) {
        const nowClosed = !!data.site_closed;
        if (nowClosed !== window.SITE_CLOSED) {
          window.SITE_CLOSED = nowClosed;
          if (typeof window.onSiteStatusChange === 'function') {
            window.onSiteStatusChange();
          }
        }
      }
    } catch (e) {
      console.warn('[SiteStatus] Poll failed:', e.message);
    }
  }

  window.siteStatusReady = (async function () {
    // Initial load — always fetch on page open
    try {
      const { data } = await db
        .from('settings')
        .select('site_closed')
        .eq('id', 'main')
        .single();
      if (data && data.site_closed != null) {
        window.SITE_CLOSED = !!data.site_closed;
      }
    } catch (e) {
      console.warn('[SiteStatus] Initial fetch failed:', e.message);
    }

    if (typeof window.onSiteStatusChange === 'function') {
      window.onSiteStatusChange();
    }

    // Poll every 10 seconds — catches the toggle even without realtime
    setInterval(fetchStatus, 10000);

    // Realtime subscription — fires instantly if the settings table has
    // realtime enabled in Supabase (Dashboard → Database → Replication)
    db.channel('site-status-customer')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'settings' },
        (payload) => {
          if (payload.new && payload.new.site_closed != null) {
            const nowClosed = !!payload.new.site_closed;
            if (nowClosed !== window.SITE_CLOSED) {
              window.SITE_CLOSED = nowClosed;
              if (typeof window.onSiteStatusChange === 'function') {
                window.onSiteStatusChange();
              }
            }
          }
        }
      )
      .subscribe();

    return window.SITE_CLOSED;
  })();
})();
