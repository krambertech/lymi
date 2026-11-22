import { definePlugin } from "@oxlint/plugins";
import aiConsent from "./rules/ai-consent.mjs";
import announceLiveRegion from "./rules/announce-live-region.mjs";
import clearText from "./rules/clear-text.mjs";
import clipOwner from "./rules/clip-owner.mjs";
import dismissOnDrag from "./rules/dismiss-on-drag.mjs";
import edgeSwipe from "./rules/edge-swipe.mjs";
import failedWriteSaid from "./rules/failed-write-said.mjs";
import fieldError from "./rules/field-error.mjs";
import fixedHost from "./rules/fixed-host.mjs";
import formHeader from "./rules/form-header.mjs";
import formSheetOptions from "./rules/form-sheet-options.mjs";
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
import readRequestThroughHttp from "./rules/read-request-through-http.mjs";
import scrollViewPersistTaps from "./rules/scroll-view-persist-taps.mjs";
import sheetFieldFocus from "./rules/sheet-field-focus.mjs";
import springPresets from "./rules/spring-presets.mjs";
import termText from "./rules/term-text.mjs";
import workletNoElements from "./rules/worklet-no-elements.mjs";

export default definePlugin({
  meta: { name: "lymi" },
  rules: {
    "announce-live-region": announceLiveRegion,
    "clear-text": clearText,
    "dismiss-on-drag": dismissOnDrag,
    "edge-swipe": edgeSwipe,
    "failed-write-said": failedWriteSaid,
    "ai-consent": aiConsent,
    "clip-owner": clipOwner,
    "field-error": fieldError,
    "fixed-host": fixedHost,
    "form-header": formHeader,
    "form-sheet-options": formSheetOptions,
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
    "read-request-through-http": readRequestThroughHttp,
    "scroll-view-persist-taps": scrollViewPersistTaps,
    "sheet-field-focus": sheetFieldFocus,
    "spring-presets": springPresets,
    "term-text": termText,
    "worklet-no-elements": workletNoElements,
  },
});
