import type { ReactNode } from "react";

/**
 * A small syntax highlighter for the languages the docs show. It is here instead of a
 * library because the snippets are short and the palette is narrow: code is set in ink and
 * weight, never in colour, so a full theme would have nothing to paint.
 *
 * Every language falls back to plain text, and so does anything the regex cannot parse.
 */
export type Lang = "bash" | "json" | "js" | "py" | "http" | "text";

type Tok = "cmd" | "str" | "key" | "num" | "comment" | "punct";

interface Rule {
  re: RegExp;
  /** Which capture group matched decides the token. */
  of: (m: RegExpExecArray) => Tok;
}

const RULES: Record<Exclude<Lang, "text">, Rule> = {
  bash: {
    re: /((?<=^|\s)#[^\n]*)|('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")|((?<=(?:^|\n)[ \t]*)[a-zA-Z][\w.-]*)|((?<=\s)-{1,2}[A-Za-z][\w-]*)|(\b\d+\b)|([|\\])/g,
    of: (m) => (m[1] ? "comment" : m[2] ? "str" : m[3] ? "cmd" : m[4] || m[5] ? "num" : "punct"),
  },
  json: {
    // A quoted run followed by a colon is a key; any other quoted run is a value.
    re: /("(?:[^"\\]|\\.)*")(?=\s*:)|("(?:[^"\\]|\\.)*")|(\btrue\b|\bfalse\b|\bnull\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|([{}[\],:])/g,
    of: (m) => (m[1] ? "key" : m[2] ? "str" : m[3] ? "num" : "punct"),
  },
  js: {
    re: /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`)|\b(const|let|var|async|await|function|return|import|from|export|for|of|in|if|else|new|try|catch|throw|class|typeof)\b|\b(true|false|null|undefined|-?\d+(?:\.\d+)?)\b|([{}[\](),;])/g,
    of: (m) => (m[1] ? "comment" : m[2] ? "str" : m[3] ? "cmd" : m[4] ? "num" : "punct"),
  },
  py: {
    re: /(#[^\n]*)|(('''[\s\S]*?'''|"""[\s\S]*?"""|'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"))|\b(import|from|def|class|return|for|in|if|elif|else|with|as|while|try|except|raise|lambda|not|and|or|pass|yield)\b|\b(True|False|None|-?\d+(?:\.\d+)?)\b|([{}[\](),:])/g,
    of: (m) => (m[1] ? "comment" : m[2] ? "str" : m[3] ? "cmd" : m[4] ? "num" : "punct"),
  },
  http: {
    re: /^(GET|POST|PATCH|PUT|DELETE|HTTP\/[\d.]+)|^([A-Za-z][\w-]*)(?=:)|\b([1-5]\d{2})\b/gm,
    of: (m) => (m[1] ? "cmd" : m[2] ? "key" : "num"),
  },
};

/** Split `code` into spans. Plain text comes back unchanged. */
export function highlight(code: string, lang: Lang): ReactNode {
  const rule = lang === "text" ? undefined : RULES[lang];
  if (!rule) return code;
  try {
    const re = new RegExp(rule.re.source, rule.re.flags);
    const out: ReactNode[] = [];
    let last = 0;
    let key = 0;
    let m: RegExpExecArray | null = re.exec(code);
    while (m !== null) {
      if (m[0] === "") {
        re.lastIndex += 1;
      } else {
        if (m.index > last) out.push(code.slice(last, m.index));
        out.push(
          <span key={key++} className={`t-${rule.of(m)}`}>
            {m[0]}
          </span>,
        );
        last = m.index + m[0].length;
      }
      m = re.exec(code);
    }
    if (last < code.length) out.push(code.slice(last));
    return out;
  } catch {
    return code;
  }
}
