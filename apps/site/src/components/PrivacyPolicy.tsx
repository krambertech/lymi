import { msg } from "@lingui/core/macro";
import { I18nProvider } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import { pageI18n } from "../lib/i18n";

export const PRIVACY_TITLE = msg`Privacy policy · Lymi`;
export const PRIVACY_DESCRIPTION = msg`How Lymi handles account, learning, integration and service data.`;
export const PRIVACY_HEADING = msg`Privacy policy`;
export const PRIVACY_LEAD = msg`This policy explains what Lymi receives, why it uses it, who helps provide the service, and the choices you have.`;
export const PRIVACY_UPDATED = msg`16 September 2026`;

function PrivacyPolicyContent() {
  return (
    <>
      <h2>
        <Trans>Who is responsible</Trans>
      </h2>
      <p>
        <Trans>
          Lymi is provided by Krambertech OÜ, an Estonian private limited company. In this policy,
          “Lymi”, “we” and “us” refer to Krambertech OÜ. Contact us at{" "}
          <a href="mailto:hello@lymi.app">hello@lymi.app</a>.
        </Trans>
      </p>

      <h2>
        <Trans>Data Lymi receives</Trans>
      </h2>
      <h3>
        <Trans>Access requests from the private beta</Trans>
      </h3>
      <p>
        <Trans>
          While Lymi was private, we stored the email address of anyone who asked for access, where
          on the site they asked, and when. We no longer collect these, and anyone can sign up.
        </Trans>
      </p>

      <h3>
        <Trans>Account and sign-in data</Trans>
      </h3>
      <p>
        <Trans>
          Google sign-in gives Lymi your name, email address, profile image if available, and
          identifiers needed to connect the Google account to Lymi. We also keep session records,
          which can include an IP address, browser information and sign-in tokens.
        </Trans>
      </p>
      <p>
        <Trans>
          If you sign in with an email address and a password, we store the address and a hash of
          the password, never the password itself. We also store short-lived records for confirming
          an address and resetting a password, and counts of recent sign-in, sign-up, resend and
          reset attempts by address and IP address, so those requests can be rate limited.
        </Trans>
      </p>

      <h3>
        <Trans>Learning data</Trans>
      </h3>
      <p>
        <Trans>
          We store the decks and cards you create or join. A card can include a term, meaning,
          pronunciation, example, notes, tags, language, source, learning direction and generated
          audio. We also store archive state, review history, scheduling state, goals, streaks, time
          zone, preferences and an activity record of changes.
        </Trans>
      </p>
      <p>
        <Trans>
          Review history is append-only while the account exists so the schedule and learning record
          stay honest. Undo creates a separate record rather than rewriting the original review.
        </Trans>
      </p>

      <h3>
        <Trans>API and connected-app data</Trans>
      </h3>
      <p>
        <Trans>
          If you create an API key, we store the key record, its name, permissions, usage counters
          and dates. If you connect an app through MCP, we store the app identity, the permissions
          you grant, consent records and access or refresh tokens. Lymi records whether a change
          came from you, an API key, a connected app, AI or the system.
        </Trans>
      </p>
      <p>
        <Trans>
          A connected assistant may read lesson material in the conversation where you use it. Lymi
          does not receive that raw lesson material unless the assistant sends it in a card field
          such as the term, meaning, example, notes or source. The assistant provider handles the
          conversation under its own terms and privacy policy.
        </Trans>
      </p>

      <h3>
        <Trans>Audio, reminders and account email</Trans>
      </h3>
      <p>
        <Trans>
          When pronunciation audio is first requested, Lymi sends the card term and language to a
          speech provider. It stores the resulting audio so it can be reused. We do not send the
          rest of the card for speech generation.
        </Trans>
      </p>
      <p>
        <Trans>
          If you enable review reminders, we store a push endpoint, browser-generated encryption
          keys, your reminder time and time zone, and delivery state. Reminder notifications contain
          a due-card count, not card text.
        </Trans>
      </p>
      <p>
        <Trans>
          When Lymi sends an account email, Cloudflare Email Service receives the recipient address,
          sender, subject and message body. Cloudflare handles delivery, bounces and suppression of
          addresses that should not receive another message.
        </Trans>
      </p>

      <h3>
        <Trans>Service data</Trans>
      </h3>
      <p>
        <Trans>
          Our hosting provider processes request metadata, security signals, timings and error logs
          needed to operate and protect Lymi. Query strings are redacted from Worker logs. We avoid
          putting card content, email addresses, access tokens and other private content in logs.
        </Trans>
      </p>

      <h2>
        <Trans>Why we use data</Trans>
      </h2>
      <ul>
        <li>
          <Trans>
            To provide accounts, decks, cards, review scheduling, audio, reminders, account email,
            API access and connected apps.
          </Trans>
        </li>
        <li>
          <Trans>
            To authenticate requests, enforce permissions, prevent abuse and investigate failures.
          </Trans>
        </li>
        <li>
          <Trans>To answer support requests and act on privacy requests.</Trans>
        </li>
        <li>
          <Trans>
            To meet legal obligations and protect the rights and safety of Lymi and its users.
          </Trans>
        </li>
      </ul>
      <p>
        <Trans>
          Depending on the activity and applicable law, we process data to perform our agreement
          with you, with your consent, for legitimate interests such as security and service
          reliability, or to meet a legal obligation. You can withdraw optional consent, such as
          reminders, at any time.
        </Trans>
      </p>

      <h2>
        <Trans>Service providers and other recipients</Trans>
      </h2>
      <ul>
        <li>
          <Trans>
            <strong>Cloudflare</strong> provides the website, application, database, object storage,
            session storage, network protection, operational logs and transactional email delivery.
          </Trans>
        </li>
        <li>
          <Trans>
            <strong>Google</strong> provides Google sign-in and may provide speech generation when
            configured as the fallback provider.
          </Trans>
        </li>
        <li>
          <Trans>
            <strong>OpenAI</strong> may provide speech generation. A configured Cloudflare AI
            Gateway may relay that request.
          </Trans>
        </li>
        <li>
          <Trans>
            <strong>Your connected apps</strong> receive only the data allowed by the permissions
            you approve. Disconnecting an app stops future access but does not erase data the app
            already received.
          </Trans>
        </li>
        <li>
          <Trans>
            <strong>Your browser’s push service</strong> receives an encrypted reminder when you
            enable notifications.
          </Trans>
        </li>
      </ul>
      <p>
        <Trans>
          These providers may process data in countries outside Estonia or the European Economic
          Area. Where required, we rely on the transfer safeguards made available for the relevant
          service.
        </Trans>
      </p>

      <h2>
        <Trans>How long we keep data</Trans>
      </h2>
      <ul>
        <li>
          <Trans>Access requests from the private beta stay until you ask us to remove them.</Trans>
        </li>
        <li>
          <Trans>
            Account and learning data stay while your account is active and are removed when we
            complete an account-deletion request, except where law requires a longer period.
          </Trans>
        </li>
        <li>
          <Trans>
            Sessions normally expire after 30 days and may be refreshed while you remain active.
          </Trans>
        </li>
        <li>
          <Trans>
            API keys stay until you revoke them or they expire. Connected-app tokens and consent
            stay until expiry, revocation, disconnection or account deletion.
          </Trans>
        </li>
        <li>
          <Trans>
            Push subscriptions stay until you disable reminders, the push service reports the
            subscription expired, or the account is deleted.
          </Trans>
        </li>
        <li>
          <Trans>
            Generated audio stays with the related card or account until it is removed under the
            service’s storage lifecycle.
          </Trans>
        </li>
        <li>
          <Trans>
            Cloudflare keeps operational and email-delivery logs under the active service
            configuration. Lymi does not maintain a separate long-term copy of those logs.
          </Trans>
        </li>
      </ul>

      <h2>
        <Trans>Your choices and rights</Trans>
      </h2>
      <p>
        <Trans>
          You can edit card content and settings, archive and restore cards or decks, revoke API
          keys, disconnect apps, and turn reminders off in Lymi. Archive is reversible and is not
          deletion.
        </Trans>
      </p>
      <p>
        <Trans>
          Account-wide access, export, correction and deletion are not self-service yet. Email{" "}
          <a href="mailto:hello@lymi.app?subject=Lymi%20privacy%20request">hello@lymi.app</a> from
          your account address and describe what you need. We may ask you to verify your identity
          before acting. We will respond as required by applicable data-protection law. You may also
          complain to the Estonian Data Protection Inspectorate or your local supervisory authority.
        </Trans>
      </p>

      <h2>
        <Trans>Cookies and local storage</Trans>
      </h2>
      <p>
        <Trans>
          Lymi uses an authentication cookie to keep you signed in. The public site and app also use
          local browser storage for preferences and offline product behavior. We do not use
          advertising cookies.
        </Trans>
      </p>

      <h2>
        <Trans>Security and children</Trans>
      </h2>
      <p>
        <Trans>
          We use access controls, encrypted transport and provider security controls to protect
          data, but no online service can guarantee absolute security. Do not share API keys,
          connection tokens or other credentials. Lymi is not directed to children who cannot
          lawfully consent to this processing.
        </Trans>
      </p>

      <h2>
        <Trans>Changes and contact</Trans>
      </h2>
      <p>
        <Trans>
          We may update this policy when Lymi or the law changes. We will update the date above and
          give additional notice when a change materially affects your rights. Questions and privacy
          requests can be sent to <a href="mailto:hello@lymi.app">hello@lymi.app</a>.
        </Trans>
      </p>
    </>
  );
}

export function PrivacyPolicy({ locale }: { locale: string }) {
  return (
    <I18nProvider i18n={pageI18n(locale)}>
      <PrivacyPolicyContent />
    </I18nProvider>
  );
}
