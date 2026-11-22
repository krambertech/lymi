import { definePlugin } from "@oxlint/plugins";
import aiConsent from "./rules/ai-consent.mjs";
import clipOwner from "./rules/clip-owner.mjs";
import fieldError from "./rules/field-error.mjs";
import formHeader from "./rules/form-header.mjs";
import guardedStateMove from "./rules/guarded-state-move.mjs";
import isolateLearnerText from "./rules/isolate-learner-text.mjs";
import languageTags from "./rules/language-tags.mjs";
import noComments from "./rules/no-comments.mjs";
import noFlakyMasks from "./rules/no-flaky-masks.mjs";
import noIntlListFormat from "./rules/no-intl-list-format.mjs";
import noLogicalTextAlign from "./rules/no-logical-text-align.mjs";
import noNavigatorOnline from "./rules/no-navigator-online.mjs";
import noRedirectError from "./rules/no-redirect-error.mjs";
import noSqlLower from "./rules/no-sql-lower.mjs";
import noticePlainText from "./rules/notice-plain-text.mjs";
import scrollViewPersistTaps from "./rules/scroll-view-persist-taps.mjs";
import springPresets from "./rules/spring-presets.mjs";
import termText from "./rules/term-text.mjs";

export default definePlugin({
  meta: { name: "lymi" },
  rules: {
    "ai-consent": aiConsent,
    "clip-owner": clipOwner,
    "field-error": fieldError,
    "form-header": formHeader,
    "guarded-state-move": guardedStateMove,
    "isolate-learner-text": isolateLearnerText,
    "language-tags": languageTags,
    "no-comments": noComments,
    "no-flaky-masks": noFlakyMasks,
    "no-intl-list-format": noIntlListFormat,
    "no-logical-text-align": noLogicalTextAlign,
    "no-navigator-online": noNavigatorOnline,
    "no-redirect-error": noRedirectError,
    "no-sql-lower": noSqlLower,
    "notice-plain-text": noticePlainText,
    "scroll-view-persist-taps": scrollViewPersistTaps,
    "spring-presets": springPresets,
    "term-text": termText,
  },
});
