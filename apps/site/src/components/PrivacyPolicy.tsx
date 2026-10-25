import { msg } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { Localized } from "./Localized";

export const PRIVACY_TITLE = msg`Privacy policy · Lymi`;
export const PRIVACY_DESCRIPTION = msg`How Lymi uses personal data, who receives it, and your choices.`;
export const PRIVACY_HEADING = msg`Privacy policy`;
export const PRIVACY_LEAD = msg`This policy covers Lymi’s website, apps, API and connected assistants.`;
export const PRIVACY_UPDATED = msg`24 October 2026`;

function PrivacyPolicyContent() {
  return (
    <>
      <h2>
        <Trans>Who is responsible</Trans>
      </h2>
      <p>
        <Trans>
          Krambertech OÜ, an Estonian company, provides Lymi and is responsible for your personal
          data. Contact <a href="mailto:hello@lymi.app">hello@lymi.app</a> with questions or privacy
          requests.
        </Trans>
      </p>
      <p>
        <Trans>
          Registered address: Harju maakond, Tallinn, Põhja-Tallinna linnaosa, 3. liin 6-5, 11712,
          Estonia.
        </Trans>
      </p>
      <p>
        <Trans>
          We don’t sell your personal data, show ads or track you across other companies’ apps and
          websites. We use the data below to provide, protect and improve Lymi.
        </Trans>
      </p>
      <h2>
        <Trans>What we collect and why</Trans>
      </h2>
      <p>
        <Trans>
          Account data: your email address, name, photo, sign-in records and settings. Apple or
          Google provides the identity information you agree to share, including an account
          identifier; Apple may provide a private relay email address. With email sign-in we store a
          password hash, not your password. IP addresses, device information and authentication
          tokens help keep your account secure. An account is needed to save and sync your learning.
        </Trans>
      </p>
      <p>
        <Trans>
          Learning data: your cards, decks, lesson material, pictures, recordings, reviews and
          progress, including preferences and Activity records. We use these to store your content,
          schedule reviews, sync devices and provide the features you use. Photos you upload are
          converted to remove embedded metadata. Camera and photo-library access is used only when
          you choose to add a photo or read lesson pages. Lymi does not record your voice.
        </Trans>
      </p>
      <p>
        <Trans>
          Support and email: we keep the information you send us so we can respond. We send account
          and service emails, including sign-in help, deck invitations and deletion confirmations.
          Resend delivers our email and receives the recipient, subject and message; Cloudflare
          Email Service is the fallback. Delivery reports help us handle bounced mail and spam
          complaints.
        </Trans>
      </p>
      <p>
        <Trans>
          Reminders are optional. Web reminders use your browser’s push service, which receives a
          delivery address and the reminder, including the number of cards due. Phone reminders are
          scheduled on your device.
        </Trans>
      </p>
      <h2>
        <Trans>Sharing and connected apps</Trans>
      </h2>
      <p>
        <Trans>
          Members of a shared deck see its owner’s name and the deck’s content. The owner sees
          members’ names, roles and when they joined, but not their email addresses or review
          progress. If someone invites you by email, we receive your address from them and keep an
          invitation record. Published decks and their publisher’s name are visible on public pages.
        </Trans>
      </p>
      <p>
        <Trans>
          Apps you connect through MCP, and scripts using your API keys, can access data within the
          permissions you approve. Their providers receive the data returned to them and handle it
          under their own policies. Disconnecting an app or revoking a key does not erase copies
          already received; an app’s current access token can remain valid until it expires.
        </Trans>
      </p>
      <h2>
        <Trans>AI and pronunciation</Trans>
      </h2>
      <p>
        <Trans>
          Lymi uses OpenAI, Anthropic, Google and Cloudflare Workers AI for AI features, and Google,
          OpenAI and ElevenLabs for speech. The provider depends on the feature and language.
          Requests go through Cloudflare AI Gateway with prompt and reply logging and caching
          disabled. Providers may retain requests under their API terms, including for abuse
          prevention. We do not add your account name, email address or credentials to AI prompts,
          but content you provide can itself contain personal information.
        </Trans>
      </p>
      <ul>
        <li>
          <Trans>
            Card enrichment, example translations, hints and deck style use card fields, relevant
            cards from the deck, deck details and instructions, and corrections you make to AI text.
            Enrichment can run when you add cards or request it; deck style is updated in the
            background. These text features use OpenAI.
          </Trans>
        </li>
        <li>
          <Trans>
            Smart add sends the photos, PDFs or text you provide, with relevant deck context, to
            Anthropic to read. Cloudflare Workers AI checks the resulting terms and, when requested,
            compares them with your answer. We save the cards you choose, not the original lesson
            files.
          </Trans>
        </li>
        <li>
          <Trans>
            Choosing a deck or detecting a language can send shared text, its page title and deck
            languages, or an imported deck’s name and sample terms, to OpenAI.
          </Trans>
        </li>
        <li>
          <Trans>
            Pronunciation sends the term, its reading or an example sentence and language to a
            speech provider. Japanese pronunciation may also send the term, reading and meaning to
            Google and Cloudflare Workers AI to prepare pronunciation context. Generated audio is
            saved for reuse.
          </Trans>
        </li>
      </ul>
      <p>
        <Trans>
          The phone app asks permission before sending your own content to AI. On the web, and
          through API keys or connected apps, AI runs while the account choice is unanswered. You
          can turn AI services off in You on the phone or Settings on the web. An explicit off stops
          new AI processing for your content across Lymi, including background work and connected
          apps. Saved text and audio remain, and you can still add cards manually and review. Audio
          for shared and published cards follows the owner’s choice.
        </Trans>
      </p>
      <h2>
        <Trans>Cookies, device storage and analytics</Trans>
      </h2>
      <p>
        <Trans>
          We use cookies and device storage for sign-in, preferences, offline use and syncing
          unfinished edits and reviews. The public website uses browser storage for preferences, but
          no analytics cookies. Signing out clears account data cached by the app, although some
          preferences and cached audio can remain.
        </Trans>
      </p>
      <p>
        <Trans>
          PostHog’s EU cloud receives usage events to help us improve Lymi. In the apps these are
          linked to your account identifier and include actions, counts, review grades, app and
          device information, country derived from the IP address, and technical AI usage such as
          model and cost. Events exclude card text, prompts, names, email addresses and credentials.
          We do not use session replay or automatic click recording.
        </Trans>
      </p>
      <p>
        <Trans>
          Website visits are counted without a persistent device identifier, using a daily visitor
          code derived from the IP address and browser. Referral and campaign information can follow
          links into sign-up. Error reports contain scrubbed technical details, country and an
          account or app identifier; they continue if you object to product analytics. Hosting logs
          and aggregate performance measures also help keep Lymi working and secure.
        </Trans>
      </p>
      <p>
        <Trans>
          Product analytics are based on our legitimate interest in improving Lymi. To object, email{" "}
          <a href="mailto:hello@lymi.app?subject=Lymi%20analytics">hello@lymi.app</a>; we will turn
          them off for your account, including connected apps and background work.
        </Trans>
      </p>
      <h2>
        <Trans>Service providers and international transfers</Trans>
      </h2>
      <p>
        <Trans>
          Cloudflare hosts and protects Lymi, stores data and files, routes AI requests and provides
          some AI and email services. Apple and Google handle their sign-in options. Resend delivers
          email, PostHog provides analytics and error reports, and Expo delivers phone-app updates
          and receives connection information such as the app version and IP address. AI providers,
          connected apps and deck members receive the data described above. We may also disclose
          information when required by law or necessary to protect legal rights.
        </Trans>
      </p>
      <p>
        <Trans>
          Providers may process data outside the European Economic Area, including in the United
          States. Where required, transfers rely on an adequacy decision or contractual safeguards
          such as the European Commission’s standard contractual clauses. Contact us for information
          about the safeguards that apply to your data and how to obtain a copy.
        </Trans>
      </p>
      <h2>
        <Trans>Legal bases</Trans>
      </h2>
      <p>
        <Trans>
          We process account and learning data to perform our agreement with you and provide the
          features you use. Security, error diagnosis, support and limited product analytics serve
          our legitimate interests in operating and improving Lymi. We process data to meet legal
          obligations where they apply. Where we rely on consent, you can withdraw it without
          affecting earlier lawful processing. Optional features need only the data relevant to
          them.
        </Trans>
      </p>
      <h2>
        <Trans>Retention and account deletion</Trans>
      </h2>
      <p>
        <Trans>
          Account and learning data stay while your account exists. Archiving a card or deck hides
          it; it does not erase it. Import files are removed after processing or within three days
          if unfinished; exports expire after 24 hours. Authentication records expire or are
          revoked, and web reminder subscriptions are removed when turned off or reported invalid.
        </Trans>
      </p>
      <p>
        <Trans>
          You can delete your account in You › Delete account on the phone or Settings › Delete
          account on the web, after confirming your identity. Deletion cannot be undone. Your
          account and private learning records are erased, and file cleanup and requests to erase
          account-linked analytics run separately. Provider logs, backups and support correspondence
          can remain under their applicable retention periods; deletion is not an instant purge of
          every copy.
        </Trans>
      </p>
      <p>
        <Trans>
          A deck other people still study remains without your account name until its last member
          leaves. Its content, including personal information you wrote into cards, remains visible
          to those members. Other owners may retain invitation and Activity records concerning you.
          Publisher accounts require a deletion request by email. Contact us if retained shared
          content contains personal information you want erased.
        </Trans>
      </p>
      <h2>
        <Trans>Your rights and choices</Trans>
      </h2>
      <p>
        <Trans>
          You can edit your content and settings, export your library, control AI services and
          reminders, revoke keys and disconnect apps. You can also request access, correction,
          erasure, restriction or portability of personal data, or object to processing based on
          legitimate interests. These rights depend on the circumstances and applicable law. Email{" "}
          <a href="mailto:hello@lymi.app?subject=Lymi%20privacy%20request">hello@lymi.app</a>; we
          may verify your identity before acting. You can complain to the{" "}
          <a href="https://www.aki.ee/en">Estonian Data Protection Inspectorate</a> or your local
          supervisory authority.
        </Trans>
      </p>
      <h2>
        <Trans>Security, children and changes</Trans>
      </h2>
      <p>
        <Trans>
          We use access controls and encrypted connections to protect data. No online service can
          guarantee absolute security. Lymi is not directed to children below the age at which they
          can lawfully use it. If you believe a child has provided personal data without the
          permission required by law, contact us.
        </Trans>
      </p>
      <p>
        <Trans>
          We update this policy when our practices change. The date above shows the latest revision.
          We provide additional notice when required by law.
        </Trans>
      </p>
    </>
  );
}

export function PrivacyPolicy({ locale }: { locale: string }) {
  return (
    <Localized locale={locale}>
      <PrivacyPolicyContent />
    </Localized>
  );
}
