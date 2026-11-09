// Adapted from the Algo Matryx admin (same owner): Yoast-style SEO and readability checks.
const STOPWORDS = new Set(
  "a an the and or but of to in on for with at by from as is are was were be been it its this that these those your you our we how what why when which who do does can vs into about".split(
    " "
  )
);
const TRANSITION_WORDS = [
  "also",
  "besides",
  "furthermore",
  "moreover",
  "additionally",
  "however",
  "therefore",
  "thus",
  "hence",
  "consequently",
  "meanwhile",
  "instead",
  "otherwise",
  "similarly",
  "likewise",
  "finally",
  "first",
  "second",
  "third",
  "next",
  "then",
  "afterwards",
  "for example",
  "for instance",
  "in addition",
  "in contrast",
  "in fact",
  "in short",
  "in other words",
  "as a result",
  "on the other hand",
  "because",
  "although",
  "though",
  "while",
  "unless",
  "since",
  "so",
  "but",
  "yet",
  "still",
  "even so",
  "of course",
  "above all",
  "in conclusion",
  "to sum up",
  "overall",
  "for this reason",
  "that said",
  "in particular",
  "especially",
  "specifically",
  "such as",
  "after all",
  "at the same time"
];
function decode(text) {
  return text.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'");
}
function htmlToText(html) {
  return decode(
    html.replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ").replace(/<\/(p|h[1-6]|li|blockquote|td|th|tr)>/gi, "\n").replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, " ")
  ).replace(/[ \t]+/g, " ").trim();
}
function words(text) {
  return text.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) ?? [];
}
function normalize(text) {
  return ` ${words(text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")).join(" ")} `;
}
function stem(word) {
  if (word.length > 4 && word.endsWith("ies")) return word.slice(0, -3) + "y";
  if (word.length > 4 && word.endsWith("es") && /(s|x|ch|sh)es$/.test(word))
    return word.slice(0, -2);
  if (word.length > 3 && word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}
function contentWords(phrase) {
  return normalize(phrase).trim().split(" ").filter((w) => w && !STOPWORDS.has(w)).map(stem);
}
function phrases(keyphrase, synonyms) {
  return [keyphrase, ...synonyms.split(",")].map((p) => p.trim()).filter(Boolean);
}
function containsPhraseWords(text, phrase) {
  const need = contentWords(phrase);
  if (!need.length) return false;
  const have = new Set(normalize(text).trim().split(" ").map(stem));
  return need.every((w) => have.has(w));
}
function containsAny(text, list) {
  return list.some((p) => containsPhraseWords(text, p));
}
function countPhrase(text, phrase) {
  const seq = normalize(phrase).trim().split(" ").map(stem);
  if (!seq[0]) return 0;
  const tokens = normalize(text).trim().split(" ").map(stem);
  let n = 0;
  for (let i = 0; i + seq.length <= tokens.length; i++) {
    if (seq.every((w, j) => tokens[i + j] === w)) n++;
  }
  return n;
}
function sentences(text) {
  return text.split(/(?<=[.!?])\s+|\n+/).map((s) => s.trim()).filter((s) => words(s).length > 0);
}
function syllables(word) {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (w.length <= 3) return 1;
  const groups = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "").replace(/^y/, "").match(/[aeiouy]{1,2}/g);
  return Math.max(1, groups?.length ?? 1);
}
function tagContents(html, tag) {
  const re = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi");
  return [...html.matchAll(re)].map((m) => htmlToText(m[1]));
}
function attr(tag, name) {
  const m = tag.match(new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, "i"));
  return m ? decode(m[2] ?? m[3] ?? "") : null;
}
const pct = (n) => `${Math.round(n)}%`;
function analyzeSeo(input) {
  const checks = [];
  const add = (id, label, status, text2) => checks.push({ id, label, status, text: text2 });
  const kp = input.keyphrase.trim();
  const all = phrases(kp, input.synonyms);
  const text = htmlToText(input.contentHtml);
  const wordCount = words(text).length;
  const paragraphs = tagContents(input.contentHtml, "p").filter((p) => p.trim());
  const headings = [
    ...tagContents(input.contentHtml, "h2"),
    ...tagContents(input.contentHtml, "h3")
  ];
  const links = [...input.contentHtml.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/gi)].map((m) => ({
    href: attr(m[0], "href") ?? "",
    text: htmlToText(m[1])
  }));
  const internal = links.filter(
    (l) => /^\/(?!\/)|^#|^https?:\/\/(www\.)?reelsmithapp\.com/i.test(l.href)
  );
  const outbound = links.filter((l) => /^https?:\/\//i.test(l.href) && !internal.includes(l));
  const imgTags = input.contentHtml.match(/<img\b[^>]*>/gi) ?? [];
  const alts = [
    ...imgTags.map((t) => attr(t, "alt") ?? ""),
    ...input.featuredImage ? [input.featuredImageAlt] : []
  ];
  if (!kp) {
    add(
      "keyphrase",
      "Focus keyphrase",
      "bad",
      "No focus keyphrase set. Add the main search phrase you want this post to rank for."
    );
  } else {
    const n = contentWords(kp).length;
    add(
      "kp-length",
      "Keyphrase length",
      n >= 1 && n <= 4 ? "good" : "ok",
      n <= 4 ? "Good length." : `The keyphrase has ${n} content words. Shorter (1\u20134 words) is easier to rank for.`
    );
    const reused = input.otherKeyphrases.filter(
      (o) => normalize(o.focusKeyphrase) === normalize(kp)
    );
    add(
      "kp-previous",
      "Previously used keyphrase",
      reused.length ? "bad" : "good",
      reused.length ? `Already the focus keyphrase of \u201C${reused[0].title}\u201D. Two posts competing for the same phrase hurt each other \u2014 pick a different one.` : "You haven't used this keyphrase before. Nice."
    );
    const startsWith = contentWords(input.seoTitle)[0] === contentWords(kp)[0];
    const inTitle = containsAny(input.seoTitle, all);
    add(
      "kp-title",
      "Keyphrase in SEO title",
      inTitle && startsWith ? "good" : inTitle ? "ok" : "bad",
      inTitle && startsWith ? "The SEO title starts with the keyphrase. Good job!" : inTitle ? "The SEO title contains the keyphrase. Moving it to the start can help." : "Put the keyphrase in the SEO title, ideally at the beginning."
    );
    add(
      "kp-meta",
      "Keyphrase in meta description",
      containsAny(input.metaDescription, all) ? "good" : "bad",
      containsAny(input.metaDescription, all) ? "The meta description contains the keyphrase." : "Add the keyphrase to the meta description \u2014 Google bolds matching words in results."
    );
    add(
      "kp-slug",
      "Keyphrase in slug",
      containsAny(input.slug.replace(/-/g, " "), all) ? "good" : "bad",
      containsAny(input.slug.replace(/-/g, " "), all) ? "The slug contains the keyphrase." : "Use the keyphrase (or its main words) in the slug."
    );
    const intro = paragraphs[0] ?? "";
    add(
      "kp-intro",
      "Keyphrase in introduction",
      intro && containsAny(intro, all) ? "good" : "bad",
      intro && containsAny(intro, all) ? "The keyphrase appears in the first paragraph. Well done!" : "Use the keyphrase in the first paragraph so readers and Google know right away what the post is about."
    );
    if (headings.length === 0) {
      add(
        "kp-subheadings",
        "Keyphrase in subheadings",
        "bad",
        "Add H2/H3 subheadings and use the keyphrase in some of them."
      );
    } else {
      const hit = headings.filter((h) => containsAny(h, all)).length;
      const share = hit / headings.length * 100;
      add(
        "kp-subheadings",
        "Keyphrase in subheadings",
        share >= 30 && share <= 75 ? "good" : hit > 0 ? "ok" : "bad",
        hit === 0 ? "None of your subheadings mention the keyphrase or a synonym. Add it to one or two." : share > 75 ? `${hit} of ${headings.length} subheadings use the keyphrase \u2014 that can look stuffed. Vary some of them.` : share < 30 ? `${hit} of ${headings.length} subheadings use the keyphrase. Use it in a few more (30\u201375%).` : `${hit} of ${headings.length} subheadings use the keyphrase. Good.`
      );
    }
    const count = all.reduce((sum, p) => sum + countPhrase(text, p), 0);
    const density = wordCount ? count / wordCount * 100 : 0;
    add(
      "kp-density",
      "Keyphrase density",
      wordCount < 100 ? "bad" : density >= 0.5 && density <= 3 ? "good" : density > 3 ? "bad" : "ok",
      wordCount < 100 ? "Write more text before the keyphrase density can be measured." : `The keyphrase (or a synonym) appears ${count} time${count === 1 ? "" : "s"} \u2014 ${density.toFixed(1)}%. ${density > 3 ? "That's too often; it reads as keyword stuffing." : density < 0.5 ? "Use it a bit more often (aim for 0.5\u20133%)." : "Great."}`
    );
    add(
      "kp-alt",
      "Keyphrase in image alt text",
      alts.length === 0 ? "bad" : alts.some((a) => containsAny(a, all)) ? "good" : "ok",
      alts.length === 0 ? "Add an image with alt text that includes the keyphrase." : alts.some((a) => containsAny(a, all)) ? "An image's alt text contains the keyphrase." : "None of your image alt texts include the keyphrase. Describe one image using it."
    );
    const competing = links.filter((l) => containsPhraseWords(l.text, kp));
    if (competing.length) {
      add(
        "kp-competing",
        "Competing links",
        "ok",
        "A link's anchor text contains your keyphrase \u2014 that tells Google another page is about this topic. Reword the link."
      );
    }
  }
  add(
    "text-length",
    "Text length",
    wordCount >= 900 ? "good" : wordCount >= 300 ? "ok" : "bad",
    wordCount >= 900 ? `${wordCount.toLocaleString()} words. Good length for a guide.` : wordCount >= 300 ? `${wordCount} words. That's the minimum; in-depth guides (900\u20132,500 words) rank better for competitive topics.` : `${wordCount} words. Far below the recommended minimum of 300.`
  );
  const titleLen = input.seoTitle.length;
  const width = input.titleWidthPx;
  const tooWide = width !== void 0 ? width > 600 : titleLen > 60;
  const tooShort = width !== void 0 ? width < 400 : titleLen < 40;
  add(
    "title-width",
    "SEO title width",
    !titleLen ? "bad" : tooWide || tooShort ? "ok" : "good",
    !titleLen ? "Add a title." : tooWide ? "The SEO title is too long and will be cut off in Google. Shorten it." : tooShort ? "The SEO title is short. Use the space to add a benefit or the year." : "Good width."
  );
  const metaLen = input.metaDescription.length;
  add(
    "meta-length",
    "Meta description length",
    metaLen === 0 ? "bad" : metaLen < 120 ? "ok" : metaLen <= 156 ? "good" : "ok",
    metaLen === 0 ? "No meta description. Write one (120\u2013156 characters) \u2014 it's your ad text in Google." : metaLen < 120 ? `${metaLen} characters. A bit short \u2014 up to 156 is available.` : metaLen <= 156 ? `${metaLen} characters. Well done!` : `${metaLen} characters. Over 156 \u2014 Google will cut it off.`
  );
  add(
    "internal-links",
    "Internal links",
    internal.length ? "good" : "bad",
    internal.length ? `${internal.length} internal link${internal.length === 1 ? "" : "s"}. Good.` : "No links to other Reelsmith pages. Link to a tutorial, a doc page or the editor."
  );
  add(
    "outbound-links",
    "Outbound links",
    outbound.length ? "good" : "ok",
    outbound.length ? `${outbound.length} outbound link${outbound.length === 1 ? "" : "s"}. Good.` : "No outbound links. Linking to a trustworthy source (docs, statistics) adds credibility."
  );
  add(
    "images",
    "Images",
    alts.length ? "good" : "bad",
    alts.length ? `${alts.length} image${alts.length === 1 ? "" : "s"} (including the featured image).` : "No images. Add a featured image and at least one image in the text."
  );
  const missingAlt = alts.filter((a) => !a.trim()).length;
  if (alts.length) {
    add(
      "alt-text",
      "Image alt text",
      missingAlt ? "bad" : "good",
      missingAlt ? `${missingAlt} image${missingAlt === 1 ? " has" : "s have"} no alt text. Describe each image for Google Images and screen readers.` : "All images have alt text."
    );
  }
  add(
    "single-h1",
    "Single title",
    /<h1\b/i.test(input.contentHtml) ? "bad" : "good",
    /<h1\b/i.test(input.contentHtml) ? "The text contains an H1 heading. The post title is already the H1 \u2014 use H2/H3 in the text." : "You don't have multiple H1 headings. Well done!"
  );
  return checks;
}
function analyzeReadability(contentHtml) {
  const checks = [];
  const add = (id, label, status, text2) => checks.push({ id, label, status, text: text2 });
  const text = htmlToText(contentHtml);
  const all = sentences(text);
  const wc = words(text).length;
  if (wc < 50) {
    return [
      {
        id: "too-short",
        label: "Not enough text",
        status: "bad",
        text: "Write at least 50 words to get a readability analysis."
      }
    ];
  }
  const long = all.filter((s) => words(s).length > 20).length;
  const longShare = long / all.length * 100;
  add(
    "sentence-length",
    "Sentence length",
    longShare <= 25 ? "good" : longShare <= 30 ? "ok" : "bad",
    longShare <= 25 ? "Great!" : `${pct(longShare)} of sentences have more than 20 words (aim for 25% or less). Split some of them.`
  );
  const paras = tagContents(contentHtml, "p").map((p) => words(p).length);
  const longest = Math.max(0, ...paras);
  add(
    "paragraph-length",
    "Paragraph length",
    longest <= 150 ? "good" : longest <= 200 ? "ok" : "bad",
    longest <= 150 ? "None of the paragraphs are too long. Great job!" : `A paragraph has ${longest} words (over 150). Break it up \u2014 shorter paragraphs are easier to read on a phone.`
  );
  const sections = contentHtml.split(/<h[2-6]\b[^>]*>[\s\S]*?<\/h[2-6]>/i).map((s) => words(htmlToText(s)).length);
  const biggest = Math.max(0, ...sections);
  const hasHeadings = sections.length > 1;
  add(
    "subheadings",
    "Subheading distribution",
    !hasHeadings && wc > 300 ? "bad" : biggest <= 300 ? "good" : biggest <= 350 ? "ok" : "bad",
    !hasHeadings && wc > 300 ? "No subheadings. Break the text up with H2/H3 headings." : biggest <= 300 ? "Great job!" : `One section has ${biggest} words without a subheading (aim for 300 or less). Add an H2 or H3.`
  );
  const wl = words(text);
  const syl = wl.reduce((n, w) => n + syllables(w), 0);
  const flesch = 206.835 - 1.015 * (wl.length / all.length) - 84.6 * (syl / wl.length);
  add(
    "flesch",
    "Flesch reading ease",
    flesch >= 60 ? "good" : flesch >= 50 ? "ok" : "bad",
    `Score ${Math.round(flesch)}${flesch >= 60 ? " \u2014 easy to read. Good job!" : flesch >= 50 ? " \u2014 fairly difficult. Shorter sentences and simpler words will help." : " \u2014 difficult to read. Use shorter sentences and plain words."}`
  );
  const passive = all.filter(
    (s) => /\b(am|is|are|was|were|be|been|being|get|gets|got)\s+(\w+ly\s+)?(\w+ed|built|done|made|given|taken|seen|known|shown|written|sent|paid|found|kept|held|run|set|put|shown|chosen|driven|grown)\b/i.test(
      s
    )
  ).length;
  const passiveShare = passive / all.length * 100;
  add(
    "passive",
    "Passive voice",
    passiveShare <= 10 ? "good" : passiveShare <= 15 ? "ok" : "bad",
    passiveShare <= 10 ? "You're using enough active voice. That's great!" : `${pct(passiveShare)} of sentences look passive (aim for 10% or less). Say who does what.`
  );
  const withTransition = all.filter((s) => {
    const n = normalize(s);
    return TRANSITION_WORDS.some((t) => n.includes(` ${t} `));
  }).length;
  const transShare = withTransition / all.length * 100;
  add(
    "transitions",
    "Transition words",
    transShare >= 30 ? "good" : transShare >= 20 ? "ok" : "bad",
    transShare >= 30 ? "Well done!" : `Only ${pct(transShare)} of sentences contain transition words (aim for 30%) \u2014 e.g. \u201Chowever\u201D, \u201Cfor example\u201D, \u201Cas a result\u201D.`
  );
  let run = 1;
  let maxRun = 1;
  for (let i = 1; i < all.length; i++) {
    const a = words(all[i - 1])[0]?.toLowerCase();
    const b = words(all[i])[0]?.toLowerCase();
    run = a && a === b ? run + 1 : 1;
    maxRun = Math.max(maxRun, run);
  }
  add(
    "consecutive",
    "Consecutive sentences",
    maxRun >= 3 ? "bad" : "good",
    maxRun >= 3 ? `${maxRun} sentences in a row start with the same word. Mix it up.` : "There is enough variety in your sentences. That's great!"
  );
  return checks;
}
function overallScore(checks) {
  if (!checks.length) return "none";
  const points = checks.reduce(
    (sum, c) => sum + (c.status === "good" ? 9 : c.status === "ok" ? 6 : 3),
    0
  );
  const avg = points / checks.length;
  const bad = checks.filter((c) => c.status === "bad").length;
  if (avg >= 7.5 && bad <= 1) return "good";
  return avg >= 5.5 ? "ok" : "bad";
}
export {
  analyzeReadability,
  analyzeSeo,
  htmlToText,
  overallScore
};
