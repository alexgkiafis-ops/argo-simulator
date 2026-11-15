/* The pitch slides (docs/05, decision 36; Alex, Nov 8): the team presents the whole pitch from this page in full screen.
   S switches between the slides and the monitor (it was "." at first; Alex changed it the same day). The monitor keeps
   running underneath as it was, and the next S brings back the slide they left. S is also the last letter of the
   operator's word G I A N N I S (decision 34): on the monitor, an S right after G I A N N I finishes the word and
   leaves the slides alone. The slides are the pitch deck exported as images by tools/slides/export-slides.ps1
   (slides/slide-01.png ... and slides/deck.js, their list); they load the first time S is pressed, so a visitor's page
   loads only this file.
   While the slides show, every key is theirs and none reaches the monitor: Right, Down, Page Down, Space, Enter or a
   click for the next slide (a presentation clicker works), Left, Up, Page Up or Backspace for the one before, Home and
   End for the first and the last. The monitor's sound is muted until it comes back (its pulse tone would play under
   the slides).
   F switches full screen on and off, on the slides or the monitor. Esc leaves full screen, as everywhere; browsers do
   not let a page use Esc to go into full screen (it has to stay the way out), so going in is F or the strip's key. */
(() => {
  const NEXT = ['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter'], BACK = ['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'];
  const WORD = ['KeyG', 'KeyI', 'KeyA', 'KeyN', 'KeyN', 'KeyI'];   // G I A N N I, then S
  let box = null, imgs = [], cur = 0, open = false, hushed = false, asked = false, seen = [];   // seen: the last keys the monitor got

  function build() {
    const css = document.createElement('style');
    css.textContent =
      '#deck{position:fixed;inset:0;z-index:2147483000;background:#000;visibility:hidden;opacity:0;' +
      'transition:opacity .2s,visibility 0s .2s;user-select:none;-webkit-user-select:none}' +
      '#deck.on{visibility:visible;opacity:1;transition:opacity .2s}' +
      '#deck img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;display:none}' +
      '#deck img.cur{display:block}';
    document.head.appendChild(css);
    box = document.createElement('div');
    box.id = 'deck';
    box.setAttribute('role', 'region');
    box.setAttribute('aria-label', 'Slides');
    // a click is the next slide, as in PowerPoint; it stays here (the monitor would take it as a tap: sound on, the bar)
    box.addEventListener('pointerdown', e => { e.stopPropagation(); if (e.button === 0) go(cur + 1); });
    box.addEventListener('click', e => e.stopPropagation());
    document.body.appendChild(box);
  }
  function load() {
    if (asked) return;
    asked = true;
    const s = document.createElement('script');
    s.src = 'slides/deck.js';
    s.onload = () => {
      imgs = (window.ARGO_SLIDES || []).map((f, i) => {
        const im = new Image();
        im.alt = 'Slide ' + (i + 1);
        im.draggable = false;
        im.decoding = 'sync';   // shown whole on the frame it is asked for, never a blank frame between slides
        im.src = 'slides/' + f;
        box.appendChild(im);
        return im;
      });
      go(cur);
    };
    s.onerror = () => { asked = false; s.remove(); };   // tried again at the next S
    document.head.appendChild(s);
  }
  function go(i) {
    if (!imgs.length) return;
    cur = Math.max(0, Math.min(imgs.length - 1, i));
    imgs.forEach((im, j) => im.classList.toggle('cur', j === cur));
  }
  function toggle() {
    if (!box) build();
    open = !open;
    box.classList.toggle('on', open);
    if (open) {
      load();
      const a = document.activeElement;   // a focused strip key would take Space or Enter
      if (a && a !== document.body && a.blur) a.blur();
      if (Sfx.status() === 'on') { Sfx.toggle(); hushed = true; }
    } else if (hushed) { hushed = false; Sfx.toggle(); }   // nothing else can change the sound while the slides show
  }

  /* Before the monitor's own keys (app.js): the capture phase on window runs first, and stops them while the slides show */
  addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;   // the browser's own shortcuts (Ctrl+S saves the page)
    const k = e.key, c = e.code;   // by key position, so a Greek layout works too
    const word = !open && c === 'KeyS' && WORD.every((w, i) => seen[i] === w);   // the S of G I A N N I S, for the monitor
    const sl = c === 'KeyS' && !word, fs = c === 'KeyF';
    if (!sl && !fs && !open) { if (!e.repeat) seen = seen.concat(c).slice(-WORD.length); return; }   // the monitor's keys, as before
    e.stopImmediatePropagation();
    if (k === 'Escape' || /^F\d+$/.test(k)) return;   // Esc leaves full screen; F5, F11 ... stay the browser's
    e.preventDefault();
    if (e.repeat) return;
    if (fs) { if (typeof toggleFs === 'function') toggleFs(); }
    else if (sl) toggle();
    else if (NEXT.includes(k)) go(cur + 1);
    else if (BACK.includes(k)) go(cur - 1);
    else if (k === 'Home') go(0);
    else if (k === 'End') go(imgs.length - 1);
  }, true);
})();
