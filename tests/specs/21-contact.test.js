// Contact page (/contact/, src/contact.js → POST /api/contact). The test server answers /api/* with {ok:true}
// and records the request (t.apiHits); the Brevo side is covered by the worker check in scripts.
const open = async (t) => { await t.win.loadURL(t.url + 'contact/'); await t.until(`document.getElementById('contact-form') ? 1 : 0`, 8000, 'contact page'); await t.sleep(300); };
const fill = async (t, sel, text) => { await t.click(sel, { mouse: true }); await t.type(text); };

module.exports = {
  name: 'Contact page',
  modes: ['web', 'phone'],
  tests: {
    'the page is linked from the footer and has one H1, labelled fields and a hidden honeypot': async (t) => {
      await t.win.loadURL(t.url + 'about/'); await t.sleep(300);
      t.ok(await t.eval(`!!document.querySelector('footer a[href="/contact/"]')`), 'no footer link');
      await open(t);
      const r = await t.page(() => ({
        h1: document.querySelectorAll('h1').length,
        unlabelled: [...document.querySelectorAll('#contact-form input, #contact-form select, #contact-form textarea')].filter((i) => !document.querySelector(`label[for="${i.id}"]`)).length,
        hp: document.querySelector('.cf-hp').getBoundingClientRect().left < 0,
        wide: document.documentElement.scrollWidth > innerWidth + 1,
      }));
      t.eq([r.h1, r.unlabelled, r.hp, r.wide], [1, 0, true, false]);
    },
    'missing or wrong fields are explained and nothing is sent': async (t) => {
      await open(t);
      t.apiHits.length = 0;
      await t.click('#contact-form button[type=submit]', { mouse: true });
      t.ok(/name/.test(await t.eval(`document.querySelector('.cf-status').textContent`)), 'no name error');
      await fill(t, '#cf-name', 'Ana'); await fill(t, '#cf-email', 'not-an-email');
      await t.click('#contact-form button[type=submit]', { mouse: true });
      t.ok(/email/.test(await t.eval(`document.querySelector('.cf-status').textContent`)), 'no email error');
      t.eq(await t.eval(`document.activeElement.id`), 'cf-email', 'focus moves to the wrong field');
      t.eq(t.apiHits.filter((h) => h.url === '/api/contact').length, 0);
    },
    'a complete message is sent as JSON and confirmed': async (t) => {
      await open(t);
      t.apiHits.length = 0;
      await fill(t, '#cf-name', 'Ana Rahman'); await fill(t, '#cf-email', 'ana@example.org');
      await t.eval(`document.getElementById('cf-topic').value = 'press'; 0`);
      await fill(t, '#cf-message', 'Hello! I write about video tools.');
      await t.sleep(2600); // the form ignores instant (bot) submits
      await t.click('#contact-form button[type=submit]', { mouse: true });
      await t.until(`/Thank you/.test(document.querySelector('.cf-status').textContent) ? 1 : 0`, 5000, 'no confirmation');
      const hit = t.apiHits.find((h) => h.url === '/api/contact');
      t.ok(hit && hit.method === 'POST', 'not posted');
      const b = JSON.parse(hit.body);
      t.eq([b.name, b.email, b.topic, b.message, b.website], ['Ana Rahman', 'ana@example.org', 'press', 'Hello! I write about video tools.', '']);
      t.ok(b.elapsed > 2500, 'elapsed time missing');
      t.eq(await t.eval(`document.getElementById('cf-message').value`), '', 'form not cleared');
    },
    'Contact is in the site menu, the intro, the start screen and the editor Help menu': async (t) => {
      await t.win.loadURL(t.url + 'tools/'); await t.sleep(300);
      t.ok(await t.eval(`!!document.querySelector('.site-head nav a[href="/contact/"]')`), 'not in the site menu');
      await t.win.loadURL(t.url); await t.until('window.RS && RS.app ? 1 : 0', 20000); await t.sleep(300);
      t.ok(await t.eval(`!document.getElementById('intro') || !!document.querySelector('#intro a[href="/contact/"]')`), 'not in the intro');
      await t.eval(`RS.web.home(); 0`); await t.sleep(300);
      t.ok(await t.eval(`[...document.querySelectorAll('.home-side-btn')].some((b) => b.textContent.includes('Contact Us'))`), 'not on the start screen');
      await t.eval(`window.__opened = []; window.open = (u) => { window.__opened.push(u); return null; }; RS.web.hideHome(); 0`);
      if (!t.isPhone) {
        await t.click('.menubar-btn', { index: 6, mouse: true });
        const i = await t.eval(`[...document.querySelectorAll('.menu-drop .menu-item')].findIndex((x) => x.textContent.includes('Contact Us'))`);
        t.ok(i >= 0, 'not in the Help menu');
        await t.click('.menu-drop .menu-item', { index: i, mouse: true });
        t.eq(await t.eval(`window.__opened`), ['/contact/']);
      }
    },
  },
};
