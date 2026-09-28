/*! SKINIFY Try-On SDK v1 (preview) — <button data-skinify="SLUG">Try it on</button> */
(function () {
  var s = document.currentScript; var ORIGIN = s ? new URL(s.src).origin : 'https://skinify.app';
  function open(slug) {
    var o = document.createElement('div');
    o.setAttribute('style', 'position:fixed;inset:0;z-index:2147483647;background:rgba(10,8,14,.6);display:flex;align-items:center;justify-content:center');
    var f = document.createElement('iframe');
    f.src = ORIGIN + '/embed/' + encodeURIComponent(slug);
    f.allow = 'camera; fullscreen; web-share';
    f.setAttribute('style', 'width:min(440px,100vw);height:min(820px,100dvh);border:0;border-radius:20px;background:#0d0b10');
    var x = document.createElement('button'); x.textContent = '\u00d7'; x.setAttribute('aria-label', 'Close');
    x.setAttribute('style', 'position:absolute;top:12px;right:12px;width:40px;height:40px;border-radius:50%;border:0;background:#fff;font-size:22px;cursor:pointer');
    function close() { f.src = 'about:blank'; o.remove(); document.removeEventListener('keydown', esc); }
    function esc(e) { if (e.key === 'Escape') close(); }
    x.onclick = close; o.onclick = function (e) { if (e.target === o) close(); }; document.addEventListener('keydown', esc);
    o.appendChild(f); o.appendChild(x); document.body.appendChild(o);
  }
  function bind(root) {
    (root || document).querySelectorAll('[data-skinify]:not([data-skinify-bound])').forEach(function (el) {
      el.setAttribute('data-skinify-bound', '1');
      if (!el.getAttribute('style') && !el.className) el.setAttribute('style', 'display:inline-flex;align-items:center;gap:8px;height:44px;padding:0 20px;border-radius:999px;border:0;background:#17141C;color:#fff;font:700 14px system-ui,sans-serif;cursor:pointer');
      el.addEventListener('click', function (e) { e.preventDefault(); var slug = el.getAttribute('data-skinify'); if (/Mobi|Android|iPhone/i.test(navigator.userAgent)) location.href = ORIGIN + '/s/' + encodeURIComponent(slug) + '?src=embed'; else open(slug); });
    });
  }
  window.Skinify = { open: open, bind: bind };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { bind(); }); else bind();
})();
