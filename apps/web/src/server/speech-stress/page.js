// The listening page, inlined by evaluate.ts; `evaluate.ts --summary` runs stressSummary from here too.
// A rating is { heard: vowel index, or null for can't tell; voiced: the mark was voiced or the word garbled; accent: the clip's accent flag }.
// A voice's own rating, under `native:<language> <voice>`, is { native: 1 to 5 }.

function stressSummary(clips, ratings) {
  const percent = (right, trials) => `${right}/${trials} (${Math.round((100 * right) / trials)}%)`;
  const lines = [];
  const misses = [];
  for (const language of [...new Set(clips.map((clip) => clip.language))]) {
    const own = clips.filter((clip) => clip.language === language);
    const accent = own.find((clip) => clip.accent)?.accent;
    lines.push(
      `#### ${language}`,
      "",
      `| Voice | Sounds native | Plain | Acute | Markup | Mark voiced or garbled |${accent ? ` ${accent} |` : ""} Acute verdict | Markup verdict |`,
      `| --- | --- | --- | --- | --- | --- |${accent ? " --- |" : ""} --- | --- |`,
    );
    const best = [];
    for (const voice of [...new Set(own.map((clip) => clip.voice))]) {
      const score = (mode) => {
        const result = {
          right: 0,
          trials: 0,
          unrated: 0,
          failed: 0,
          voiced: 0,
          accent: 0,
          clips: 0,
        };
        for (const clip of own.filter((clip) => clip.voice === voice && clip.mode === mode)) {
          result.clips += 1;
          if (clip.error) {
            result.failed += 1;
            continue;
          }
          const rating = ratings[clip.id];
          if (!rating || rating.heard === undefined) {
            result.unrated += 1;
            continue;
          }
          if (rating.voiced) result.voiced += 1;
          if (rating.accent) result.accent += 1;
          for (const form of clip.forms) {
            result.trials += 1;
            if (rating.heard === form.target) result.right += 1;
            else if (mode !== "plain")
              misses.push(
                `- ${voice}, ${mode}: ${form.marked} (${form.gloss}) heard ${clip.options[rating.heard] ?? "unclear"}`,
              );
          }
          if (mode !== "plain" && (rating.voiced || rating.accent))
            misses.push(
              `- ${voice}, ${mode}: ${clip.forms[0]?.marked} flagged${rating.voiced ? " mark voiced or garbled" : ""}${rating.accent ? ` ${clip.accent}` : ""}`,
            );
        }
        return result;
      };
      const cell = (result) =>
        !result.clips
          ? "none"
          : `${result.trials ? percent(result.right, result.trials) : "—"}${result.unrated ? `, ${result.unrated} unrated` : ""}${result.failed ? `, ${result.failed} failed` : ""}`;
      const verdict = (result) =>
        !result.clips
          ? "—"
          : result.failed
            ? "fail"
            : result.unrated
              ? "unrated"
              : result.right / result.trials >= 0.95 && !result.voiced && !result.accent
                ? "pass"
                : "fail";
      const plain = score("plain");
      const acute = score("acute");
      const markup = score("markup");
      const first = own.find((clip) => clip.voice === voice);
      const native = ratings[`native:${language} ${voice}`]?.native;
      const name = `${voice}${first?.candidate ? " (candidate)" : ""}`;
      const flags = (key) => `${plain[key]} · ${acute[key]} · ${markup[key]}`;
      if (verdict(acute) === "pass")
        best.push({ name, right: acute.right / acute.trials, native: native ?? 0 });
      lines.push(
        `| ${name} | ${native ? `${native}/5` : "—"} | ${cell(plain)} | ${cell(acute)} | ${cell(markup)}${first?.markup ? ` (${first.markup})` : ""} | ${flags("voiced")} |${accent ? ` ${flags("accent")} |` : ""} ${verdict(acute)} | ${verdict(markup)} |`,
      );
    }
    best.sort((a, b) => b.native - a.native || b.right - a.right);
    lines.push(
      "",
      best[0]
        ? `Best voice that passes with U+0301: ${best[0].name}${best[0].native ? `, sounds native ${best[0].native}/5` : ""}.`
        : "No voice passes with U+0301 yet.",
      "",
    );
  }
  return [
    ...lines,
    "Plain scores the plain clip against each form of its pair, so a homograph pair caps it at 50%. Flags count plain · acute · markup clips. A mode passes at 95% with no flags.",
    "",
    ...(misses.length ? ["Misses:", "", ...misses] : []),
  ].join("\n");
}

