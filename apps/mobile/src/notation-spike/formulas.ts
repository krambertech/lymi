// Issue #1187: the formula set every renderer draws, and the 50 cards the list test scrolls.

export type Formula = { id: string; tex: string; display?: boolean };

export const FORMULAS: Formula[] = [
  { id: "mass", tex: "E = mc^2" },
  { id: "quadratic", tex: "x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}" },
  { id: "root", tex: "\\sqrt[3]{x+1}" },
  { id: "sum", tex: "\\sum_{n=1}^{\\infty} \\frac{1}{n^2} = \\frac{\\pi^2}{6}" },
  { id: "integral", tex: "\\int_0^1 x^2\\,dx" },
  { id: "greek", tex: "\\alpha + \\beta = \\gamma, \\; \\Delta\\lambda" },
  { id: "limit", tex: "\\lim_{x\\to 0} \\frac{\\sin x}{x} = 1" },
  { id: "matrix", tex: "\\begin{pmatrix}a & b\\\\ c & d\\end{pmatrix}" },
  {
    id: "long",
    tex: "\\hat{f}(\\xi) = \\int_{-\\infty}^{\\infty} f(x)\\, e^{-2\\pi i x \\xi}\\, dx + \\sum_{k=0}^{n} \\binom{n}{k} a^k b^{n-k}",
    display: true,
  },
  { id: "acid", tex: "\\ce{H2SO4}" },
  { id: "reaction", tex: "\\ce{2H2 + O2 -> 2H2O}" },
  { id: "equilibrium", tex: "\\ce{A <=> B}" },
  { id: "charges", tex: "\\ce{SO4^2-} + \\ce{Fe^3+}" },
  { id: "states", tex: "\\ce{NaCl(aq) + H2O(l)}" },
  { id: "malformed", tex: "\\frac{a}{" },
];

const TERMS = [
  "x^2 + y^2 = r^2",
  "\\frac{d}{dx} \\sin x = \\cos x",
  "\\ce{CO2}",
  "a^2 + b^2 = c^2",
  "\\int e^x\\,dx = e^x + C",
  "\\ce{CH3COOH}",
  "\\sqrt{2} \\approx 1.414",
  "\\vec{F} = m\\vec{a}",
  "\\ce{NH4+}",
  "\\log_b(xy) = \\log_b x + \\log_b y",
];

/** A card of the list test: inline math in the term, a sentence with a formula in the meaning. */
export type SpikeCard = { id: number; term: string; before: string; meaningTex: string; after: string };

export const CARDS: SpikeCard[] = Array.from({ length: 50 }, (_, i) => ({
  id: i,
  term: TERMS[i % TERMS.length] as string,
  before: "Recall that ",
  meaningTex: (FORMULAS[i % 14] as Formula).tex,
  after: " holds here.",
}));
