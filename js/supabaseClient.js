// ===== SUPABASE CLIENT =====
window.sbClient = null;

(function () {
  var url = CONFIG.SUPABASE_URL || 'https://ygquwwjbdorofqdnwdrr.supabase.co';
  var key = CONFIG.SUPABASE_ANON_KEY || 'sb_publishable_bH1jFjG9uoy2i0i5c2jMbw_cFasQnyr';
  if (url && key && window.supabase && typeof window.supabase.createClient === 'function') {
    try {
      window.sbClient = window.supabase.createClient(url, key);
      console.log('✅ Supabase connected');
    } catch (e) {
      console.error('⚠️ Supabase initialization failed', e);
      alert('Critical Error: Supabase connection failed. Please check your configuration.');
    }
  } else {
    console.error('⚠️ Missing Supabase Configuration or Library.');
    alert('Critical Error: Supabase configuration is missing in config.js or library failed to load.');
  }
})();