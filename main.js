/* ============================================================
   LUMINA DIGITAL — main.js
   Plain ES5 JavaScript. No libraries, no transpiling.
   Designed to run on IE9+ and all modern browsers.

   Features:
     - Preloader
     - Scroll progress bar
     - Sticky header state
     - Scrollspy navigation (highlights the section you're in)
     - Smooth animated scrolling (JS-driven, works without CSS scroll-behavior)
     - Reveal-on-scroll animations (feature-detected)
     - Animated counters & skill bars
     - Hero typing effect + parallax
     - Portfolio filtering + lightbox
     - Testimonial carousel
     - Monthly/Yearly pricing toggle
     - FAQ accordion
     - Contact form validation
     - Back-to-top button
   ============================================================ */
(function (window, document) {
  'use strict';

  var doc = document;
  var html = doc.documentElement;
  var HEADER_H = 68; /* fixed header height, used for scroll offsets */

  /* ---------------- tiny helpers ---------------- */

  function $(id) { return doc.getElementById(id); }

  function on(el, type, fn) {
    if (!el) { return; }
    if (el.addEventListener) { el.addEventListener(type, fn, false); }
    else if (el.attachEvent) { el.attachEvent('on' + type, fn); } /* IE8 fallback */
    else { el['on' + type] = fn; }
  }

  function hasClass(el, c) {
    if (!el || !el.className) { return false; }
    return (' ' + el.className + ' ').indexOf(' ' + c + ' ') !== -1;
  }
  function addClass(el, c) {
    if (!el || hasClass(el, c)) { return; }
    el.className += (el.className ? ' ' : '') + c;
  }
  function removeClass(el, c) {
    if (!el) { return; }
    var cls = ' ' + el.className + ' ';
    cls = cls.replace(' ' + c + ' ', ' ');
    el.className = cls.replace(/^\s+|\s+$/g, '');
  }

  /* requestAnimationFrame with vendor prefixes + setTimeout fallback */
  var raf = window.requestAnimationFrame ||
            window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame ||
            function (cb) { return window.setTimeout(function () { cb(new Date().getTime()); }, 16); };
  var caf = window.cancelAnimationFrame ||
            window.webkitCancelAnimationFrame ||
            window.mozCancelAnimationFrame ||
            function (id) { window.clearTimeout(id); };

  /* ---------------- feature detection ---------------- */

  var supportsTransition = 'transition' in html.style;
  var transformProp = null;
  if ('transform' in html.style) { transformProp = 'transform'; }
  else if ('webkitTransform' in html.style) { transformProp = 'webkitTransform'; }
  else if ('msTransform' in html.style) { transformProp = 'msTransform'; }
  else if ('mozTransform' in html.style) { transformProp = 'mozTransform'; }
  var supportsTransform = !!transformProp;

  function setTransform(el, val) {
    if (!el || !supportsTransform) { return; }
    el.style[transformProp] = val;
  }

  /* Only enable reveal-animations when the browser can actually animate,
     so IE9 and friends simply show all content immediately. */
  var jsAnim = supportsTransition && supportsTransform;
  if (jsAnim) { addClass(html, 'js-anim'); }

  /* ---------------- scroll state helpers ---------------- */

  function getScrollY() {
    return window.pageYOffset || doc.documentElement.scrollTop || doc.body.scrollTop || 0;
  }
  function getDocHeight() {
    var b = doc.body, d = doc.documentElement;
    return Math.max(
      b.scrollHeight, d.scrollHeight,
      b.offsetHeight, d.offsetHeight,
      b.clientHeight, d.clientHeight
    );
  }
  function getViewportH() {
    return window.innerHeight || doc.documentElement.clientHeight || 0;
  }
  function getOffsetTop(el) {
    var top = 0;
    while (el) {
      top += (el.offsetTop || 0);
      el = el.offsetParent;
    }
    return top;
  }

  function smoothScrollTo(targetY, duration) {
    var startY = getScrollY();
    var diff = targetY - startY;
    var startTime = null;
    var dur = duration || 650;

    if (Math.abs(diff) < 2) { return; }

    function easeInOutCubic(t) {
      if (t < 0.5) { return 4 * t * t * t; }
      return 1 - Math.pow(-2 * t + 2, 3) / 2;
    }
    function step(now) {
      if (startTime === null) { startTime = now; }
      var elapsed = now - startTime;
      var p = Math.min(elapsed / dur, 1);
      window.scrollTo(0, Math.round(startY + diff * easeInOutCubic(p)));
      if (p < 1) { raf(step); }
    }
    raf(step);
  }

  /* ---------------- preloader ---------------- */

  var preloader = doc.createElement('div');
  preloader.id = 'preloader';
  preloader.innerHTML = '<div class="spinner"></div><div class="load-text">Loading&hellip;</div>';
  doc.body.appendChild(preloader);

  function hidePreloader() {
    if (!preloader) { return; }
    addClass(preloader, 'done');
    window.setTimeout(function () {
      if (preloader.parentNode) { preloader.parentNode.removeChild(preloader); }
    }, 600);
  }
  on(window, 'load', hidePreloader);
  window.setTimeout(hidePreloader, 4000); /* safety net if images hang */

  /* ---------------- elements ---------------- */

  var headerEl = $('siteHeader');
  var progressFill = $('progressFill');
  var toTop = $('toTop');
  var heroBg = $('heroBg');
  var typedEl = $('typed');

  /* nav */
  var navToggle = $('navToggle');
  var mainNav = $('mainNav');
  var navScrim = null;

  /* sections for scrollspy, built from the nav links */
  var rawLinks = doc.querySelectorAll('.nav-link');
  var sections = [];
  var i, j;
  for (i = 0; i < rawLinks.length; i++) {
    var href = rawLinks[i].getAttribute('href');
    if (href && href.charAt(0) === '#') {
      var secEl = $(href.slice(1));
      if (secEl) {
        sections.push({ id: href.slice(1), el: secEl, link: rawLinks[i] });
      }
    }
  }

  /* ---------------- mobile nav ---------------- */

  function closeMobileNav() {
    if (!mainNav) { return; }
    removeClass(navToggle, 'open');
    removeClass(mainNav, 'open');
    navToggle.setAttribute('aria-expanded', 'false');
    if (navScrim && navScrim.parentNode) { navScrim.parentNode.removeChild(navScrim); }
    navScrim = null;
  }

  function openMobileNav() {
    addClass(navToggle, 'open');
    addClass(mainNav, 'open');
    navToggle.setAttribute('aria-expanded', 'true');
    if (!navScrim) {
      navScrim = doc.createElement('div');
      addClass(navScrim, 'nav-scrim');
      on(navScrim, 'click', closeMobileNav);
      doc.body.appendChild(navScrim);
    }
  }

  if (navToggle && mainNav) {
    on(navToggle, 'click', function () {
      if (hasClass(mainNav, 'open')) { closeMobileNav(); }
      else { openMobileNav(); }
    });
  }

  /* ---------------- smooth scrolling for anchor links ---------------- */

  on(doc, 'click', function (e) {
    var t = e.target || e.srcElement;
    var anchor = t;
    while (anchor && anchor.nodeName !== 'A' && anchor !== doc) {
      anchor = anchor.parentNode;
    }
    if (!anchor || anchor.nodeName !== 'A') { return; }
    var h = anchor.getAttribute('href');
    if (!h || h.charAt(0) !== '#') { return; }
    var targetEl = $(h.slice(1));
    if (!targetEl) { return; }

    if (e.preventDefault) { e.preventDefault(); }
    else { e.returnValue = false; }
    var y = getOffsetTop(targetEl) - HEADER_H + 2;
    if (y < 0) { y = 0; }
    smoothScrollTo(y, 750);
    closeMobileNav();
  });

  on(toTop, 'click', function (e) {
    e.preventDefault();
    smoothScrollTo(0, 600);
  });

  /* ---------------- scrollspy + scroll effects ---------------- */

  var revealEls = [];
  if (jsAnim) {
    var allReveals = doc.querySelectorAll('.reveal');
    for (i = 0; i < allReveals.length; i++) {
      var el = allReveals[i];
      /* stagger: count previous reveal siblings inside the same parent */
      var sib = el.parentNode ? el.parentNode.firstChild : null;
      var idx = 0;
      while (sib) {
        if (sib === el) { break; }
        if (sib.nodeType === 1 && hasClass(sib, 'reveal')) { idx++; }
        sib = sib.nextSibling;
      }
      el.style.transitionDelay = Math.min(idx * 0.12, 0.72) + 's';
      revealEls.push(el);
    }
  }

  function revealCheck() {
    var vh = getViewportH();
    var i2;
    for (i2 = 0; i2 < revealEls.length; i2++) {
      var r = revealEls[i2];
      if (hasClass(r, 'in')) { continue; }
      var rect = r.getBoundingClientRect();
      if (rect.top < vh - 60) {
        addClass(r, 'in');
        (function (node) {
          window.setTimeout(function () { node.style.transitionDelay = '0s'; }, 1000);
        })(r);
      }
    }
  }

  var statsEl = $('stats');
  var statsDone = false;
  function animateCounter(el) {
    if (el._done) { return; }
    el._done = true;
    var target = parseInt(el.getAttribute('data-target'), 10) || 0;
    var start = null;
    var dur = 1500;
    function step(now) {
      if (start === null) { start = now; }
      var p = Math.min((now - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.innerHTML = String(Math.round(target * eased));
      if (p < 1) { raf(step); }
      else { el.innerHTML = String(target); }
    }
    raf(step);
  }
  function maybeCounters() {
    if (statsDone || !statsEl) { return; }
    var rect = statsEl.getBoundingClientRect();
    if (rect.top < getViewportH() - 40) {
      statsDone = true;
      var cs = statsEl.querySelectorAll('.counter');
      for (i = 0; i < cs.length; i++) {
        (function (c, k) {
          window.setTimeout(function () { animateCounter(c); }, k * 180);
        })(cs[i], i);
      }
    }
  }

  var skillDone = false;
  function maybeSkills() {
    if (skillDone) { return; }
    var first = doc.querySelector('.skill-fill');
    if (!first) { return; }
    if (first.getBoundingClientRect().top < getViewportH() - 40) {
      skillDone = true;
      var fills = doc.querySelectorAll('.skill-fill');
      for (i = 0; i < fills.length; i++) {
        var val = parseInt(fills[i].getAttribute('data-value'), 10) || 0;
        (function (f, v) {
          window.setTimeout(function () { f.style.width = v + '%'; }, i * 130);
        })(fills[i], val);
      }
    }
  }

  function updateSpy(y) {
    var currentId = null;
    for (i = 0; i < sections.length; i++) {
      if (y + HEADER_H + 80 >= getOffsetTop(sections[i].el)) {
        currentId = sections[i].id;
      }
    }
    /* pin to the last section when scrolled to the very bottom */
    if (sections.length && y + getViewportH() >= getDocHeight() - 4) {
      currentId = sections[sections.length - 1].id;
    }
    for (j = 0; j < sections.length; j++) {
      if (sections[j].id === currentId) { addClass(sections[j].link, 'active'); }
      else { removeClass(sections[j].link, 'active'); }
    }
  }

  function heroParallax(y) {
    if (heroBg) { setTransform(heroBg, 'translateY(' + Math.round(y * 0.3) + 'px)'); }
  }

  function onScroll() {
    var y = getScrollY();

    /* progress bar */
    if (progressFill) {
      var max = getDocHeight() - getViewportH();
      progressFill.style.width = (max > 0 ? (y / max) * 100 : 0) + '%';
    }
    /* header shadow */
    if (headerEl) {
      if (y > 10) { addClass(headerEl, 'scrolled'); }
      else { removeClass(headerEl, 'scrolled'); }
    }
    /* back to top */
    if (toTop) {
      if (y > 420) { addClass(toTop, 'show'); }
      else { removeClass(toTop, 'show'); }
    }
    updateSpy(y);
    revealCheck();
    maybeCounters();
    maybeSkills();
    heroParallax(y);
  }

  var ticking = false;
  function requestTick() {
    if (ticking) { return; }
    ticking = true;
    raf(function () {
      ticking = false;
      onScroll();
    });
  }
  on(window, 'scroll', requestTick);
  on(window, 'resize', function () {
    /* close the mobile drawer if we grew back to desktop width */
    if (mainNav && window.innerWidth > 992) { closeMobileNav(); }
    requestTick();
  });

  /* ---------------- hero typing effect ---------------- */

  var words = ['digital presence', 'new feel', 'delighted friendship', 'scoring',];
  var wordIdx = 0;
  var charIdx = 0;
  var erasing = false;

  function typeStep() {
    if (!typedEl) { return; }
    var word = words[wordIdx];
    if (!erasing) {
      charIdx++;
      typedEl.innerHTML = word.slice(0, charIdx);
      if (charIdx === word.length) {
        erasing = true;
        window.setTimeout(typeStep, 1700);
        return;
      }
    } else {
      charIdx--;
      typedEl.innerHTML = word.slice(0, charIdx);
      if (charIdx === 0) {
        erasing = false;
        wordIdx = (wordIdx + 1) % words.length;
        window.setTimeout(typeStep, 400);
        return;
      }
    }
    window.setTimeout(typeStep, erasing ? 45 : 95);
  }
  window.setTimeout(typeStep, 1400);

  /* ---------------- portfolio filters ---------------- */

  var workItems = doc.querySelectorAll('.work-item');
  var filterBtns = doc.querySelectorAll('.filter-btn');

  function applyFilter(filter) {
    for (i = 0; i < filterBtns.length; i++) {
      if (filterBtns[i].getAttribute('data-filter') === filter) {
        addClass(filterBtns[i], 'active');
      } else {
        removeClass(filterBtns[i], 'active');
      }
    }
    for (j = 0; j < workItems.length; j++) {
      var item = workItems[j];
      var cat = item.getAttribute('data-category');
      if (filter === 'all' || cat === filter) {
        removeClass(item, 'hidden-item');
        removeClass(item, 'show-in');
        void item.offsetWidth; /* force reflow to restart animation */
        addClass(item, 'show-in');
      } else {
        addClass(item, 'hidden-item');
      }
    }
  }

  for (i = 0; i < filterBtns.length; i++) {
    (function (btn) {
      on(btn, 'click', function () {
        applyFilter(btn.getAttribute('data-filter'));
      });
    })(filterBtns[i]);
  }

  /* ---------------- lightbox ---------------- */

  var lightbox = $('lightbox');
  var lbImage = $('lbImage');
  var lbTitle = $('lbTitle');
  var lbCaption = $('lbCaption');
  var lbItems = [];
  var lbIndex = 0;

  function visibleWorkItems() {
    var arr = [];
    for (i = 0; i < workItems.length; i++) {
      if (!hasClass(workItems[i], 'hidden-item')) { arr.push(workItems[i]); }
    }
    return arr;
  }
  function showLbItem() {
    var it = lbItems[lbIndex];
    if (!it) { return; }
    lbImage.src = it.getAttribute('data-src');
    lbImage.alt = it.getAttribute('data-title');
    lbTitle.innerHTML = it.getAttribute('data-title');
    lbCaption.innerHTML = it.getAttribute('data-caption');
  }
  function openLb(index) {
    lbItems = visibleWorkItems();
    if (!lbItems.length) { return; }
    lbIndex = index;
    showLbItem();
    lightbox.removeAttribute('hidden');
    doc.body.style.overflow = 'hidden';
  }
  function closeLb() {
    lightbox.setAttribute('hidden', 'hidden');
    doc.body.style.overflow = '';
  }
  function nextLb() {
    if (!lbItems.length) { return; }
    lbIndex = (lbIndex + 1) % lbItems.length;
    showLbItem();
  }
  function prevLb() {
    if (!lbItems.length) { return; }
    lbIndex = (lbIndex - 1 + lbItems.length) % lbItems.length;
    showLbItem();
  }

  if (lightbox) {
    var workGrid = $('workGrid');
    on(workGrid, 'click', function (e) {
      var t = e.target || e.srcElement;
      var fig = t;
      while (fig && fig !== workGrid && fig.nodeName !== 'FIGURE') {
        fig = fig.parentNode;
      }
      if (!fig || fig.nodeName !== 'FIGURE') { return; }
      var arr = visibleWorkItems();
      for (i = 0; i < arr.length; i++) {
        if (arr[i] === fig) { openLb(i); break; }
      }
    });
    on($('lbClose'), 'click', closeLb);
    on($('lbPrev'), 'click', prevLb);
    on($('lbNext'), 'click', nextLb);
    on(lightbox, 'click', function (e) {
      var t = e.target || e.srcElement;
      if (t === lightbox) { closeLb(); }
    });
  }

  /* ---------------- testimonial slider ---------------- */

  var slides = doc.querySelectorAll('#slider .slide');
  var dotsBox = $('slideDots');
  var dots = [];
  var slideIndex = 0;
  var slideTimer = null;

  function goToSlide(idx) {
    slideIndex = (idx + slides.length) % slides.length;
    for (i = 0; i < slides.length; i++) {
      if (i === slideIndex) { addClass(slides[i], 'active'); }
      else { removeClass(slides[i], 'active'); }
    }
    for (j = 0; j < dots.length; j++) {
      if (j === slideIndex) { addClass(dots[j], 'active'); }
      else { removeClass(dots[j], 'active'); }
    }
  }
  function nextSlide() { goToSlide(slideIndex + 1); }
  function prevSlide() { goToSlide(slideIndex - 1); }
  function stopAuto() { if (slideTimer) { clearInterval(slideTimer); slideTimer = null; } }
  function startAuto() {
    stopAuto();
    if (slides.length > 1) { slideTimer = setInterval(nextSlide, 6000); }
  }

  if (dotsBox && slides.length) {
    for (i = 0; i < slides.length; i++) {
      (function (idx) {
        var d = doc.createElement('button');
        d.setAttribute('aria-label', 'Show testimonial ' + (idx + 1));
        on(d, 'click', function () { goToSlide(idx); startAuto(); });
        dotsBox.appendChild(d);
        dots.push(d);
      })(i);
    }
    goToSlide(0);
    startAuto();
    var slider = $('slider');
    on(slider, 'mouseenter', stopAuto);
    on(slider, 'mouseleave', startAuto);
    on($('slideNext'), 'click', function () { nextSlide(); startAuto(); });
    on($('slidePrev'), 'click', function () { prevSlide(); startAuto(); });
  }

  /* ---------------- pricing toggle ---------------- */

  var billingSwitch = $('billingSwitch');
  var labelMonthly = $('labelMonthly');
  var labelYearly = $('labelYearly');
  var priceCards = doc.querySelectorAll('.price-card');

  function applyBilling(yearly) {
    for (i = 0; i < priceCards.length; i++) {
      var card = priceCards[i];
      var amountEl = card.querySelector('.amount');
      if (amountEl) {
        amountEl.innerHTML = yearly ? card.getAttribute('data-yearly') : card.getAttribute('data-monthly');
        removeClass(amountEl, 'pop');
        void amountEl.offsetWidth;
        addClass(amountEl, 'pop');
      }
    }
    if (yearly) {
      addClass(labelYearly, 'active');
      removeClass(labelMonthly, 'active');
    } else {
      addClass(labelMonthly, 'active');
      removeClass(labelYearly, 'active');
    }
  }
  if (billingSwitch) {
    on(billingSwitch, 'change', function () {
      applyBilling(!!billingSwitch.checked);
    });
  }

  /* ---------------- FAQ accordion ---------------- */

  var faqItems = doc.querySelectorAll('.faq-item');
  function closeOtherFaq(keep) {
    for (i = 0; i < faqItems.length; i++) {
      var item = faqItems[i];
      if (item === keep) { continue; }
      removeClass(item, 'open');
      var ans = item.querySelector('.faq-a');
      if (ans) { ans.style.maxHeight = '0px'; }
      var q = item.querySelector('.faq-q');
      if (q) { q.setAttribute('aria-expanded', 'false'); }
    }
  }
  for (i = 0; i < faqItems.length; i++) {
    (function (item) {
      var q = item.querySelector('.faq-q');
      var a = item.querySelector('.faq-a');
      if (!q || !a) { return; }
      on(q, 'click', function () {
        var isOpen = hasClass(item, 'open');
        closeOtherFaq(item);
        if (isOpen) {
          removeClass(item, 'open');
          a.style.maxHeight = '0px';
          q.setAttribute('aria-expanded', 'false');
        } else {
          addClass(item, 'open');
          a.style.maxHeight = a.scrollHeight + 'px';
          q.setAttribute('aria-expanded', 'true');
        }
      });
    })(faqItems[i]);
  }

  /* ---------------- contact form ---------------- */

  var contactForm = $('contactForm');
  var emailRe = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  var trim = function (s) { return s.replace(/^\s+|\s+$/g, ''); };

  function setFieldError(key, msg) {
    var field = $('f' + key.charAt(0).toUpperCase() + key.slice(1));
    var err = $('err' + key);
    if (!field) { return; }
    if (msg) { addClass(field.parentNode, 'error'); } else { removeClass(field.parentNode, 'error'); }
    if (err) { err.innerHTML = msg || ''; }
  }

  function validateForm() {
    var ok = true;
    if (!trim(fName.value)) { setFieldError('name', 'Please tell us your name.'); ok = false; }
    else { setFieldError('name', ''); }

    var email = trim(fEmail.value);
    if (!email) { setFieldError('email', 'Please enter your email address.'); ok = false; }
    else if (!emailRe.test(email)) { setFieldError('email', 'That email address does not look right.'); ok = false; }
    else { setFieldError('email', ''); }

    if (!trim(fSubject.value)) { setFieldError('subject', 'Please add a subject.'); ok = false; }
    else { setFieldError('subject', ''); }

    if (trim(fMessage.value).length < 10) { setFieldError('message', 'Please write at least 10 characters.'); ok = false; }
    else { setFieldError('message', ''); }

    return ok;
  }

  if (contactForm) {
    var fName = $('fName'), fEmail = $('fEmail'), fSubject = $('fSubject'), fMessage = $('fMessage');
    on(contactForm, 'submit', function (e) {
      e.preventDefault();
      if (validateForm()) {
        contactForm.setAttribute('hidden', 'hidden');
        $('formSuccess').removeAttribute('hidden');
      } else {
        removeClass(contactForm, 'shake');
        void contactForm.offsetWidth;
        addClass(contactForm, 'shake');
      }
    });
    on($('formAgain'), 'click', function () {
      $('formSuccess').setAttribute('hidden', 'hidden');
      contactForm.removeAttribute('hidden');
    });
  }

  /* ---------------- newsletter ---------------- */

  var newsForm = $('newsForm');
  if (newsForm) {
    on(newsForm, 'submit', function (e) {
      e.preventDefault();
      var input = $('newsEmail');
      var msg = $('newsMsg');
      var val = trim(input.value);
      if (!emailRe.test(val)) {
        msg.innerHTML = 'Please enter a valid email address.';
        addClass(msg, 'err');
      } else {
        msg.innerHTML = '&#10003; You are on the list. Welcome!';
        removeClass(msg, 'err');
        input.value = '';
      }
    });
  }

  /* ---------------- keyboard shortcuts ---------------- */

  on(doc, 'keydown', function (e) {
    var k = e.keyCode || e.which;
    if (k === 27) { /* Escape */
      closeLb();
      closeMobileNav();
    }
    if (lightbox && !lightbox.hasAttribute('hidden')) {
      if (k === 37) { prevLb(); }        /* left arrow */
      else if (k === 39) { nextLb(); }   /* right arrow */
    }
  });

  /* ---------------- boot ---------------- */

  onScroll();
  window.setTimeout(function () {
    onScroll();
    revealCheck();
  }, 300);

})(window, document);
