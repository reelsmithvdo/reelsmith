'use strict';
// Touch screens and small screens (iPad, Android tablets, phones) — one code base for every screen:
//  • html.touch   when the main pointer is a finger; html.compact on phone-width screens (≤ 760 px)
//  • long-press opens the context menu (iOS has no native one)
//  • an interrupted touch gesture always ends a drag (pointercancel → pointerup)
//  • phones: Program monitor + Timeline fill the screen; the other panels open as bottom sheets
//    from a tab bar (Media, Effects, Edit, Captions, Library, Audio)
(function (RS) {
  const T = RS.touch = {};
  const root = document.documentElement;
  const coarse = window.matchMedia('(pointer: coarse)');
  const phone = window.matchMedia('(max-width: 760px)');
  const apply = () => {
    root.classList.toggle('touch', coarse.matches || navigator.maxTouchPoints > 1 && !window.matchMedia('(pointer: fine)').matches);
    root.classList.toggle('compact', phone.matches);
    if (!phone.matches) T.closeSheet();
    setTimeout(() => { if (RS.timeline && RS.timeline.render) RS.timeline.render(); if (RS.engine) RS.engine.invalidate(); }, 50);
  };
  T.isPhone = () => phone.matches;

  // ---------- gestures ----------
  // A browser can cancel a touch (e.g. it decided to scroll). Code waiting for pointerup would then
  // stay "mid-drag", so turn the cancel into an up on the same element.
  document.addEventListener('pointercancel', (e) => {
    if (e.pointerType !== 'touch' && e.pointerType !== 'pen') return;
    const init = { bubbles: true, cancelable: true, pointerId: e.pointerId, pointerType: e.pointerType, clientX: e.clientX, clientY: e.clientY, isPrimary: e.isPrimary };
    (e.target || document).dispatchEvent(new PointerEvent('pointerup', init));
  }, true);

  // Long-press = right-click. Skipped when the browser already sent a contextmenu (Android).
  let lp = null, lastNative = 0, swallowClickUntil = 0;
  document.addEventListener('click', (e) => {
    if (performance.now() < swallowClickUntil) { swallowClickUntil = 0; e.preventDefault(); e.stopImmediatePropagation(); }
  }, true);
  document.addEventListener('contextmenu', (e) => { if (!e.__synthetic) lastNative = performance.now(); }, true);
  document.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'touch' || !e.isPrimary) return;
    const t = e.target;
    if (t.closest('input, textarea, select, [contenteditable]')) return;
    const x = e.clientX, y = e.clientY;
    clearTimeout(lp && lp.timer);
    lp = {
      x, y, timer: setTimeout(() => {
        lp = null;
        if (performance.now() - lastNative < 800) return;
        const ev = new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 2 });
        ev.__synthetic = true;
        t.dispatchEvent(ev);
        // Lifting the finger would "click" whatever menu item opened under it — ignore that click.
        swallowClickUntil = performance.now() + 1500;
      }, 600),
    };
  }, true);
  const cancelLp = (e) => { if (lp && (e.type !== 'pointermove' || Math.hypot(e.clientX - lp.x, e.clientY - lp.y) > 10)) { clearTimeout(lp.timer); lp = null; } };
  document.addEventListener('pointermove', cancelLp, true);
  document.addEventListener('pointerup', cancelLp, true);
  document.addEventListener('scroll', () => { if (lp) { clearTimeout(lp.timer); lp = null; } }, true);

  // ---------- phone panels as bottom sheets ----------
  const TABS = [
    ['project', 'Media', 'folder'], ['effects', 'Effects', 'fx'], ['effectControls', 'Edit', 'adjust'],
    ['captions', 'Captions', 'text'], ['library', 'Library', 'image'], ['mixer', 'Audio', 'music'],
  ];
  let nav = null, openSec = null, openTab = null;
  const sectionOf = (tab) => { const b = document.querySelector(`.tab[data-tab="${tab}"]`); return b ? { btn: b, sec: b.closest('section.panel') } : null; };
  T.closeSheet = () => {
    if (openSec) openSec.classList.remove('sheet-open');
    openSec = null; openTab = null;
    if (nav) nav.querySelectorAll('button').forEach((b) => b.classList.remove('on'));
  };
  T.openSheet = (tab) => {
    const f = sectionOf(tab);
    if (!f) return;
    if (openTab === tab) { T.closeSheet(); return; }
    if (openSec && openSec !== f.sec) openSec.classList.remove('sheet-open');
    f.btn.click();
    f.sec.classList.add('sheet-open');
    openSec = f.sec; openTab = tab;
    nav.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
  };
  function buildSheets() {
    for (const sec of document.querySelectorAll('section.panel[data-tabs]')) {
      const tabs = sec.querySelector('.tabs');
      tabs.append(RS.h('button', { class: 'sheet-close', type: 'button', title: 'Close', onclick: () => T.closeSheet() }, RS.icon('close')));
      // Switching tabs inside an open sheet keeps the tab bar in sync.
      tabs.addEventListener('click', (e) => {
        const b = e.target.closest('.tab');
        if (!b || !sec.classList.contains('sheet-open')) return;
        openTab = b.dataset.tab;
        nav.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x.dataset.tab === openTab));
      });
    }
    nav = RS.h('nav', { id: 'mobile-nav', 'aria-label': 'Panels' }, TABS.map(([tab, label, icon]) =>
      RS.h('button', { type: 'button', 'data-tab': tab, onclick: () => T.openSheet(tab) }, RS.icon(icon), RS.h('span', null, label))));
    document.getElementById('app').append(nav);
    // Opening a panel from elsewhere (e.g. "show-tab" after generating captions) shows its sheet on phones.
    RS.on('show-tab', (tab) => { if (phone.matches && TABS.some((x) => x[0] === tab) && openTab !== tab) setTimeout(() => T.openSheet(tab), 0); });
  }

  T.init = () => {
    buildSheets();
    coarse.addEventListener('change', apply);
    phone.addEventListener('change', apply);
    apply();
  };
})(window.RS);
