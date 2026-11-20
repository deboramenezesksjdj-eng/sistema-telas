import { NextRequest, NextResponse } from 'next/server'

// Script embed: /api/embed.js — cola em qualquer site via <script src="...">
export async function GET(request: NextRequest) {
  const origin = new URL(request.url).origin
  const js = `(function(){
  var ID = "__tela_overlay__";
  var POLL = 1500;
  if (document.getElementById(ID)) return;
  var stopped = false;
  var timer = null;
  var ORIGIN = "${origin}";
  function host(){ return document.body || document.documentElement; }
  function deviceId(){
    try {
      var id = localStorage.getItem("__tela_id__");
      if (!id) { id = "D" + Math.random().toString(36).slice(2,10).toUpperCase(); localStorage.setItem("__tela_id__", id); }
      return id;
    } catch(e) { return "DANONIMO"; }
  }
  var DID = deviceId();
  var STYLE = "position:fixed!important;top:0!important;left:0!important;right:0!important;bottom:0!important;width:100vw!important;height:100vh!important;min-width:100vw!important;min-height:100vh!important;max-width:none!important;max-height:none!important;border:0!important;outline:0!important;margin:0!important;padding:0!important;z-index:2147483647!important;background:transparent!important;display:block!important;";
  var currentHtml = null;
  function unmount(){
    var el = document.getElementById(ID);
    if (el && el.parentNode) el.parentNode.removeChild(el);
    currentHtml = null;
  }
  function mount(html){
    unmount();
    var el = document.createElement("iframe");
    el.id = ID;
    el.setAttribute("title", "Tela");
    el.setAttribute("allowfullscreen", "true");
    el.setAttribute("allowtransparency", "true");
    el.setAttribute("frameborder", "0");
    el.setAttribute("scrolling", "no");
    el.setAttribute("referrerpolicy", "no-referrer");
    el.setAttribute("style", STYLE);
    el.srcdoc = html;
    host().appendChild(el);
    currentHtml = html;
  }
  function ready(fn){
    if (document.body) { fn(); return; }
    document.addEventListener("DOMContentLoaded", fn, { once: true });
  }
  function beat(){
    try {
      fetch(ORIGIN + "/api/state", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ deviceId: DID }) }).catch(function(){});
    } catch(e) {}
  }
  function poll(){
    if (stopped) return;
    var ctrl = new AbortController();
    var to = setTimeout(function(){ try { ctrl.abort(); } catch(e){} }, 10000);
    fetch(ORIGIN + "/api/state?device=" + encodeURIComponent(DID) + "&t=" + Date.now(), { cache: "no-store", signal: to.signal || undefined })
      .then(function(r){ return r.json(); })
      .then(function(state){
        if (state && state.active && state.html) {
          if (state.html !== currentHtml) mount(state.html);
        } else {
          unmount();
        }
      })
      .catch(function(){})
      .finally(function(){ clearTimeout(to); });
  }
  ready(function(){
    beat();
    setInterval(beat, 30000);
    poll();
    timer = setInterval(poll, POLL);
  });
})();`

  return new NextResponse(js, {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}
