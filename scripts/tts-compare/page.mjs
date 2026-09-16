// Builds the listening page. Blind mode hides which provider made which clip, because knowing
// costs you the judgement you ran the harness to get.

const escapeHtml = (value) =>
  String(value).replace(
    /[<>&"]/g,
    (character) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" })[character],
  );

const STYLE = `
:root {
  color-scheme: light dark;
  --bg: oklch(98% 0.012 85); --panel: oklch(100% 0 0); --ink: oklch(25% 0.02 60);
  --ink-2: oklch(50% 0.02 60); --line: oklch(90% 0.015 75); --amber: oklch(72% 0.14 70);
  --good: oklch(62% 0.13 150); --bad: oklch(60% 0.16 25);
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: oklch(22% 0.015 60); --panel: oklch(26% 0.017 60); --ink: oklch(94% 0.01 80);
    --ink-2: oklch(72% 0.02 70); --line: oklch(34% 0.02 65);
  }
}
* { box-sizing: border-box; }
body { margin: 0; padding: 0 16px 96px; background: var(--bg); color: var(--ink);
  font: 16px/1.55 ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; }
main { max-width: 1100px; margin: 0 auto; }
h1 { font-size: 1.5rem; margin: 32px 0 4px; }
h2 { font-size: 1.15rem; margin: 40px 0 8px; padding-top: 16px; border-top: 1px solid var(--line); }
h3 { font-size: .8rem; text-transform: uppercase; letter-spacing: .08em; color: var(--ink-2);
  margin: 24px 0 8px; }
p.lede { color: var(--ink-2); margin: 0 0 24px; }
.bar { position: sticky; top: 0; z-index: 2; display: flex; flex-wrap: wrap; gap: 12px;
  align-items: center; padding: 12px 0; background: var(--bg); border-bottom: 1px solid var(--line); }
button { font: inherit; padding: 6px 14px; border-radius: 999px; border: 1px solid var(--line);
  background: var(--panel); color: var(--ink); cursor: pointer; }
button[aria-pressed="true"] { background: var(--amber); border-color: var(--amber); color: oklch(20% 0.02 60); }
.item { background: var(--panel); border: 1px solid var(--line); border-radius: 14px;
  padding: 14px 16px; margin-bottom: 12px; }
.text { font-size: 1.3rem; font-weight: 600; }
.note { color: var(--ink-2); font-size: .9rem; margin-top: 4px; }
.expect { color: var(--ink); font-size: .9rem; margin-top: 6px; padding: 8px 10px;
  background: color-mix(in oklch, var(--amber) 14%, transparent); border-radius: 8px; }
.clips { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: 10px; margin-top: 12px; }
.clip { border: 1px solid var(--line); border-radius: 10px; padding: 8px 10px; }
.clip .who { font-size: .78rem; text-transform: uppercase; letter-spacing: .06em;
  color: var(--ink-2); margin-bottom: 6px; }
.clip audio { width: 100%; height: 34px; }
.rate { display: flex; gap: 6px; margin-top: 8px; }
.rate button { padding: 2px 10px; font-size: .85rem; }
.rate button[aria-pressed="true"].up { background: var(--good); border-color: var(--good); color: #fff; }
.rate button[aria-pressed="true"].down { background: var(--bad); border-color: var(--bad); color: #fff; }
.fail { color: var(--bad); font-size: .85rem; }
table { border-collapse: collapse; width: 100%; font-size: .9rem; margin-top: 8px; }
th, td { text-align: start; padding: 6px 10px; border-bottom: 1px solid var(--line); }
a { color: inherit; }
body.blind .who-real { display: none; }
body:not(.blind) .who-blind { display: none; }
`;

const SCRIPT = `
const store = (() => {
  try { return JSON.parse(localStorage.getItem("lymi-tts-ratings") || "{}"); } catch { return {}; }
})();
const save = () => {
  try { localStorage.setItem("lymi-tts-ratings", JSON.stringify(store)); } catch {}
};
for (const button of document.querySelectorAll(".rate button")) {
  const key = button.closest(".clip").dataset.key;
  if (store[key] === button.dataset.score) button.setAttribute("aria-pressed", "true");
  button.addEventListener("click", () => {
    const pressed = button.getAttribute("aria-pressed") === "true";
    for (const sibling of button.parentElement.children) sibling.setAttribute("aria-pressed", "false");
    if (pressed) delete store[key];
    else { button.setAttribute("aria-pressed", "true"); store[key] = button.dataset.score; }
    save();
  });
}
const blind = document.getElementById("blind");
blind.addEventListener("click", () => {
  const on = document.body.classList.toggle("blind");
  blind.setAttribute("aria-pressed", String(on));
});
document.getElementById("export").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(store, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "tts-ratings.json";
  link.click();
});
`;

function clipCell(item, provider, clip, blindLabel) {
  const key = `${item.locale}|${item.text}|${provider}`;
  if (clip.error) {
    return `<div class="clip"><div class="who"><span class="who-real">${escapeHtml(provider)}</span><span class="who-blind">${blindLabel}</span></div><div class="fail">${escapeHtml(clip.error)}</div></div>`;
  }
  return `<div class="clip" data-key="${escapeHtml(key)}">
  <div class="who"><span class="who-real">${escapeHtml(provider)}</span><span class="who-blind">${blindLabel}</span></div>
  <audio controls preload="none" src="${escapeHtml(clip.file)}"></audio>
  <div class="rate">
    <button class="up" data-score="good" aria-pressed="false">Right</button>
    <button class="down" data-score="bad" aria-pressed="false">Wrong</button>
  </div>
</div>`;
}

function itemBlock(item) {
  const entries = Object.entries(item.clips);
  // Blind labels follow a per-item rotation, so column position does not leak the provider.
  const offset = [...item.text].reduce((total, character) => total + character.codePointAt(0), 0);
  const cells = entries
    .map(([provider, clip], index) =>
      clipCell(item, provider, clip, String.fromCharCode(65 + ((index + offset) % entries.length))),
    )
    .join("\n");
  return `<div class="item">
  <div class="text" lang="${escapeHtml(item.locale)}">${escapeHtml(item.text)}</div>
  ${item.note ? `<div class="note">${escapeHtml(item.note)}</div>` : ""}
  ${item.expect ? `<div class="expect">${escapeHtml(item.expect)}</div>` : ""}
  ${item.reference ? `<div class="note"><a href="${escapeHtml(item.reference)}" target="_blank" rel="noreferrer">Human reference →</a></div>` : ""}
  <div class="clips">${cells}</div>
</div>`;
}

export function renderPage({ results, voicesUsed, cost, LANGUAGES }) {
  const byLocale = new Map();
  for (const item of results) {
    if (!byLocale.has(item.locale)) byLocale.set(item.locale, []);
    byLocale.get(item.locale).push(item);
  }

  const sections = [...byLocale.entries()]
    .map(([locale, group]) => {
      const language = LANGUAGES.find((entry) => entry.locale === locale);
      const voices = Object.entries(voicesUsed)
        .map(([provider, map]) => (map[locale] ? `${provider}: ${map[locale]}` : null))
        .filter(Boolean)
        .join(" · ");
      const kinds = ["contrast", "word", "sentence"]
        .map((kind) => {
          const rows = group.filter((item) => item.kind === kind);
          if (rows.length === 0) return "";
          const heading = {
            contrast: "Contrasts spelling does not mark",
            word: "Words",
            sentence: "Sentences",
          }[kind];
          return `<h3>${heading}</h3>${rows.map(itemBlock).join("\n")}`;
        })
        .join("\n");
      return `<h2>${escapeHtml(language?.name ?? locale)} <span class="note">${escapeHtml(locale)}</span></h2>
      <div class="note">${escapeHtml(voices)}</div>${kinds}`;
    })
    .join("\n");

  const costRows = Object.entries(cost)
    .map(
      ([provider, spend]) =>
        `<tr><td>${escapeHtml(provider)}</td><td>${spend.clips}</td><td>${spend.characters}</td><td>$${spend.usd.toFixed(4)}</td><td>${escapeHtml(spend.note)}</td></tr>`,
    )
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Lymi speech provider comparison</title>
<style>${STYLE}</style>
</head>
<body>
<main>
<h1>Speech provider comparison</h1>
<p class="lede">Judge each clip against what the language actually requires. Start blind, rate everything, then reveal. Contrast items come first because they are where general multilingual models fail.</p>
<div class="bar">
  <button id="blind" aria-pressed="false">Blind mode</button>
  <button id="export">Export ratings</button>
  <span class="note">Ratings save in this browser only.</span>
</div>
${sections}
<h2>Cost of this run</h2>
<table>
<thead><tr><th>Provider</th><th>Clips</th><th>Characters</th><th>Estimated</th><th>Rate</th></tr></thead>
<tbody>${costRows}</tbody>
</table>
<p class="note">Character-billed providers are exact; token-billed ones are estimated from audio duration.</p>
</main>
<script>${SCRIPT}</script>
</body>
</html>
`;
}
