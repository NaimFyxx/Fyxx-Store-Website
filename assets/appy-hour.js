/*
  Fyxx: Appy Hour banner V2 behaviour. Plain JS, no libraries.

  Reads the window from #appy-hour-window (shop metafield fyxx.appy_hour_window,
  UTC {starts_at, ends_at}) or a ?appyhour= preview param, and drives the sticky
  bar, the pop-up card + tab, the cart-drawer strip and the cart-page block
  through four states every second:
    teaser     starts-15m .. starts
    on         starts     .. ends-15m
    last call  ends-15m   .. ends
    nothing    otherwise / missing / invalid

  Fonts (Inter 400/500/700, Inter Tight 400) load once, only when first active.
  Copy is handled by one delegated listener so it also covers nodes the cart
  drawer re-inserts on its Section-Rendering-API refresh.
*/
(function () {
  'use strict';

  var MIN15 = 15 * 60 * 1000;
  var HOUR = 60 * 60 * 1000;
  var CODE = 'APPYHOUR';

  var bar = document.querySelector('[data-appy-bar]');
  var card = document.querySelector('[data-appy-card]');
  var tab = document.querySelector('[data-appy-tab]');
  var live = document.querySelector('[data-appy-live]');
  var hasAny = bar || card || document.querySelector('[data-appy-strip]') || document.querySelector('[data-appy-block]');
  if (!hasAny) return;

  var mqMobile = window.matchMedia('(max-width: 749px)');

  var COPY = {
    teaser: {
      barHeadline: 'APPY HOUR STARTS AT 6 PM', barSuffix: 'TO GO',
      barLink: 'BROWSE THE COLLECTION', barLinkHref: '/collections/happy-hour',
      cardLabel: 'TO GO, STARTS AT 6 PM', cardCode: 'CODE APPYHOUR, LIVE AT 6 PM', cardShop: 'BROWSE THE COLLECTION',
      stripHeadline: 'APPY HOUR STARTS AT 6',
      announce: 'Appy Hour starts soon. Code APPYHOUR goes live at 6 pm.'
    },
    on: {
      barHeadline: 'APPY HOUR IS ON', barSuffix: 'LEFT',
      barLink: 'SHOP NOW', barLinkHref: '/collections/happy-hour',
      cardLabel: 'LEFT, UNTIL 7 PM', cardCode: 'USE CODE APPYHOUR', cardShop: 'SHOP APPY HOUR',
      stripHeadline: 'APPY HOUR IS ON',
      announce: 'Appy Hour is on. Use code APPYHOUR.'
    },
    lastcall: {
      barHeadline: 'LAST CALL', barSuffix: 'LEFT',
      barLink: 'CHECK OUT BEFORE 7', barLinkHref: '/cart',
      cardLabel: 'LEFT, UNTIL 7 PM', cardCode: 'USE CODE APPYHOUR', cardShop: 'SHOP APPY HOUR',
      stripHeadline: 'LAST CALL',
      announce: 'Appy Hour last call. Use code APPYHOUR.'
    }
  };

  // ---- Window resolution ---------------------------------------------------
  function resolveWindow() {
    var now = Date.now();
    var pv = null;
    try { pv = new URLSearchParams(window.location.search).get('appyhour'); } catch (e) { pv = null; }
    if (pv === 'teaser') return { s: now + MIN15, e: now + MIN15 + HOUR };
    if (pv === 'on') return { s: now, e: now + HOUR };
    if (pv === 'lastcall') return { s: now - (HOUR - MIN15), e: now + MIN15 };

    var el = document.getElementById('appy-hour-window');
    if (!el) return null;
    var data;
    try { data = JSON.parse(el.textContent); } catch (e) { return null; }
    if (!data || !data.starts_at || !data.ends_at) return null;
    var s = Date.parse(data.starts_at), e = Date.parse(data.ends_at);
    if (isNaN(s) || isNaN(e) || e <= s) return null;
    return { s: s, e: e };
  }

  var win = resolveWindow();
  if (!win) return;

  function stateAt(now) {
    if (now >= win.e) return null;
    if (now >= win.e - MIN15) return 'lastcall';
    if (now >= win.s) return 'on';
    if (now >= win.s - MIN15) return 'teaser';
    return null;
  }

  // ---- Fonts (once, only when active) --------------------------------------
  var fontsDone = false;
  function injectFonts() {
    if (fontsDone) return;
    fontsDone = true;
    var pre = document.createElement('link');
    pre.rel = 'preconnect'; pre.href = 'https://fonts.gstatic.com'; pre.crossOrigin = 'anonymous';
    document.head.appendChild(pre);
    var css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&family=Inter+Tight:wght@400&display=swap';
    document.head.appendChild(css);
  }

  // ---- Helpers -------------------------------------------------------------
  function q(root, name) { return root ? root.querySelector('[data-appy="' + name + '"]') : null; }
  function setText(el, t) { if (el) el.textContent = t; }
  function show(el) { if (el) el.hidden = false; }
  function hide(el) { if (el) el.hidden = true; }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function setState(el, st) { if (!el) return; el.classList.remove('is-teaser', 'is-on', 'is-lastcall'); el.classList.add('is-' + st); }

  // ---- Minimise state ------------------------------------------------------
  function rawMin() { try { return window.sessionStorage.getItem('fyxx_appy_minimised'); } catch (e) { return null; } }
  function writeMin(v) { try { window.sessionStorage.setItem('fyxx_appy_minimised', v ? '1' : '0'); } catch (e) {} }
  var cartDefaultMin = !!(card && card.hasAttribute('data-appy-cart-min'));
  var storedMin = rawMin();
  var minimised = storedMin != null ? (storedMin === '1') : cartDefaultMin;

  // ---- Floater clearance (mobile) ------------------------------------------
  function floaterOffset() {
    if (!mqMobile.matches) return null;
    var f = document.getElementById('PAFloaterContainer');
    if (!f) return null;
    var cs = window.getComputedStyle(f);
    if (cs.display === 'none' || cs.visibility === 'hidden') return null;
    var r = f.getBoundingClientRect();
    if (!r.height) return null;
    var fromBottom = window.innerHeight - r.top;
    return fromBottom > 0 ? fromBottom + 8 : null;
  }
  function positionCorner() {
    var off = floaterOffset();
    var val = off != null ? (off + 'px') : '';
    if (card) card.style.bottom = val;
    if (tab) tab.style.bottom = val;
  }

  // ---- State application ---------------------------------------------------
  var current;
  function applyState(st) {
    if (!st) {
      hide(bar); hide(card); hide(tab);
      var s0 = document.querySelector('[data-appy-strip]'); hide(s0);
      var b0 = document.querySelector('[data-appy-block]'); hide(b0);
      return;
    }
    injectFonts();
    var c = COPY[st];

    if (bar) {
      setState(bar, st);
      setText(q(bar, 'bar-headline'), c.barHeadline);
      setText(q(bar, 'bar-suffix'), c.barSuffix);
      var link = q(bar, 'bar-link');
      if (link) { link.textContent = c.barLink; link.setAttribute('href', c.barLinkHref); }
      show(bar);
    }

    if (card) {
      setState(card, st);
      setText(q(card, 'card-label'), c.cardLabel);
      setText(q(card, 'card-code'), c.cardCode);
      var shop = q(card, 'card-shop');
      if (shop) shop.textContent = c.cardShop;
      if (minimised) { hide(card); if (tab) { setState(tab, st); show(tab); } }
      else { show(card); hide(tab); }
      positionCorner();
    }

    var strip = document.querySelector('[data-appy-strip]');
    if (strip) {
      setState(strip, st);
      setText(q(strip, 'strip-headline'), c.stripHeadline);
      show(strip);
    }
    var block = document.querySelector('[data-appy-block]');
    if (block) {
      setState(block, st);
      setText(q(block, 'block-headline'), c.stripHeadline);
      show(block);
    }
  }

  // ---- Countdown -----------------------------------------------------------
  function target(st) { return st === 'teaser' ? win.s : win.e; }
  function updateCountdown(st, now) {
    var ms = target(st) - now; if (ms < 0) ms = 0;
    var text = pad(Math.floor(ms / 60000)) + ':' + pad(Math.floor((ms % 60000) / 1000));
    setText(q(bar, 'bar-count'), text);
    setText(q(card, 'card-count'), text);
    setText(q(tab, 'tab-count'), text);
    var strip = document.querySelector('[data-appy-strip]'); setText(q(strip, 'strip-count'), text);
    var block = document.querySelector('[data-appy-block]'); setText(q(block, 'block-count'), text);
  }

  // ---- Tick ----------------------------------------------------------------
  var timer;
  function tick() {
    var now = Date.now();
    var st = stateAt(now);
    if (st !== current) {
      applyState(st);
      if (st && live) live.textContent = COPY[st].announce;
      current = st;
    }
    if (st) { updateCountdown(st, now); positionCorner(); }
    if (now >= win.e) {
      [bar, card, tab, document.querySelector('[data-appy-strip]'), document.querySelector('[data-appy-block]')]
        .forEach(function (el) { if (el && el.parentNode) el.parentNode.removeChild(el); });
      clearInterval(timer);
    }
  }

  // ---- Minimise / restore --------------------------------------------------
  if (card) {
    var minBtn = card.querySelector('[data-appy-min]');
    if (minBtn) minBtn.addEventListener('click', function () {
      minimised = true; writeMin(true);
      hide(card); if (tab && current) { setState(tab, current); show(tab); } positionCorner();
    });
  }
  if (tab) tab.addEventListener('click', function () {
    minimised = false; writeMin(false);
    hide(tab); if (card && current) show(card); positionCorner();
  });

  // ---- Delegated: copy + strip expand --------------------------------------
  function flashCopied(btn) {
    var span = btn.querySelector('[data-appy-copytext]'); if (!span) return;
    if (btn.getAttribute('data-appy-copied') === '1') return;
    var prev = span.textContent;
    btn.setAttribute('data-appy-copied', '1');
    span.textContent = 'Copied ✓';
    setTimeout(function () { span.textContent = prev; btn.removeAttribute('data-appy-copied'); }, 2000);
  }
  function selectFallback(btn) {
    var span = btn.querySelector('[data-appy-copytext]'); if (!span) return;
    try {
      var r = document.createRange(); r.selectNodeContents(span);
      var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
      document.execCommand('copy'); flashCopied(btn);
    } catch (e) {}
  }
  document.addEventListener('click', function (e) {
    var copyBtn = e.target.closest ? e.target.closest('[data-appy-copy]') : null;
    if (copyBtn) {
      e.preventDefault();
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(CODE).then(function () { flashCopied(copyBtn); }, function () { selectFallback(copyBtn); });
      } else { selectFallback(copyBtn); }
      return;
    }
    var toggle = e.target.closest ? e.target.closest('[data-appy-strip-toggle]') : null;
    if (toggle) {
      var strip = toggle.closest('[data-appy-strip]');
      var panel = strip ? strip.querySelector('[data-appy-strip-panel]') : null;
      var open = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', open ? 'false' : 'true');
      if (panel) panel.hidden = open;
    }
  });

  // Re-apply after the cart drawer re-renders (strip node is replaced).
  document.addEventListener('fyxx-cart:mutated', function () {
    if (current) { applyState(current); updateCountdown(current, Date.now()); }
  });

  // Keep floater offset correct on resize.
  window.addEventListener('resize', positionCorner);

  // ---- Go ------------------------------------------------------------------
  tick();
  timer = setInterval(tick, 1000);
})();
