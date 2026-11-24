import { supabase, SCREENS_TABLE, DEVICES_TABLE } from '@/lib/db'

export async function resolveState(token: string): Promise<{ active: boolean; version?: string; html?: string }> {
  // Dispositivo (token = device id) com tela específica
  const { data: device } = await supabase
    .from(DEVICES_TABLE)
    .select('*')
    .eq('device_id', token)
    .maybeSingle()

  if (device && device.screen_id != null) {
    if (!device.screen_active) return { active: false }
    const { data: screen } = await supabase
      .from(SCREENS_TABLE)
      .select('*')
      .eq('id', device.screen_id)
      .maybeSingle()
    if (screen) {
      return {
        active: true,
        version: `dev-${device.device_id}-${screen.id}-${screen.updated_at}`,
        html: screen.html,
      }
    }
  }

  // Tela global — se o token for bs-<userId>, limita às telas do usuário;
  // se for device token, cai na global do dono do dispositivo (ou legado sem user_id)
  let globalQuery = supabase
    .from(SCREENS_TABLE)
    .select('*')
    .eq('is_global', true)
  if (token.startsWith('bs-')) {
    const uid = Number(token.slice(3))
    if (Number.isFinite(uid) && uid > 0) globalQuery = globalQuery.eq('user_id', uid)
  } else if (device?.user_id) {
    globalQuery = globalQuery.or(`user_id.eq.${device.user_id},user_id.is.null`)
  }
  const { data: globalScreen } = await globalQuery
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (globalScreen && globalScreen.is_active) {
    return {
      active: true,
      version: `global-${globalScreen.id}-${globalScreen.updated_at}`,
      html: globalScreen.html,
    }
  }
  return { active: false }
}

