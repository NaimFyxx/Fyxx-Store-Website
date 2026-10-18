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

  // Kill switch for the Appy Hour PRICE display only (the struck regular price +
  // Appy Hour price on product cards and the product page). Everything else (bar,
  // card, pills, cart strip, copy) is unaffected. Flip to false to fall straight
  // back to normal prices if the checkout-rounding check ever disagrees.
  var SHOW_APPY_PRICE = true;

  var bar = document.querySelector('[data-appy-bar]');
  var card = document.querySelector('[data-appy-card]');
  var tab = document.querySelector('[data-appy-tab]');
  var live = document.querySelector('[data-appy-live]');
  var whatsthis = document.querySelector('[data-appy-whatsthis]');
  var hasAny = bar || card || document.querySelector('[data-appy-strip]') || document.querySelector('[data-appy-pill]') || document.querySelector('[data-appy-reg-cents]');
  if (!hasAny) return;

  var mqMobile = window.matchMedia('(max-width: 749px)');

  var COPY = {
    teaser: {
      barHeadline: 'APPY HOUR STARTS AT 6 PM', barSuffix: 'TO GO',
      barLink: 'BROWSE THE COLLECTION', barLinkHref: '/collections/happy-hour',
      cardLabel: 'TO GO, STARTS AT 6 PM', cardCode: 'CODE APPYHOUR, LIVE AT 6 PM', cardShop: 'BROWSE THE COLLECTION',
      stripHeadline: 'APPY HOUR STARTS AT 6',
      explainer: 'Starts at 6 pm. Every Sunday, Monday and Tuesday, hundreds of bottles at Appy Hour prices with code APPYHOUR.',
      pill: 'APPY HOUR AT 6', pillNote: 'Code APPYHOUR goes live at 6 pm',
      announce: 'Appy Hour starts soon. Code APPYHOUR goes live at 6 pm.'
    },
    on: {
      barHeadline: 'APPY HOUR IS ON', barSuffix: 'LEFT',
      barLink: 'SHOP NOW', barLinkHref: '/collections/happy-hour',
      cardLabel: 'LEFT, UNTIL 7 PM', cardCode: 'USE CODE APPYHOUR', cardShop: 'SHOP APPY HOUR',
      stripHeadline: 'APPY HOUR IS ON',
      explainer: 'Every Sunday, Monday and Tuesday, 6 to 7 pm: hundreds of bottles at Appy Hour prices with code APPYHOUR.',
      pill: 'APPY HOUR', pillNote: 'Use code APPYHOUR at checkout, until 7 pm',
      pillNotePrice: 'Appy Hour price with code APPYHOUR, until 7 pm',
      announce: 'Appy Hour is on. Use code APPYHOUR.'
    },
    lastcall: {
      barHeadline: 'LAST CALL', barSuffix: 'LEFT',
      barLink: 'CHECK OUT BEFORE 7', barLinkHref: '/cart',
      cardLabel: 'LEFT, UNTIL 7 PM', cardCode: 'USE CODE APPYHOUR', cardShop: 'SHOP APPY HOUR',
      stripHeadline: 'LAST CALL',
      explainer: 'Every Sunday, Monday and Tuesday, 6 to 7 pm: hundreds of bottles at Appy Hour prices with code APPYHOUR.',
      pill: 'APPY HOUR', pillNote: 'Use code APPYHOUR at checkout, until 7 pm',
      pillNotePrice: 'Appy Hour price with code APPYHOUR, until 7 pm',
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

  // ---- Appy Hour price inputs ----------------------------------------------
  // The preview param (if any) and the window percentage. Live prices only use
  // a real metafield percentage; the 0.13 fallback is for ?appyhour= previews.
  var previewParam = null;
  try { previewParam = new URLSearchParams(window.location.search).get('appyhour'); } catch (e) { previewParam = null; }
  var previewActive = previewParam === 'teaser' || previewParam === 'on' || previewParam === 'lastcall';
  var metaPct = (function () {
    try {
      var d = JSON.parse(document.getElementById('appy-hour-window').textContent);
      var p = d && d.percentage;
      return (typeof p === 'number' && p > 0 && p < 1) ? p : null;
    } catch (e) { return null; }
  })();

  // Money formatter built from the theme's own `money` filter (two reference
  // prices in #appy-money), so the Appy Hour price matches the page exactly:
  // decimals, decimal/thousands separators and the currency affix.
  var money = (function () {
    var prefix = '', suffix = '', decimals = 2, dsep = '.', tsep = ',';
    try {
      var m = JSON.parse(document.getElementById('appy-money').textContent);
      var z = String(m.zero), k = String(m.k);
      var zn = z.match(/[\d.,]*\d/);
      if (zn) {
        prefix = z.slice(0, zn.index);
        suffix = z.slice(zn.index + zn[0].length);
        var sep = zn[0].match(/[^\d]/);
        if (sep) { dsep = sep[0]; decimals = zn[0].length - (zn[0].indexOf(dsep) + 1); } else { decimals = 0; }
        var kn = (k.match(/[\d.,]*\d/) || [''])[0];
        var intPart = decimals > 0 ? kn.slice(0, kn.lastIndexOf(dsep)) : kn;
        var tm = intPart.match(/[^\d]/);
        tsep = tm ? tm[0] : '';
      }
    } catch (e) {}
    return function (cents) {
      var v = cents / 100;
      var s = Math.abs(v).toFixed(decimals);
      var parts = s.split('.');
      var ip = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, tsep || '');
      var out = decimals > 0 ? ip + dsep + (parts[1] || '') : ip;
      return prefix + (v < 0 ? '-' : '') + out + suffix;
    };
  })();

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

  // ---- Cart strips + product pills (idempotent; may be re-rendered) --------
  // The drawer re-renders its strip from the Section Rendering API, the cart
  // page re-renders on qty change, and the price block can re-render on variant
  // change. paintSurfaces re-applies state/text/visibility to every strip and
  // pill each tick and on cart events, winning the race against those refreshes.
  function paintSurfaces(st) {
    var strips = document.querySelectorAll('[data-appy-strip]');
    var pills = document.querySelectorAll('[data-appy-pill]');
    var groups = document.querySelectorAll('[data-appy-pill-group]');
    if (!st) {
      [].forEach.call(strips, hide); [].forEach.call(pills, hide); [].forEach.call(groups, hide);
      return;
    }
    var c = COPY[st];
    [].forEach.call(strips, function (el) {
      setState(el, st);
      setText(el.querySelector('[data-appy="strip-headline"]'), c.stripHeadline);
      setText(el.querySelector('[data-appy="strip-explainer"]'), c.explainer);
      if (el.hidden) el.hidden = false;
    });
    [].forEach.call(pills, function (el) { el.textContent = c.pill; if (el.hidden) el.hidden = false; });
    [].forEach.call(groups, function (el) {
      setText(el.querySelector('[data-appy="pill-note"]'), c.pillNote);
      if (el.hidden) el.hidden = false;
    });
  }

  // ---- Appy Hour price (product cards + product page) ----------------------
  // Decide the effective percentage, then for every price host either show the
  // struck regular + Appy Hour price (hiding the normal price) or restore the
  // normal price. Idempotent; safe to run every tick and on variant change.
  function effectivePct(st) {
    if (!SHOW_APPY_PRICE) return null;
    if (st !== 'on' && st !== 'lastcall') return null;   // not in teaser / none
    if (metaPct != null) return metaPct;                 // real window percentage
    if (previewActive) return 0.13;                      // preview only
    return null;                                         // never guess on a live page
  }
  function paintPrices(st) {
    var pct = effectivePct(st);
    var hosts = document.querySelectorAll('[data-appy-reg-cents]');
    [].forEach.call(hosts, function (host) {
      var row = host.querySelector('[data-appy-prices]');   // PDP: inner row; card host has none
      var box = row || host;
      var normal = host.parentNode ? host.parentNode.querySelector('[data-appy-normalprice]') : null;
      var note = host.querySelector('[data-appy="pill-note"]');
      var reg = parseFloat(host.getAttribute('data-appy-reg-cents'));
      if (pct == null || isNaN(reg) || reg <= 0) {
        hide(box); if (normal) show(normal);
        return;
      }
      var regFils = reg * 10;                              // JOD smallest unit (3 dp); .price is in cents
      var appyFils = regFils - Math.round(regFils * pct);  // round the amount off, like a checkout % code
      setText(host.querySelector('[data-appy="price-reg"]'), money(reg));
      setText(host.querySelector('[data-appy="price-appy"]'), money(appyFils / 10));
      show(box); if (normal) hide(normal);
      if (note && COPY[st]) note.textContent = COPY[st].pillNotePrice || COPY[st].pillNote;
    });
  }

  // Hook the theme's scoped variant:change event on each product price block so
  // the Appy Hour price recalculates from the newly selected variant.
  function ensureVariantHooks() {
    var blocks = document.querySelectorAll('block-price[data-section-id][data-product-id]');
    [].forEach.call(blocks, function (bp) {
      if (bp.getAttribute('data-appy-vhook') === '1') return;
      if (!bp.querySelector('[data-appy-reg-cents]')) return;
      bp.setAttribute('data-appy-vhook', '1');
      document.addEventListener('variant:change:' + bp.dataset.sectionId + ':' + bp.dataset.productId, function (e) {
        var host = bp.querySelector('[data-appy-reg-cents]');
        if (!host) return;
        var src = null;
        try { src = e.detail && e.detail.html && e.detail.html.querySelector('block-price[data-section-id="' + bp.dataset.sectionId + '"][data-product-id="' + bp.dataset.productId + '"] [data-appy-reg-cents]'); } catch (err) {}
        if (src && src.getAttribute('data-appy-reg-cents')) {
          host.setAttribute('data-appy-reg-cents', src.getAttribute('data-appy-reg-cents'));
        } else if (e.detail && e.detail.variant && typeof e.detail.variant.price === 'number') {
          host.setAttribute('data-appy-reg-cents', e.detail.variant.price);
        }
        if (current) paintPrices(current);
      });
    });
  }

  // ---- State application ---------------------------------------------------
  var current;
  function applyState(st) {
    if (!st) {
      hide(bar); hide(card); hide(tab); hide(whatsthis);
      paintSurfaces(null);
      paintPrices(null);
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
      if (whatsthis) { if (card) { show(whatsthis); } else { hide(whatsthis); } }
    }

    if (card) {
      setState(card, st);
      setText(q(card, 'card-label'), c.cardLabel);
      setText(q(card, 'card-code'), c.cardCode);
      setText(q(card, 'card-explainer'), c.explainer);
      var shop = q(card, 'card-shop');
      if (shop) shop.textContent = c.cardShop;
      if (minimised) { hide(card); if (tab) { setState(tab, st); show(tab); } }
      else { show(card); hide(tab); }
      positionCorner();
    }

    paintSurfaces(st);
    paintPrices(st);
  }

  // ---- Countdown -----------------------------------------------------------
  function target(st) { return st === 'teaser' ? win.s : win.e; }
  function updateCountdown(st, now) {
    var ms = target(st) - now; if (ms < 0) ms = 0;
    var text = pad(Math.floor(ms / 60000)) + ':' + pad(Math.floor((ms % 60000) / 1000));
    setText(q(bar, 'bar-count'), text);
    setText(q(card, 'card-count'), text);
    setText(q(tab, 'tab-count'), text);
    var strips = document.querySelectorAll('[data-appy-strip]');
    [].forEach.call(strips, function (el) { setText(el.querySelector('[data-appy="strip-count"]'), text); });
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
    if (st) { updateCountdown(st, now); positionCorner(); paintSurfaces(st); paintPrices(st); }
    if (now >= win.e) {
      paintPrices(null);   // restore normal prices (un-hide) before tearing down
      var all = [bar, card, tab, whatsthis];
      [].forEach.call(document.querySelectorAll('[data-appy-strip],[data-appy-pill],[data-appy-pill-group]'), function (el) { all.push(el); });
      all.forEach(function (el) { if (el && el.parentNode) el.parentNode.removeChild(el); });
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

  // Re-apply after the cart drawer re-renders (strip node is replaced). The
  // drawer's own refresh is async, so re-assert a couple of times to land after it.
  function reassertCart() {
    if (!current) return;
    paintSurfaces(current); paintPrices(current); updateCountdown(current, Date.now());
    setTimeout(function () { if (current) { paintSurfaces(current); paintPrices(current); updateCountdown(current, Date.now()); } }, 400);
    setTimeout(function () { if (current) { paintSurfaces(current); paintPrices(current); updateCountdown(current, Date.now()); } }, 900);
  }
  document.addEventListener('fyxx-cart:mutated', reassertCart);
  document.addEventListener('fyxx-cart:open', reassertCart);

  // "What's this?" (desktop bar) opens the card if it is minimised.
  if (whatsthis) whatsthis.addEventListener('click', function () {
    if (!card) return;
    minimised = false; writeMin(false);
    hide(tab); show(card); positionCorner();
  });

  // Keep floater offset correct on resize.
  window.addEventListener('resize', positionCorner);

  // ---- Go ------------------------------------------------------------------
  ensureVariantHooks();
  tick();
  timer = setInterval(tick, 1000);
})();
