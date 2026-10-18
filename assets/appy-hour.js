/*
  Fyxx: Appy Hour banner behaviour. Plain JS, no libraries.

  Reads the Appy Hour window from the #appy-hour-window JSON tag (shop metafield
  fyxx.appy_hour_window, UTC {starts_at, ends_at}), or from a ?appyhour= preview
  param, and drives a top bar and a corner card through four states, recomputed
  every second:
    teaser     starts-15m .. starts
    on         starts     .. ends-15m
    last call  ends-15m   .. ends
    nothing    anything else / missing / invalid

  Fonts (Baskervville, Inter, Inter Tight) are injected once, only when a state
  first becomes active, so an idle banner makes no font request.
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
  if (!bar && !card) return;

  var mqMobile = window.matchMedia('(max-width: 749px)');

  // ---- Copy per state ------------------------------------------------------
  var COPY = {
    teaser: {
      barHeadline: 'Appy Hour starts at 6.',
      barSuffix: ' to go',
      barMsg: 'Fill your cart now, code APPYHOUR kicks in at 6.',
      barCode: false,
      barLink: "See what's in",
      cardTitle: 'Appy Hour starts at 6.',
      cardLabel: 'minutes to go',
      cardLabelMobile: 'minutes to go',
      cardCode: false,
      cardCta: 'link',
      announce: 'Appy Hour starts soon. Code APPYHOUR kicks in at 6.'
    },
    on: {
      barHeadline: 'Appy Hour is on.',
      barSuffix: ' left',
      barMsg: '',
      barCode: true,
      barLink: 'Shop Appy Hour',
      cardTitle: "It's Appy Hour.",
      cardLabel: 'minutes left',
      cardLabelMobile: 'minutes left, code APPYHOUR',
      cardCode: true,
      cardCta: 'btn',
      announce: 'Appy Hour is on. Use code APPYHOUR.'
    },
    lastcall: {
      barHeadline: 'Last call.',
      barSuffix: ' left',
      barMsg: '',
      barCode: true,
      barLink: 'Check out before 7',
      cardTitle: 'Last call.',
      cardLabel: 'minutes left',
      cardLabelMobile: 'minutes left, code APPYHOUR',
      cardCode: true,
      cardCta: 'btn',
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
    var s = Date.parse(data.starts_at);
    var e = Date.parse(data.ends_at);
    if (isNaN(s) || isNaN(e) || e <= s) return null;
    return { s: s, e: e };
  }

  var win = resolveWindow();
  if (!win) return; // nothing to show, and no font request

  function stateAt(now) {
    if (now >= win.e) return null;
    if (now >= win.e - MIN15) return 'lastcall';
    if (now >= win.s) return 'on';
    if (now >= win.s - MIN15) return 'teaser';
    return null;
  }

  // ---- Fonts (injected once, only when first active) -----------------------
  var fontsDone = false;
  function injectFonts() {
    if (fontsDone) return;
    fontsDone = true;
    var pre = document.createElement('link');
    pre.rel = 'preconnect';
    pre.href = 'https://fonts.gstatic.com';
    pre.crossOrigin = 'anonymous';
    document.head.appendChild(pre);
    var css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = 'https://fonts.googleapis.com/css2?family=Baskervville&family=Inter:wght@400;500&family=Inter+Tight:wght@400&display=swap';
    document.head.appendChild(css);
  }

  // ---- Small helpers -------------------------------------------------------
  function q(root, name) { return root ? root.querySelector('[data-appy="' + name + '"]') : null; }
  function setText(el, text) { if (el) el.textContent = text; }
  function show(el) { if (el) el.hidden = false; }
  function hide(el) { if (el) el.hidden = true; }
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  // ---- Minimise state (sessionStorage, guarded) ----------------------------
  function readMin() {
    try { return window.sessionStorage.getItem('fyxx_appy_minimised') === '1'; } catch (e) { return false; }
  }
  function writeMin(v) {
    try { window.sessionStorage.setItem('fyxx_appy_minimised', v ? '1' : '0'); } catch (e) {}
  }
  var minimised = readMin();

  // ---- State application ---------------------------------------------------
  var current;
  function applyState(st) {
    if (!st) {
      hide(bar); hide(card); hide(tab);
      return;
    }
    injectFonts();
    var c = COPY[st];

    // Bar
    if (bar) {
      bar.classList.remove('is-teaser', 'is-on', 'is-lastcall');
      bar.classList.add('is-' + st);
      setText(q(bar, 'bar-headline'), c.barHeadline);
      setText(q(bar, 'bar-count-suffix'), c.barSuffix);
      var barMsg = q(bar, 'bar-msg');
      var barCode = q(bar, 'bar-code');
      if (c.barCode) { hide(barMsg); show(barCode); }
      else { setText(barMsg, c.barMsg); show(barMsg); hide(barCode); }
      setText(q(bar, 'bar-link'), c.barLink);
      show(bar);
    }

    // Card (respect minimise)
    if (card) {
      card.classList.remove('is-teaser', 'is-on', 'is-lastcall');
      card.classList.add('is-' + st);
      setText(q(card, 'card-title'), c.cardTitle);
      var cardCode = q(card, 'card-code');
      if (c.cardCode) { show(cardCode); } else { hide(cardCode); }
      setText(q(card, 'card-link'), c.barLink);
      applyLabel(st);
      if (minimised) { hide(card); if (tab) { tab.classList.remove('is-teaser', 'is-on', 'is-lastcall'); tab.classList.add('is-' + st); show(tab); } }
      else { show(card); hide(tab); }
      positionCorner();
    }
  }

  function applyLabel(st) {
    if (!card) return;
    var c = COPY[st];
    setText(q(card, 'card-label'), mqMobile.matches ? c.cardLabelMobile : c.cardLabel);
  }

  // On mobile, if the theme's "Download the App" floater is visible, lift the
  // card and tab to sit 8px above it; otherwise use the CSS default offset.
  function floaterOffset() {
    if (!mqMobile.matches) return null;
    var f = document.getElementById('PAFloaterContainer');
    if (!f) return null;
    var cs = window.getComputedStyle(f);
    if (cs.display === 'none' || cs.visibility === 'hidden') return null;
    var r = f.getBoundingClientRect();
    if (!r.height) return null;
    var fromBottom = window.innerHeight - r.top;
    if (fromBottom <= 0) return null;
    return fromBottom + 8;
  }
  function positionCorner() {
    var off = floaterOffset();
    var val = off != null ? (off + 'px') : '';
    if (card) card.style.bottom = val;
    if (tab) tab.style.bottom = val;
  }

  // ---- Countdown -----------------------------------------------------------
  function target(st) { return st === 'teaser' ? win.s : win.e; }
  function updateCountdown(st, now) {
    var ms = target(st) - now;
    if (ms < 0) ms = 0;
    var mm = Math.floor(ms / 60000);
    var ss = Math.floor((ms % 60000) / 1000);
    var text = pad(mm) + ':' + pad(ss);
    setText(q(bar, 'bar-count'), text);
    setText(q(card, 'card-count'), text);
    setText(q(tab, 'tab-count'), text);
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
      if (bar && bar.parentNode) bar.parentNode.removeChild(bar);
      if (card && card.parentNode) card.parentNode.removeChild(card);
      if (tab && tab.parentNode) tab.parentNode.removeChild(tab);
      clearInterval(timer);
    }
  }

  // ---- Minimise / restore --------------------------------------------------
  if (card) {
    var minBtn = card.querySelector('[data-appy-min]');
    if (minBtn) minBtn.addEventListener('click', function () {
      minimised = true; writeMin(true);
      hide(card);
      if (tab && current) { tab.classList.remove('is-teaser', 'is-on', 'is-lastcall'); tab.classList.add('is-' + current); show(tab); }
      positionCorner();
    });
  }
  if (tab) {
    tab.addEventListener('click', function () {
      minimised = false; writeMin(false);
      hide(tab);
      if (card && current) show(card);
      positionCorner();
    });
  }

  // Keep the mobile/desktop label correct across resize.
  var onResize = function () { if (current) { applyLabel(current); positionCorner(); } };
  window.addEventListener('resize', positionCorner);
  if (mqMobile.addEventListener) mqMobile.addEventListener('change', onResize);
  else if (mqMobile.addListener) mqMobile.addListener(onResize);

  // ---- Copy code -----------------------------------------------------------
  function flashCopied(btn) {
    var span = btn.querySelector('[data-appy-copytext]');
    if (!span) return;
    var prev = span.textContent;
    span.textContent = 'Copied';
    setTimeout(function () { span.textContent = prev; }, 2000);
  }
  function copyCode(btn) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(CODE).then(function () { flashCopied(btn); }, function () { selectFallback(btn); });
    } else {
      selectFallback(btn);
    }
  }
  function selectFallback(btn) {
    var span = btn.querySelector('[data-appy-copytext]');
    if (!span) return;
    try {
      var range = document.createRange();
      range.selectNodeContents(span);
      var sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      document.execCommand('copy');
      flashCopied(btn);
    } catch (e) {}
  }
  var copyBtns = document.querySelectorAll('[data-appy-copy]');
  for (var i = 0; i < copyBtns.length; i++) {
    copyBtns[i].addEventListener('click', (function (b) { return function () { copyCode(b); }; })(copyBtns[i]));
  }

  // ---- Go ------------------------------------------------------------------
  tick();
  timer = setInterval(tick, 1000);
})();