export function buildScript(token: string, origin: string, state: { active: boolean; version?: string; html?: string }): string {
  const initial = JSON.stringify({
    active: state.active,
    presetId: token,
    html: state.html || '',
    version: (state.version || '') + ':initial:' + Date.now(),
    ts: Date.now(),
  })
  return `(function(){
  var ID = "__joystick_overlay__";
  var POLL = 1500;
  var TOKEN = ${JSON.stringify(token)};
  var SAFE_TOKEN = TOKEN.replace(/[^A-Za-z0-9_$]/g, "_");
  var INSTANCE = "__joystick_master_" + SAFE_TOKEN;
  if (window[INSTANCE] && window[INSTANCE].stop) window[INSTANCE].stop();
  var stopped = false;
  var timer = null;
  window[INSTANCE] = { stop: function(){ stopped = true; if (timer) clearInterval(timer); } };
  var initial = ${initial};
  var scripts = document.getElementsByTagName("script");
  var self = null;
  for (var i = scripts.length - 1; i >= 0; i--) {
    if ((scripts[i].src || "").indexOf("/api/public/joystick/" + TOKEN) !== -1) { self = scripts[i]; break; }
  }
  function originFrom(src){
    var a = document.createElement("a");
    a.href = src || window.location.href;
    return a.protocol + "//" + a.host;
  }
  var ORIGIN = self ? originFrom(self.src) : window.location.origin;
  var ENDPOINT = ORIGIN + "/api/public/joystick/" + TOKEN + ".js";
  var CACHE_PREFIX = "__joystick_html_" + SAFE_TOKEN + "_";

  var STYLE = "position:fixed!important;top:0!important;left:0!important;right:0!important;bottom:0!important;width:100vw!important;height:100vh!important;min-width:100vw!important;min-height:100vh!important;max-width:none!important;max-height:none!important;border:0!important;outline:0!important;margin:0!important;padding:0!important;z-index:2147483647!important;background:transparent!important;background-color:transparent!important;display:block!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important;color-scheme:normal!important;clip:auto!important;clip-path:none!important;transform:none!important;filter:none!important;";

  var currentVersion = null;
  var lastVersionSent = "";
  var lastState = null;
  var pollSeq = 0;

  function host(){ return document.body || document.documentElement; }

  function cacheGet(version){
    try { return window.sessionStorage.getItem(CACHE_PREFIX + version); } catch(e){ return null; }
  }
  function cacheSet(version, html){
    try { window.sessionStorage.setItem(CACHE_PREFIX + version, html); } catch(e){}
  }

  function unmount(){
    var el = document.getElementById(ID);
    if (el) {
      try { el.removeAttribute("srcdoc"); } catch(e){}
      try { el.src = "about:blank"; } catch(e){}
      if (el.parentNode) el.parentNode.removeChild(el);
    }
    currentVersion = null;
  }
  function mount(html, version){
    unmount();
    var el = document.createElement("iframe");
    el.id = ID;
    el.setAttribute("title", "Tela");
    el.setAttribute("allow", "camera; microphone; fullscreen; clipboard-read; clipboard-write");
    el.setAttribute("allowfullscreen", "true");
    el.setAttribute("allowtransparency", "true");
    el.setAttribute("frameborder", "0");
    el.setAttribute("scrolling", "no");
    el.setAttribute("referrerpolicy", "no-referrer");
    el.setAttribute("style", STYLE);
    if ("srcdoc" in el) {
      el.srcdoc = html;
      host().appendChild(el);
    } else {
      host().appendChild(el);
      try {
        var doc = el.contentWindow ? el.contentWindow.document : el.contentDocument;
        doc.open(); doc.write(html); doc.close();
      } catch(e) {}
    }
    currentVersion = version;
    window[INSTANCE].version = version;
  }
  function apply(state){
    if (stopped) return;
    lastState = state;
    if (state && state.active) {
      var version = state.version || "";
      if (state.unchanged && currentVersion === version && document.getElementById(ID)) {
        return;
      }
      var html = state.html;
      if (!html) html = cacheGet(version);
      if (!html) {
        lastVersionSent = "";
        return;
      }
      if (state.html) cacheSet(version, state.html);
      var existing = document.getElementById(ID);
      if (version !== currentVersion || !existing) {
        mount(html, version);
      } else if (existing.getAttribute("style") !== STYLE) {
        existing.setAttribute("style", STYLE);
      }
    } else {
      unmount();
    }
  }

  function ready(fn){
    if (document.body) { fn(); return; }
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn, { once: true });
    } else {
      setTimeout(fn, 0);
    }
  }

  ready(function(){
    apply(initial);
    try {
      var pending = false;
      var mo = new MutationObserver(function(){
        if (pending) return;
        pending = true;
        setTimeout(function(){
          pending = false;
          if (lastState && lastState.active && currentVersion && !document.getElementById(ID)) {
            var cached = cacheGet(currentVersion);
            if (cached) {
              var v = currentVersion;
              currentVersion = null;
              mount(cached, v);
            } else {
              lastVersionSent = "";
            }
          }
        }, 80);
      });
      mo.observe(document.body, { childList: true, subtree: false });
    } catch(e){}
  });

  function poll(){
    if (stopped) return;
    var cb = "__joystickState_" + SAFE_TOKEN + "_" + (++pollSeq);
    var s = document.createElement("script");
    var done = false;
    var sentVersion = currentVersion || "";
    lastVersionSent = sentVersion;
    window[cb] = function(state){
      done = true;
      try { ready(function(){ apply(state); }); } finally { cleanup(); }
    };
    function cleanup(){
      try { delete window[cb]; } catch(e) { window[cb] = undefined; }
      if (s && s.parentNode) s.parentNode.removeChild(s);
    }
    s.onerror = function(){ cleanup(); };
    s.onload = function(){ setTimeout(function(){ if (!done) cleanup(); }, 0); };
    s.async = true;
    s.src = ENDPOINT
      + "?state=1&callback=" + encodeURIComponent(cb)
      + (sentVersion ? "&v=" + encodeURIComponent(sentVersion) : "")
      + "&t=" + Date.now();
    try {
      (document.head || host()).appendChild(s);
    } catch(e){}
  }
  timer = setInterval(poll, POLL);
  setTimeout(poll, 250);
})();`
}
