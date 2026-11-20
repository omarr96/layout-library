/* Local business kit: wires up every component from data- attributes.
   Pages only need markup; nothing here is page-specific. */
(function () {
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const ICON = {
    x: '<svg class="kt-svg" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg>',
    l: '<svg class="kt-svg" viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg>',
    r: '<svg class="kt-svg" viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg>',
    play: '<svg viewBox="0 0 24 24"><path d="M7 4v16l13-8z"/></svg>',
    pause: '<svg viewBox="0 0 24 24"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>',
  };

  /* toast */
  const toastEl = document.createElement('div'); toastEl.className = 'kt-toast'; document.body.append(toastEl);
  let tt; window.ktToast = m => { toastEl.textContent = m; toastEl.classList.add('on'); clearTimeout(tt); tt = setTimeout(() => toastEl.classList.remove('on'), 2600); };

  /* split headings into letters (kept per word so lines wrap normally) */
  // styled words inside the heading (an <em>, an outlined <span>) keep their element
  $$('[data-split]').forEach(el => {
    let i = 0;
    const esc = s => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
    const splitText = t => t.split(/(\s+)/).map(w => /^\s+$/.test(w) ? ' ' : w ? `<span class="kt-w">${[...w].map(ch => `<span class="kt-l" style="transition-delay:${(i++) * 28}ms">${esc(ch)}</span>`).join('')}</span>` : '').join('');
    const walk = node => [...node.childNodes].map(n => {
      if (n.nodeType === 3) return splitText(n.textContent);
      if (n.nodeType !== 1) return '';
      if (n.tagName === 'BR') return '<br>';
      const c = n.cloneNode(false); c.innerHTML = walk(n); return c.outerHTML;
    }).join('');
    el.innerHTML = walk(el).trim();
  });

  /* reveal + counters when they scroll into view */
  const count = el => {
    const end = parseFloat(el.dataset.count), dec = (el.dataset.count.split('.')[1] || '').length, t0 = performance.now(), dur = 1600;
    const step = t => { const p = Math.max(0, Math.min(1, (t - t0) / dur)), v = end * (1 - Math.pow(1 - p, 3)); el.textContent = v.toFixed(dec) + (el.dataset.suffix || ''); if (p < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  };
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    const el = e.target;
    setTimeout(() => el.classList.add('in'), +(el.dataset.delay || 0));
    if (el.dataset.count) count(el);
    io.unobserve(el);
  }), { rootMargin: '0px 0px -8% 0px' }) : null;
  const pending = $$('[data-reveal],[data-split],[data-count]');
  pending.forEach(el => io ? io.observe(el) : el.classList.add('in'));
  // backup: also reveal anything already on screen, in case the observer is paused (hidden tabs, old browsers)
  const sweep = () => {
    const h = innerHeight;
    for (let k = pending.length - 1; k >= 0; k--) {
      const el = pending[k], r = el.getBoundingClientRect();
      if (el.classList.contains('in')) { pending.splice(k, 1); continue; }
      if (r.top < h * .95 && r.bottom > 0) { el.classList.add('in'); if (el.dataset.count) count(el); io && io.unobserve(el); pending.splice(k, 1); }
    }
  };
  let sw; addEventListener('scroll', () => { clearTimeout(sw); sw = setTimeout(sweep, 120); }, { passive: true });
  addEventListener('load', () => setTimeout(sweep, 300)); setTimeout(sweep, 1200);

  /* rotating words */
  $$('[data-rotate]').forEach(el => {
    const words = el.dataset.rotate.split('|');
    el.classList.add('kt-rot');
    el.innerHTML = words.map((w, i) => `<span class="${i ? '' : 'on'}">${w}</span>`).join('');
    const spans = $$('span', el); let i = 0;
    setInterval(() => { spans[i].className = 'out'; i = (i + 1) % spans.length; spans[i].className = 'on'; setTimeout(() => spans.forEach((s, k) => k !== i && (s.className = '')), 650); }, +(el.dataset.every || 2400));
  });

  /* typed text */
  $$('[data-type]').forEach(el => {
    const words = el.dataset.type.split('|'); let w = 0, c = 0, del = false;
    const tick = () => {
      const word = words[w]; el.textContent = word.slice(0, c);
      if (!del && c === word.length) { del = true; return setTimeout(tick, 1600); }
      if (del && c === 0) { del = false; w = (w + 1) % words.length; }
      c += del ? -1 : 1; setTimeout(tick, del ? 40 : 85);
    };
    tick();
  });

  /* marquee: repeat the content so the loop never shows a gap */
  $$('.kt-marquee').forEach(m => {
    const t = m.querySelector('.kt-mq-track'); if (!t) return;
    if (m.dataset.speed) m.style.setProperty('--mq-speed', m.dataset.speed);
    m.append(t.cloneNode(true));
    m.lastElementChild.setAttribute('aria-hidden', 'true');
  });

  /* hero background slides */
  $$('[data-heroslides]').forEach(h => {
    const s = [...h.children]; let i = 0; s[0].classList.add('on');
    if (s.length > 1) setInterval(() => { s[i].classList.remove('on'); i = (i + 1) % s.length; s[i].classList.add('on'); }, +(h.dataset.every || 5500));
  });

  /* one-at-a-time slider */
  $$('.kt-slider').forEach(sl => {
    const track = sl.querySelector('.kt-track'), n = track.children.length;
    let i = 0, timer;
    const dots = sl.querySelector('.kt-dots') || sl.parentElement.querySelector('.kt-dots');
    if (dots) dots.innerHTML = Array.from({ length: n }, (_, k) => `<button aria-label="Slide ${k + 1}"></button>`).join('');
    const go = k => { i = (k + n) % n; track.style.transform = `translateX(-${i * 100}%)`; dots && $$('button', dots).forEach((d, j) => d.classList.toggle('on', j === i)); sl.dispatchEvent(new CustomEvent('kt-slide', { detail: i })); };
    const auto = () => { clearInterval(timer); if (sl.dataset.autoplay) timer = setInterval(() => go(i + 1), +sl.dataset.autoplay); };
    const scope = sl.closest('[data-slider-scope]') || sl;
    scope.querySelector('[data-prev]')?.addEventListener('click', () => { go(i - 1); auto(); });
    scope.querySelector('[data-next]')?.addEventListener('click', () => { go(i + 1); auto(); });
    dots && dots.addEventListener('click', e => { const b = e.target.closest('button'); if (b) { go($$('button', dots).indexOf(b)); auto(); } });
    let x0 = null;
    sl.addEventListener('pointerdown', e => x0 = e.clientX);
    sl.addEventListener('pointerup', e => { if (x0 !== null && Math.abs(e.clientX - x0) > 40) { go(i + (e.clientX < x0 ? 1 : -1)); auto(); } x0 = null; });
    go(0); auto();
  });

  /* scroll carousels with arrows */
  $$('[data-carousel]').forEach(c => {
    const scope = c.closest('[data-slider-scope]') || c.parentElement;
    const prev = scope.querySelector('[data-cprev]'), next = scope.querySelector('[data-cnext]');
    const step = () => (c.firstElementChild?.getBoundingClientRect().width || 300) + 20;
    prev?.addEventListener('click', () => c.scrollBy({ left: -step() }));
    next?.addEventListener('click', () => c.scrollBy({ left: step() }));
    const upd = () => { if (prev) prev.disabled = c.scrollLeft < 4; if (next) next.disabled = c.scrollLeft + c.clientWidth > c.scrollWidth - 4; };
    c.addEventListener('scroll', upd, { passive: true }); addEventListener('resize', upd); upd();
  });

  /* tabs */
  $$('[data-tabs]').forEach(t => {
    const btns = $$('[data-tab]', t), panes = $$('[data-pane]', t);
    const show = v => { btns.forEach(b => { b.classList.toggle('on', b.dataset.tab === v); b.setAttribute('aria-selected', b.dataset.tab === v); }); panes.forEach(p => p.classList.toggle('on', p.dataset.pane === v)); };
    btns.forEach(b => { b.setAttribute('role', 'tab'); b.addEventListener('click', () => show(b.dataset.tab)); });
    show((btns.find(b => b.classList.contains('on')) || btns[0])?.dataset.tab);
  });

  /* faq: one open at a time inside a [data-faq] group */
  $$('[data-faq]').forEach(g => $$('details', g).forEach(d => d.addEventListener('toggle', () => { if (d.open) $$('details', g).forEach(o => o !== d && (o.open = false)); })));

  /* lightbox */
  const lb = document.createElement('div'); lb.className = 'kt-lb'; lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true');
  lb.innerHTML = `<span class="kt-lb-c"></span><button class="kt-lb-btn kt-lb-x" aria-label="Close">${ICON.x}</button><button class="kt-lb-btn kt-lb-p" aria-label="Previous">${ICON.l}</button><button class="kt-lb-btn kt-lb-n" aria-label="Next">${ICON.r}</button><figure><img alt=""><figcaption></figcaption></figure>`;
  document.body.append(lb);
  let lbItems = [], lbI = 0;
  const lbShow = k => { lbI = (k + lbItems.length) % lbItems.length; const a = lbItems[lbI]; lb.querySelector('img').src = a.href; lb.querySelector('img').alt = a.dataset.caption || ''; lb.querySelector('figcaption').textContent = a.dataset.caption || ''; lb.querySelector('.kt-lb-c').textContent = `${lbI + 1} / ${lbItems.length}`; };
  const lbClose = () => { lb.classList.remove('on'); document.body.style.overflow = ''; };
  document.addEventListener('click', e => {
    const a = e.target.closest('[data-lightbox] a'); if (!a) return;
    e.preventDefault(); lbItems = $$('a', a.closest('[data-lightbox]')); lbShow(lbItems.indexOf(a)); lb.classList.add('on'); document.body.style.overflow = 'hidden'; lb.querySelector('.kt-lb-x').focus();
  });
  lb.addEventListener('click', e => { if (e.target === lb || e.target.closest('.kt-lb-x')) lbClose(); else if (e.target.closest('.kt-lb-p')) lbShow(lbI - 1); else if (e.target.closest('.kt-lb-n')) lbShow(lbI + 1); });

  /* video modal */
  const vm = document.createElement('div'); vm.className = 'kt-vm'; vm.setAttribute('role', 'dialog'); vm.setAttribute('aria-modal', 'true');
  vm.innerHTML = `<button class="kt-lb-btn" aria-label="Close">${ICON.x}</button><video controls playsinline></video>`;
  document.body.append(vm);
  const vClose = () => { const v = vm.querySelector('video'); v.pause(); v.removeAttribute('src'); v.load(); vm.classList.remove('on'); document.body.style.overflow = ''; };
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-video]'); if (!b) return;
    e.preventDefault(); const v = vm.querySelector('video'); v.src = b.dataset.video; if (b.dataset.poster) v.poster = b.dataset.poster;
    vm.classList.add('on'); document.body.style.overflow = 'hidden'; v.play().catch(() => {});
  });
  vm.addEventListener('click', e => { if (e.target === vm || e.target.closest('.kt-lb-btn')) vClose(); });
  addEventListener('keydown', e => {
    if (lb.classList.contains('on')) { if (e.key === 'Escape') lbClose(); if (e.key === 'ArrowLeft') lbShow(lbI - 1); if (e.key === 'ArrowRight') lbShow(lbI + 1); }
    if (vm.classList.contains('on') && e.key === 'Escape') vClose();
  });

  /* audio: a small music player that makes its own sound in the browser,
     so no audio file is needed. Moods: lofi, calm, drive, jazz. */
  let ctx = null, current = null;
  const MOODS = {
    lofi: { bpm: 78, chords: [[57, 60, 64, 67], [53, 57, 60, 64], [55, 59, 62, 65], [52, 55, 59, 62]], wave: 'triangle', drums: 'soft', bass: true },
    calm: { bpm: 52, chords: [[60, 64, 67, 71], [57, 60, 64, 69], [53, 57, 60, 64], [55, 59, 62, 67]], wave: 'sine', drums: null, bass: false },
    drive: { bpm: 122, chords: [[57, 60, 64], [53, 57, 60], [60, 64, 67], [55, 59, 62]], wave: 'sawtooth', drums: 'hard', bass: true },
    jazz: { bpm: 96, chords: [[62, 65, 69, 72], [55, 59, 62, 65], [60, 64, 67, 71], [57, 61, 64, 67]], wave: 'triangle', drums: 'brush', bass: true },
  };
  const hz = n => 440 * Math.pow(2, (n - 69) / 12);
  function startMusic(mood, vol) {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    const M = MOODS[mood] || MOODS.lofi, out = ctx.createGain(); out.gain.value = vol; out.connect(ctx.destination);
    const filt = ctx.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = M.wave === 'sawtooth' ? 1600 : 2400; filt.connect(out);
    const beat = 60 / M.bpm; let t = ctx.currentTime + .05, bar = 0, stop = false;
    const note = (f, t0, len, type, g) => { const o = ctx.createOscillator(), a = ctx.createGain(); o.type = type; o.frequency.value = f; a.gain.setValueAtTime(0, t0); a.gain.linearRampToValueAtTime(g, t0 + .04); a.gain.exponentialRampToValueAtTime(.0005, t0 + len); o.connect(a); a.connect(filt); o.start(t0); o.stop(t0 + len + .05); };
    const noise = (t0, len, g, hp) => { const b = ctx.createBuffer(1, ctx.sampleRate * len, ctx.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), a = ctx.createGain(); s.buffer = b; f.type = 'highpass'; f.frequency.value = hp; a.gain.setValueAtTime(g, t0); a.gain.exponentialRampToValueAtTime(.0005, t0 + len); s.connect(f); f.connect(a); a.connect(out); s.start(t0); };
    const kick = (t0, g) => { const o = ctx.createOscillator(), a = ctx.createGain(); o.frequency.setValueAtTime(130, t0); o.frequency.exponentialRampToValueAtTime(45, t0 + .18); a.gain.setValueAtTime(g, t0); a.gain.exponentialRampToValueAtTime(.001, t0 + .3); o.connect(a); a.connect(out); o.start(t0); o.stop(t0 + .32); };
    const sched = () => {
      if (stop) return;
      while (t < ctx.currentTime + 1.2) {
        const ch = M.chords[bar % M.chords.length];
        ch.forEach((n, k) => note(hz(n), t + k * .015, beat * 3.8, M.wave, .05));
        if (M.bass) for (let b = 0; b < 4; b += 2) note(hz(ch[0] - 24), t + b * beat, beat * 1.6, 'sine', .14);
        for (let s = 0; s < 4; s++) { const tt0 = t + s * beat;
          if (M.drums === 'soft') { if (s % 2 === 0) kick(tt0, .35); noise(tt0 + beat / 2, .05, .05, 6000); if (s % 2) noise(tt0, .12, .06, 1800); }
          if (M.drums === 'hard') { kick(tt0, .55); noise(tt0 + beat / 2, .04, .08, 7000); if (s % 2) noise(tt0, .16, .12, 1500); }
          if (M.drums === 'brush') { noise(tt0, .18, .035, 3000); noise(tt0 + beat * .66, .1, .025, 3000); }
          if (M.wave !== 'sawtooth' && Math.random() < .5) note(hz(ch[(s + bar) % ch.length] + 12), tt0 + beat * .5, beat * .9, 'sine', .035);
        }
        t += beat * 4; bar++;
      }
      setTimeout(sched, 300);
    };
    sched();
    return { set: v => out.gain.setTargetAtTime(v, ctx.currentTime, .1), stop: () => { stop = true; out.gain.setTargetAtTime(0, ctx.currentTime, .15); setTimeout(() => out.disconnect(), 800); } };
  }
  $$('[data-audio]').forEach(el => {
    el.classList.add('kt-audio');
    el.innerHTML = `<button class="kt-a-btn" aria-label="Play">${ICON.play}</button><div class="kt-a-t"><b>${el.dataset.title || 'Now playing'}</b><small>${el.dataset.sub || ''}</small></div><span class="kt-bars"><i></i><i></i><i></i><i></i><i></i></span><input type="range" min="0" max="100" value="45" aria-label="Volume">`;
    const btn = el.querySelector('.kt-a-btn'), vol = el.querySelector('input');
    let player = null;
    btn.addEventListener('click', () => {
      if (player) { player.stop(); player = null; current = null; el.classList.remove('playing'); btn.innerHTML = ICON.play; btn.setAttribute('aria-label', 'Play'); return; }
      if (current) current.el.querySelector('.kt-a-btn').click();
      player = startMusic(el.dataset.audio, vol.value / 220); current = { el };
      el.classList.add('playing'); btn.innerHTML = ICON.pause; btn.setAttribute('aria-label', 'Pause');
    });
    vol.addEventListener('input', () => player && player.set(vol.value / 220));
  });

  /* before / after */
  $$('.kt-compare').forEach(c => { const r = c.querySelector('input'); r.addEventListener('input', () => c.style.setProperty('--pos', r.value + '%')); });

  /* forms: demo only */
  $$('form[data-form]').forEach(f => f.addEventListener('submit', e => { e.preventDefault(); ktToast(f.dataset.form || 'Thanks! We will be in touch soon.'); f.reset(); }));

  /* nav: solid after scrolling, burger menu on phones */
  $$('[data-nav]').forEach(n => {
    const upd = () => n.classList.toggle('scrolled', scrollY > 30); addEventListener('scroll', upd, { passive: true }); upd();
    n.querySelector('.kt-burger')?.addEventListener('click', () => n.classList.toggle('open'));
    $$('.kt-menu a', n).forEach(a => a.addEventListener('click', () => n.classList.remove('open')));
  });
  document.addEventListener('click', e => { const a = e.target.closest('a[href="#"]'); if (a && !a.closest('[data-lightbox]')) e.preventDefault(); });
})();
