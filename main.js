/* Dunn Right Creations — site script
   1. Scroll-scrubbed hero (canvas frame sequence)
   2. Lazy, visibility-aware looping background videos
   3. Nav behaviour + reveal-on-scroll
   4. Quote form: posts to QUOTE_CONFIG.endpoint when set, otherwise builds an
      email / text message the visitor can send in one tap.
*/
(function () {
  'use strict';

  /* ------------------------------------------------------------------
     CONFIG — the only thing to edit when wiring up a form service.
     Formspree:  endpoint = "https://formspree.io/f/<your-id>"
     Web3Forms:  endpoint = "https://api.web3forms.com/submit", accessKey = "<key>"
     Leave endpoint empty to use the email/text fallback (works with no account).
  ------------------------------------------------------------------ */
  var QUOTE_CONFIG = {
    endpoint: '',
    accessKey: '',
    toEmail: 'dunnrightcreations1@gmail.com',
    phoneE164: '+16823006825',
    phonePretty: '(682) 300-6825'
  };

  var HERO = {
    frameCount: 120,              // frames exported by scripts/process-video.sh
    path: function (i) { return 'assets/hero/frame-' + String(i).padStart(3, '0') + '.webp'; },
    beats: [0.0, 0.32, 0.56, 0.8] // scroll progress at which each copy beat appears
  };

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------------- nav ---------------- */
  var nav = $('#nav');
  var toggle = $('#navToggle');
  var hero = $('#hero');
  function updateNav() {
    var solid = window.scrollY > 40;
    nav.classList.toggle('is-solid', solid);
  }
  window.addEventListener('scroll', updateNav, { passive: true });
  updateNav();
  if (toggle) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });
    $$('#navLinks a').forEach(function (a) { a.addEventListener('click', function () { nav.classList.remove('is-open'); toggle.setAttribute('aria-expanded', 'false'); }); });
  }
  var yearEl = $('#year'); if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* ---------------- reveal on scroll ---------------- */
  var revealEls = $$('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    var ro = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); ro.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revealEls.forEach(function (el) { ro.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ---------------- looping background videos ---------------- */
  var loops = $$('video.loop');
  function loadLoop(v) {
    if (v.dataset.loaded) return;
    v.dataset.loaded = '1';
    var src = document.createElement('source');
    src.src = v.dataset.src; src.type = 'video/mp4';
    v.appendChild(src);
    v.load();
  }
  if (!reduceMotion && loops.length) {
    var canPlay = document.createElement('video').canPlayType('video/mp4');
    if (canPlay) {
      var vo = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          var v = e.target;
          if (e.isIntersecting) { loadLoop(v); var p = v.play(); if (p && p.catch) p.catch(function () {}); }
          else if (!v.paused) { v.pause(); }
        });
      }, { rootMargin: '200px 0px' });
      loops.forEach(function (v) { vo.observe(v); });
    }
  }

  /* ---------------- scroll-scrubbed hero ---------------- */
  var canvas = $('#heroCanvas');
  var poster = $('#heroPoster');
  var beats = $$('.beat', hero);
  var progressBar = $('.hero-progress i', hero);

  function setBeat(p) {
    var idx = 0;
    for (var i = 0; i < HERO.beats.length; i++) { if (p >= HERO.beats[i]) idx = i; }
    beats.forEach(function (b) { b.classList.toggle('is-active', Number(b.dataset.beat) === idx); });
    hero.classList.toggle('is-done', p > 0.04);
    hero.style.setProperty('--p', p.toFixed(4));
  }

  if (canvas && !reduceMotion) {
    var ctx = canvas.getContext('2d', { alpha: false });
    var frames = new Array(HERO.frameCount);
    var loadedCount = 0;
    var current = -1;
    var firstDrawn = false;
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);

    function resize() {
      var w = canvas.clientWidth, h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      current = -1; render();
    }

    function drawCover(img) {
      var cw = canvas.width, ch = canvas.height;
      var iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
      if (!iw || !ih) return;
      var s = Math.max(cw / iw, ch / ih);
      var dw = iw * s, dh = ih * s;
      ctx.drawImage(img, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
    }

    function nearestLoaded(i) {
      if (frames[i] && frames[i].complete && frames[i].naturalWidth) return frames[i];
      for (var d = 1; d < HERO.frameCount; d++) {
        var a = i - d, b = i + d;
        if (a >= 0 && frames[a] && frames[a].complete && frames[a].naturalWidth) return frames[a];
        if (b < HERO.frameCount && frames[b] && frames[b].complete && frames[b].naturalWidth) return frames[b];
      }
      return null;
    }

    function progress() {
      var rect = hero.getBoundingClientRect();
      var total = hero.offsetHeight - window.innerHeight;
      if (total <= 0) return 0;
      return Math.min(1, Math.max(0, -rect.top / total));
    }

    var ticking = false;
    function render() {
      ticking = false;
      var p = progress();
      setBeat(p);
      var i = Math.round(p * (HERO.frameCount - 1));
      if (i === current) return;
      var img = nearestLoaded(i);
      if (!img) return;
      drawCover(img);
      current = i;
      if (!firstDrawn) { firstDrawn = true; poster.style.opacity = '0'; poster.style.transition = 'opacity .4s'; }
    }
    function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(render); } }

    function loadFrame(i, cb) {
      if (frames[i]) return;
      var img = new Image();
      img.decoding = 'async';
      img.onload = function () { loadedCount++; if (cb) cb(); if (Math.abs(i - Math.max(current, 0)) < 3) { current = -1; onScroll(); } };
      img.onerror = function () { frames[i] = null; };
      img.src = HERO.path(i);
      frames[i] = img;
    }

    // Priority order: first frame, then a coarse spread, then fill in.
    var order = [0];
    [2, 4, 8, 16, 32].forEach(function (step) { for (var i = 0; i < HERO.frameCount; i += Math.round(HERO.frameCount / step)) if (order.indexOf(i) < 0) order.push(i); });
    for (var k = 0; k < HERO.frameCount; k++) if (order.indexOf(k) < 0) order.push(k);

    var cursor = 0, inFlight = 0, MAX = 6;
    function pump() {
      while (inFlight < MAX && cursor < order.length) {
        var idx = order[cursor++];
        inFlight++;
        loadFrame(idx, function () { inFlight--; pump(); });
      }
    }

    window.addEventListener('resize', resize);
    window.addEventListener('scroll', onScroll, { passive: true });
    resize();
    pump();
  } else if (hero) {
    // Reduced motion: keep the poster, show the headline only.
    setBeat(0);
  }

  /* ---------------- quote form ---------------- */
  var form = $('#quoteForm');
  var status = $('#formStatus');
  var submitBtn = $('#quoteSubmit');

  function showStatus(kind, html) {
    status.className = 'form-status is-visible ' + kind;
    status.innerHTML = html;
    status.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  function collect() {
    var services = $$('input[name="service"]:checked', form).map(function (i) { return i.value; });
    var contact = (form.querySelector('input[name="contact"]:checked') || {}).value || 'Text';
    var photos = $('#qPhotos').files;
    return {
      name: $('#qName').value.trim(),
      phone: $('#qPhone').value.trim(),
      email: $('#qEmail').value.trim(),
      address: $('#qAddress').value.trim(),
      services: services,
      details: $('#qDetails').value.trim(),
      contact: contact,
      photoCount: photos ? photos.length : 0
    };
  }

  function composeMessage(d) {
    var lines = [
      'Quote request from ' + d.name,
      'Phone: ' + d.phone,
      d.email ? 'Email: ' + d.email : null,
      d.address ? 'Address/ZIP: ' + d.address : null,
      'Needs: ' + (d.services.length ? d.services.join(', ') : 'Not specified'),
      'Best way to reach: ' + d.contact,
      '',
      d.details || '(no details given)',
      d.photoCount ? '' : null,
      d.photoCount ? '(' + d.photoCount + ' photo' + (d.photoCount > 1 ? 's' : '') + ' ready to attach)' : null,
      '',
      'Sent from dunnrightcreations.com'
    ];
    return lines.filter(function (l) { return l !== null; }).join('\n');
  }

  function validate(d) {
    var errs = [];
    if (!d.name) errs.push('your name');
    if (!d.phone || d.phone.replace(/\D/g, '').length < 10) errs.push('a 10-digit phone number');
    if (d.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) errs.push('a valid email (or leave it blank)');
    return errs;
  }

  function escapeHtml(s) { return s.replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  if (form) {
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var d = collect();
      var errs = validate(d);
      if (errs.length) {
        showStatus('err', '<p><strong>Almost there.</strong> Please add ' + errs.join(' and ') + '.</p>');
        return;
      }
      var message = composeMessage(d);

      if (QUOTE_CONFIG.endpoint) {
        submitBtn.disabled = true; submitBtn.textContent = 'Sending…';
        var fd = new FormData(form);
        fd.set('service', d.services.join(', '));
        fd.set('message', message);
        fd.set('subject', 'Quote request from ' + d.name + (d.services.length ? ' — ' + d.services[0] : ''));
        if (QUOTE_CONFIG.accessKey) fd.set('access_key', QUOTE_CONFIG.accessKey);
        fetch(QUOTE_CONFIG.endpoint, { method: 'POST', body: fd, headers: { 'Accept': 'application/json' } })
          .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json ? r.json().catch(function () { return {}; }) : {}; })
          .then(function () {
            showStatus('ok', '<p><strong>Got it, ' + escapeHtml(d.name.split(' ')[0]) + '.</strong> Connor will reach out by ' + escapeHtml(d.contact.toLowerCase()) + ' to set up your free on-site visit.</p><p>Need it faster? Call or text <a href="tel:' + QUOTE_CONFIG.phoneE164 + '">' + QUOTE_CONFIG.phonePretty + '</a>.</p>');
            form.reset();
          })
          .catch(function () {
            showStatus('err', '<p><strong>That didn\'t go through.</strong> Please text or call <a href="tel:' + QUOTE_CONFIG.phoneE164 + '">' + QUOTE_CONFIG.phonePretty + '</a>, or try again in a minute.</p>');
          })
          .finally(function () { submitBtn.disabled = false; submitBtn.textContent = 'Request my free quote'; });
        return;
      }

      // No form service configured: hand the visitor a ready-to-send email and text.
      var subject = 'Quote request from ' + d.name + (d.services.length ? ' — ' + d.services[0] : '');
      var mailto = 'mailto:' + QUOTE_CONFIG.toEmail + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(message);
      var sms = 'sms:' + QUOTE_CONFIG.phoneE164 + '?&body=' + encodeURIComponent(message);
      var html =
        '<p><strong>Your request is ready, ' + escapeHtml(d.name.split(' ')[0]) + '.</strong> Send it with one tap' + (d.photoCount ? ' and attach your photos in the email' : '') + ':</p>' +
        '<div class="actions">' +
        '<a class="btn btn-primary" href="' + mailto + '">Send by email</a>' +
        '<a class="btn btn-dark" href="' + sms + '">Send by text</a>' +
        '<button type="button" class="btn btn-dark" id="copyMsg">Copy message</button>' +
        '</div>' +
        '<pre id="msgPreview">' + escapeHtml(message) + '</pre>' +
        '<p style="margin:0;color:var(--muted);font-size:.9rem">Or call <a href="tel:' + QUOTE_CONFIG.phoneE164 + '">' + QUOTE_CONFIG.phonePretty + '</a>. Email: ' + QUOTE_CONFIG.toEmail + '</p>';
      showStatus('ok', html);
      var copyBtn = $('#copyMsg');
      copyBtn.addEventListener('click', function () {
        function done() { copyBtn.textContent = 'Copied'; setTimeout(function () { copyBtn.textContent = 'Copy message'; }, 1800); }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(message).then(done).catch(function () { selectPreview(); });
        } else { selectPreview(); }
      });
      function selectPreview() {
        var pre = $('#msgPreview'); var r = document.createRange(); r.selectNodeContents(pre);
        var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
      }
      // Try to open the visitor's default mail app straight away.
      try { window.location.href = mailto; } catch (e) { /* the buttons above remain */ }
    });
  }
})();
