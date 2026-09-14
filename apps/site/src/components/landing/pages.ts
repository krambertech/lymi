export const homeHref = (locale: string) => (locale === "en" ? "/" : `/${locale}/`);

/** The languages page is English only, so a translated page links nowhere rather than across languages. */
export const languagesHref = (locale: string) => (locale === "en" ? "/languages" : null);
export const estonianHref = (locale: string) => (locale === "en" ? "/languages/estonian" : null);
export const assistantsHref = (locale: string) => (locale === "en" ? "/ai-assistants" : null);
