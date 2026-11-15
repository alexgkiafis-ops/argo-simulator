/* Large on-screen announcements for key moments (Alex's v2 review, Nov 7). A band across the middle of the
   screen that nobody can miss, which then shrinks into the banner, clocks or panel that keeps the detail.
   The event log still records every event, but it is never the only place an event shows.
   Ann.show(spec) queues an announcement and resolves once it has landed; Ann.clear() drops everything.
   spec.sound, if given, plays as the band appears (the alarm or the Earth link, sound.js). */
const Ann = (() => {
  const root = document.getElementById('ann');
  const box = root.querySelector('.ann-box'), inner = root.querySelector('.ann-in'), scrim = root.querySelector('.ann-scrim');
  const BOX = { l: 16, t: 352, h: 376 };   // stage pixels, matches .ann-box in style.css; its width is the stage's less 32
  root.querySelector('.ann-dots').innerHTML = Array.from({ length: 26 }, (_, i) => `<i style="animation-delay:${(i * 0.045).toFixed(3)}s"></i>`).join('');
  let gen = 0, chain = Promise.resolve(), live = [];
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const anim = (el, kf, o) => { const a = el.animate(kf, o); live.push(a); return a.finished.catch(() => {}); };

  function fill(a) {
    box.className = 'ann-box ' + a.kind;
    root.querySelector('.ann-lv').textContent = a.level;
    root.querySelector('.ann-code').textContent = a.code;
    root.querySelector('.ann-tm').textContent = a.time;
    root.querySelector('.ann-title').textContent = a.title;
    root.querySelector('.ann-sub').innerHTML = a.sub;
    const link = root.querySelector('.ann-link');
    link.classList.toggle('hide', !a.link);
    if (a.link) { root.querySelector('.ann-from').textContent = a.link[0]; root.querySelector('.ann-to').textContent = a.link[1]; }
  }
  function reset() {
    live.forEach(a => a.cancel()); live = [];
    root.classList.remove('on', 'frozen');
    box.classList.remove('go', 'flash');
  }
  async function run(a, my) {
    fill(a);
    root.classList.add('on');
    box.classList.add('go');
    if (a.sound) a.sound();
    anim(scrim, [{ opacity: 0 }, { opacity: 1 }], { duration: 240, fill: 'forwards' });
    await anim(box, [{ clipPath: 'inset(47% 0 47% 0 round 8px)', transform: 'scaleX(.97)' }, { clipPath: 'inset(0 0 0 0 round 8px)', transform: 'none' }],
      { duration: 300, easing: 'cubic-bezier(.2, .8, .2, 1)' });
    if (my !== gen) return;
    if (a.flash) { box.style.setProperty('--n', a.flash); box.classList.add('flash'); }
    await sleep(a.hold);
    if (my !== gen) return;
    box.classList.remove('flash');
    // settle: the band flies into its target and the target takes over
    const r = a.target();
    // on a phone (docs/05, decision 32) the band has the phone's own size and place (style.css), so read them
    const B = document.body.classList.contains('phone') ? { l: box.offsetLeft, t: box.offsetTop, h: box.offsetHeight } : BOX;
    const to = `translate(${r.l - B.l}px, ${r.t - B.t}px) scale(${r.w / (box.offsetWidth || 1888)}, ${r.h / B.h})`;
    anim(inner, [{ opacity: 1 }, { opacity: 0 }], { duration: 150, fill: 'forwards' });
    anim(scrim, [{ opacity: 1 }, { opacity: 0 }], { duration: 560, easing: 'ease-in', fill: 'forwards' });
    const done = anim(box, [{ transform: 'none', opacity: 1 }, { transform: to, opacity: 1, offset: 0.8 }, { transform: to, opacity: 0 }],
      { duration: 640, easing: 'cubic-bezier(.7, 0, .25, 1)', fill: 'forwards' });
    await sleep(500);
    if (my !== gen) return;
    if (a.land) a.land();
    await done;
    if (my !== gen) return;
    reset();
  }
  return {
    show(a) {
      const my = gen;
      const p = chain.then(() => (my === gen ? run(a, my) : undefined));
      chain = p.catch(() => {});
      return p;
    },
    clear() { gen++; reset(); chain = Promise.resolve(); },
    /* static, for screenshots */
    freeze(a) { reset(); fill(a); root.classList.add('on', 'frozen'); }
  };
})();
