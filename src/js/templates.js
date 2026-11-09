'use strict';
// Project templates: ready-made starting points (frame size + titles, graphics and caption style), offered on
// the start screen. Built only from Reelsmith's own title templates (RS.creative.TEMPLATES) and Library
// graphics (RS.library), so everything stays editable. The user drops a video onto V1 underneath.
(function (RS) {
  const S = RS.state;
  const TP = RS.templates = {};

  // Each: size, a short description, and the pieces placed at given times.
  TP.LIST = [
    { id: 'shorts', name: 'Shorts / Reels / TikTok', desc: '9:16 with a hook title, progress bar and follow button', w: 1080, h: 1920, len: 15,
      parts: [['title', 'bigIntro', 0, 'WAIT\nFOR IT'], ['lib', 'progress', 0], ['lib', 'follow', 11]], captions: 'box' },
    { id: 'youtube', name: 'YouTube video', desc: '16:9 with a chapter title, name lower third and subscribe button', w: 1920, h: 1080, len: 30,
      parts: [['title', 'chapter', 0, 'EPISODE ONE'], ['title', 'lowerThird', 4, 'Your Name\nYour channel'], ['lib', 'subscribe', 20]] },
    { id: 'podcast', name: 'Podcast clip', desc: '9:16 with speaker name, big captions and a progress bar', w: 1080, h: 1920, len: 30,
      parts: [['title', 'lowerThird', 0.5, 'Guest Name\nPodcast Name'], ['lib', 'progress', 0]], captions: 'big' },
    { id: 'square', name: 'Instagram post', desc: '1:1 square with kinetic words and a call to action', w: 1080, h: 1080, len: 10,
      parts: [['title', 'kinetic', 0, 'NEW DROP'], ['title', 'cta', 6, 'Link in bio']] },
    { id: 'meme', name: 'Meme video', desc: '1:1 with meme top text', w: 1080, h: 1080, len: 8,
      parts: [['title', 'memeTop', 0, 'when the edit finally exports']] },
    { id: 'intro', name: 'Channel intro', desc: '16:9 countdown into an epic 3D title', w: 1920, h: 1080, len: 7,
      parts: [['title', 'countdown', 0], ['title', 'epicTitle', 3, 'EPIC']] },
  ];

  // Replace the main text of the clips a title template just added.
  function setText(ids, text) {
    if (text == null) return;
    const c = ids.map((id) => RS.getClip(id)).find((x) => x && x.type === 'text');
    if (c) { RS.commit('Template text', () => { RS.getClip(c.id).text.content = text; }); }
  }

  TP.create = async (id) => {
    const t = TP.LIST.find((x) => x.id === id);
    if (!t) return null;
    const p = RS.newProject({ width: t.w, height: t.h, fps: 30, autoMatch: false });
    p.name = t.name;
    RS.app.setProject(p, null);
    for (const [kind, what, at, text] of t.parts) {
      if (kind === 'title') {
        RS.creative.createTemplate(what, at);
        setText([...S.selection], text);
      } else await RS.library.add(what, at);
    }
    // Captions for vertical video sit higher, clear of the app's buttons, and larger for podcasts.
    if (t.captions) S.project.seq.captionStyle = Object.assign({}, RS.DEFAULT_CAPTION_STYLE, { size: t.captions === 'big' ? 7.5 : 6, bgOpacity: 80, margin: 20 });
    S.selection = new Set(); RS.emit('selection');
    RS.engine.seek(0.6, false);
    RS.markDirty(true);
    if (RS.web) RS.web.showGuide({
      title: t.name + ' template',
      steps: ['Import your video and drag it onto <b>V1</b>, under the titles.', 'Double-click any text in the Program monitor to change it.', 'Click <b>Export</b> — the size is already right for ' + (t.h > t.w ? 'vertical video.' : t.h === t.w ? 'square posts.' : 'YouTube.')],
      actions: [['Import video', 'import']],
    });
    return p;
  };
})(window.RS);