if (typeof document !== "undefined") {
  const STORE = "lymi-stress-ratings";
  const clips = window.CLIPS;
  let ratings = {};
  try {
    ratings = JSON.parse(localStorage.getItem(STORE) ?? "{}") ?? {};
  } catch {
    ratings = {};
  }
  const audio = new Audio();
  const names = new Intl.DisplayNames(["en"], { type: "language" });
  const app = document.getElementById("app");
  const rows = [];
  let active = 0;
  let advance;

  const element = (tag, props = {}, ...children) => {
    const node = Object.assign(document.createElement(tag), props);
    node.append(...children);
    return node;
  };

  const bar = element("div", { className: "bar" });
  const progress = element("span");
  const reveal = element("button", { type: "button", textContent: "Show answers" });
  reveal.setAttribute("aria-pressed", "false");
  reveal.addEventListener("click", () => {
    const shown = document.body.classList.toggle("answers");
    reveal.setAttribute("aria-pressed", String(shown));
  });
  const exporter = element("button", { type: "button", textContent: "Export ratings" });
  exporter.addEventListener("click", () => {
    const link = element("a", {
      href: URL.createObjectURL(
        new Blob([JSON.stringify(ratings, null, 2)], { type: "application/json" }),
      ),
      download: "stress-ratings.json",
    });
    link.click();
  });
  const importer = element("input", { type: "file", accept: "application/json", hidden: true });
  importer.addEventListener("change", async () => {
    const file = importer.files?.[0];
    if (!file) return;
    ratings = { ...ratings, ...JSON.parse(await file.text()) };
    save();
    for (const row of rows) row.paint();
  });
  const importButton = element("button", { type: "button", textContent: "Import ratings" });
  importButton.addEventListener("click", () => importer.click());
  bar.append(progress, reveal, exporter, importButton, importer);
  app.append(bar);

  for (const language of [...new Set(clips.map((clip) => clip.language))]) {
    app.append(element("h2", { textContent: names.of(language) ?? language }));
    const own = clips.filter((clip) => clip.language === language);
    for (const voice of [...new Set(own.map((clip) => clip.voice))]) {
      const first = own.find((clip) => clip.voice === voice);
      app.append(
        element("h3", { textContent: `${voice}${first?.candidate ? " · candidate" : ""}` }),
        nativeRating(`native:${language} ${voice}`),
      );
      const list = element("ol");
      app.append(list);
      for (const clip of own.filter((clip) => clip.voice === voice)) list.append(row(clip));
    }
  }

  const summary = element("textarea", { readOnly: true, ariaLabel: "Summary" });
  const copy = element("button", { type: "button", textContent: "Copy summary" });
  copy.addEventListener("click", async () => {
    summary.select();
    await navigator.clipboard?.writeText(summary.value).catch(() => document.execCommand("copy"));
    copy.textContent = "Copied";
  });
  app.append(element("h2", { textContent: "Summary" }), copy, summary);
  save();
  rows[0]?.focus();

  function row(clip) {
    const item = element("li", { tabIndex: -1 });
    const index = rows.length;
    if (clip.error) {
      item.append(element("span", { className: "failed", textContent: `Failed: ${clip.error}` }));
      item.options = 0;
      item.rated = () => true;
      item.paint = () => {};
      item.choose = () => {};
      item.toggle = () => {};
      rows.push(item);
      return item;
    }
    const play = element("button", {
      type: "button",
      textContent: "▶ Play",
      ariaLabel: `Play clip ${index + 1}`,
    });
    play.addEventListener("click", () => listen(clip));
    const choices = clip.options.map((option, heard) => {
      const button = element("button", {
        type: "button",
        className: "term",
        textContent: option,
        title: `Stress on syllable ${heard + 1} (key ${heard + 1})`,
      });
      button.addEventListener("click", () => item.choose(heard));
      return button;
    });
    const unclear = element("button", { type: "button", textContent: "Can't tell" });
    unclear.addEventListener("click", () => item.choose(null));
    const voiced = element("button", { type: "button", textContent: "Mark voiced or garbled" });
    voiced.addEventListener("click", () => item.toggle("voiced"));
    const accent = clip.accent && element("button", { type: "button", textContent: clip.accent });
    accent?.addEventListener("click", () => item.toggle("accent"));
    const answer = element("span", {
      className: "answer",
      textContent: `${clip.mode}${clip.mode === "markup" ? ` (${clip.markup})` : ""}: sent ${clip.sent} · ${clip.forms.map((form) => `${form.marked} ${form.gloss}`).join(" / ")}`,
    });
    item.append(play, ...choices, unclear, voiced, ...(accent ? [accent] : []), answer);
    item.addEventListener("focus", () => {
      active = index;
      for (const other of rows) other.classList.toggle("active", other === item);
    });
    item.addEventListener("click", () => item.focus());
    item.paint = () => {
      const rating = ratings[clip.id] ?? {};
      choices.forEach((button, heard) => {
        button.setAttribute("aria-pressed", String(rating.heard === heard));
        const target = clip.forms.some((form) => form.target === heard);
        button.classList.toggle("right", document.body.classList.contains("answers") && target);
      });
      unclear.setAttribute("aria-pressed", String(rating.heard === null));
      voiced.setAttribute("aria-pressed", String(Boolean(rating.voiced)));
      accent?.setAttribute("aria-pressed", String(Boolean(rating.accent)));
    };
    item.choose = (heard) => {
      ratings[clip.id] = { ...ratings[clip.id], heard };
      save();
      item.paint();
      clearTimeout(advance);
      // The pause lets m or r still flag this clip before the next one takes the keys.
      advance = setTimeout(() => {
        const next = rows.slice(index + 1).find((other) => !other.rated()) ?? rows[index + 1];
        next?.focus();
        next?.listen?.();
      }, 900);
    };
    item.toggle = (flag) => {
      ratings[clip.id] = { ...ratings[clip.id], [flag]: !ratings[clip.id]?.[flag] };
      save();
      item.paint();
    };
    item.options = clip.options.length;
    item.accent = Boolean(clip.accent);
    item.rated = () => ratings[clip.id]?.heard !== undefined;
    item.listen = () => listen(clip);
    item.paint();
    rows.push(item);
    return item;
  }

  function nativeRating(key) {
    const group = element("p", { textContent: "Sounds native: " });
    const buttons = [1, 2, 3, 4, 5].map((score) => {
      const button = element("button", { type: "button", textContent: String(score) });
      button.addEventListener("click", () => {
        ratings[key] = { native: score };
        save();
        paint();
      });
      return button;
    });
    const paint = () => {
      for (const [at, button] of buttons.entries())
        button.setAttribute("aria-pressed", String(ratings[key]?.native === at + 1));
    };
    paint();
    group.append(...buttons, " (1 foreign, 5 a native speaker)");
    return group;
  }

  function listen(clip) {
    audio.src = `clips/${clip.file}`;
    audio.play().catch(() => {});
  }

  function save() {
    try {
      localStorage.setItem(STORE, JSON.stringify(ratings));
    } catch {
      // Ratings still live in the page; Export keeps them.
    }
    const rateable = clips.filter((clip) => !clip.error);
    const rated = rateable.filter((clip) => ratings[clip.id]?.heard !== undefined).length;
    progress.textContent = `${rated} of ${rateable.length} rated`;
    summary.value = stressSummary(clips, ratings);
  }

  reveal.addEventListener("click", () => {
    for (const row of rows) row.paint();
  });

  document.addEventListener("keydown", (event) => {
    if (
      event.metaKey ||
      event.ctrlKey ||
      event.altKey ||
      event.target instanceof HTMLTextAreaElement
    )
      return;
    const current = rows[active];
    if (!current) return;
    if (event.key === " ") current.listen?.();
    else if (/^[1-9]$/.test(event.key) && Number(event.key) <= current.options)
      current.choose(Number(event.key) - 1);
    else if (event.key === "0") current.choose(null);
    else if (event.key === "m") current.toggle("voiced");
    else if (event.key === "r" && current.accent) current.toggle("accent");
    else if (event.key === "ArrowDown" || event.key === "j") {
      clearTimeout(advance);
      rows[active + 1]?.focus();
    } else if (event.key === "ArrowUp" || event.key === "k") {
      clearTimeout(advance);
      rows[active - 1]?.focus();
    } else return;
    event.preventDefault();
  });
}
