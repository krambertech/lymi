import { msg } from "@lingui/core/macro";
import { I18nProvider } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import { pageI18n } from "../lib/i18n";

export const PRIVACY_TITLE = msg`Privacy policy · Lymi`;
export const PRIVACY_DESCRIPTION = msg`What Lymi stores, which providers receive it and why, how long it is kept, and how to delete your account.`;
export const PRIVACY_HEADING = msg`Privacy policy`;
export const PRIVACY_LEAD = msg`This policy covers the Lymi website, the web app and the iPhone app: what we receive, why, who helps us provide the service, how long we keep it, and the choices you have.`;
export const PRIVACY_UPDATED = msg`24 October 2026`;

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
      <p>
        <Trans>
          We don’t sell your data, show ads, or track you across other companies’ apps and websites.
          We send data to the providers below only to run the feature you are using.
        </Trans>
      </p>

      <h2>
        <Trans>Your account</Trans>
      </h2>
      <p>
        <Trans>
          <strong>Sign in with Apple</strong> gives us your Apple account identifier, your email
          address (or a private relay address if you choose to hide yours) and, the first time, the
          name you agree to share. Without a name, we use the part of the email address before the
          “@”. We store the identity token Apple returns.
        </Trans>
      </p>
      <p>
        <Trans>
          <strong>Sign in with Google</strong> gives us your name, email address, profile photo and
          Google account identifier, along with the tokens Google returns. We copy the profile photo
          once to use as your picture in Lymi.
        </Trans>
      </p>
      <p>
        <Trans>
          <strong>Email and password</strong>: we store the address and a hash of the password,
          never the password itself. A new account is confirmed with a link that lasts 24 hours or,
          in the iPhone app, a 6-digit code that lasts 15 minutes. A password-reset link lasts one
          hour.
        </Trans>
      </p>
      <p>
        <Trans>
          Each time you sign in we create a session record with your IP address and your browser or
          device description. A session lasts 30 days and renews while you use Lymi. To limit
          repeated sign-in, sign-up and reset attempts, we count them by email address and IP
          address for up to an hour.
        </Trans>
      </p>
      <p>
        <Trans>
          You can change the name and photo on your account. Photos are converted to WebP, which
          removes metadata such as location, and stored privately.
        </Trans>
      </p>

      <h2>
        <Trans>Your cards and learning</Trans>
      </h2>
      <p>
        <Trans>
          We store the decks, series and sections you create or join, and every card in them: term,
          meaning, pronunciation, example, notes, memory hook, tags, source, language, picture and
          audio. We also store each review and grade, the schedule, your daily goal, streak and rest
          days, your time zone, settings, what you told us you are learning when you started, and an
          Activity record of changes.
        </Trans>
      </p>
      <p>
        <Trans>
          Review history is append-only while the account exists, so the schedule stays honest. Undo
          adds a record instead of rewriting the review.
        </Trans>
      </p>
      <p>
        <Trans>
          Card pictures are converted to WebP, which removes metadata, and kept in private storage
          that only signed-in requests can reach. If you add a picture from a link, we fetch it once
          and keep only the website’s name.
        </Trans>
      </p>

      <h3>
        <Trans>Shared decks</Trans>
      </h3>
      <p>
        <Trans>
          When you share a deck, its members see your name, the deck and its cards. You see each
          member’s name, role and when they joined, but not their email address or progress; each
          person’s reviews stay their own. When you invite someone by email, we store their address,
          show it to you until they accept, and send them an email with your name, the deck’s name,
          its language and its number of cards.
        </Trans>
      </p>
      <p>
        <Trans>
          Decks in Explore are published by Lymi’s own library account. Their pages show the
          publisher’s name and count views per day and language, never per person.
        </Trans>
      </p>

      <h2>
        <Trans>AI features</Trans>
      </h2>
      <p>
        <Trans>
          Some features send card content to an AI model provider. Every request goes through
          Cloudflare AI Gateway, which we have set not to log or cache prompts and replies. We never
          send your name, email address or account details. Each provider handles the request under
          its API terms, which can include keeping it for a limited time to detect abuse. What AI
          writes is saved on the card and marked as AI-written.
        </Trans>
      </p>
      <ul>
        <li>
          <Trans>
            <strong>Enrichment (OpenAI)</strong> fills a new card’s empty fields when you add it in
            Lymi, and when you ask for it. It receives the card’s term, language, meaning, example
            and the first 600 characters of its notes, with the deck’s name, description, purpose,
            your instructions for the deck and up to five recent cards from it. Cards added with an
            API key or a connected assistant are enriched only when that request asks for it. In
            each deck you choose which fields AI may fill; the iPhone app’s add screen can turn AI
            off for a card.
          </Trans>
        </li>
        <li>
          <Trans>
            <strong>Deck style (OpenAI)</strong>: after every eight or so new cards or corrections
            in a deck, up to 60 of its cards and up to 20 of your rewrites of AI text are sent so
            future meanings match how you write them.
          </Trans>
        </li>
        <li>
          <Trans>
            <strong>Memory hook drafts (OpenAI)</strong> run only when you ask for one. They receive
            the card’s term, meaning and pronunciation and up to eight other meanings from the deck.
          </Trans>
        </li>
        <li>
          <Trans>
            <strong>Choosing a deck (OpenAI)</strong>: when you share text to Lymi from another app
            and its language is unclear, the text, the title of the page it came from and the
            languages of your decks are sent to pick the deck. When an imported deck’s language is
            unclear, its name and up to 12 of its terms are sent.
          </Trans>
        </li>
        <li>
          <Trans>
            <strong>Smart add (Anthropic)</strong> reads the photos, PDFs and text you give it, with
            the names, descriptions and languages of up to 12 of your decks and a few recent terms
            and meanings from each. Photos are converted to WebP first, which removes metadata.
            Cloudflare Workers AI then checks the terms it found, and, if you ask, compares them
            with your answer. Lymi does not store the files: only the cards you choose to add are
            saved.
          </Trans>
        </li>
        <li>
          <Trans>
            <strong>Japanese pronunciation (Cloudflare Workers AI and Google Gemini)</strong>: the
            first time a Japanese card is played, its term, reading and meaning may be sent to write
            a short lead-in sentence that makes the reading clear.
          </Trans>
        </li>
      </ul>

      <h2>
        <Trans>Pronunciation audio</Trans>
      </h2>
      <p>
        <Trans>
          The first time you play a card, we send the text to be spoken (the term, or its reading)
          and its language to one speech provider: <strong>ElevenLabs</strong>,{" "}
          <strong>Google</strong> (Gemini or Cloud Text-to-Speech) or <strong>OpenAI</strong>,
          depending on the language. We don’t send the meaning, example or notes. We keep the audio
          to play it again and delete it with the card.
        </Trans>
      </p>
      <p>
        <Trans>Lymi never records your voice. The app doesn’t use the microphone.</Trans>
      </p>

      <h2>
        <Trans>Imports and exports</Trans>
      </h2>
      <p>
        <Trans>
          A file you import is kept only while it is processed, and for at most three days if an
          import is left unfinished. An export is kept for 24 hours so you can download it, then
          deleted.
        </Trans>
      </p>

      <h2>
        <Trans>Reminders</Trans>
      </h2>
      <p>
        <Trans>
          In a browser, turning reminders on stores a push address and encryption keys created by
          your browser, with your reminder time and time zone. The reminder goes through your
          browser’s push service and says how many cards are due, never their text. In the iPhone
          app, reminders are scheduled on the phone itself and no push service is involved.
        </Trans>
      </p>

      <h2>
        <Trans>Email</Trans>
      </h2>
      <p>
        <Trans>
          We send email only about your account: confirming an address, resetting a password,
          telling you an address already has an account, deck invitations, the code that confirms
          deleting your account, and the confirmation that it was deleted. There is no newsletter.{" "}
          <strong>Resend</strong> delivers our email and receives the recipient, subject and
          message; <strong>Cloudflare Email Service</strong> delivers it when Resend isn’t
          available. Resend tells us when an email bounces or is marked as spam.
        </Trans>
      </p>
      <p>
        <Trans>
          When you send feedback from the app, it reaches our inbox with your name and email address
          so we can reply.
        </Trans>
      </p>

      <h2>
        <Trans>Connected assistants and API keys</Trans>
      </h2>
      <p>
        <Trans>
          If you connect an assistant such as Claude or ChatGPT through MCP, we store the app’s
          identity, the permissions you approve and its access tokens. An access token lasts an hour
          and a refresh token 30 days. A connected app can read your decks, cards, settings,
          insights and streak, and with write permission it can add, edit, archive and enrich cards
          and organise decks. It can never grade a review, manage keys or connected apps, change
          analytics or delete your account.
        </Trans>
      </p>
      <p>
        <Trans>
          The assistant’s provider receives whatever our tools return to it and handles your
          conversation under its own terms and privacy policy. Lymi receives lesson material from a
          conversation only if the assistant puts it into a card.
        </Trans>
      </p>
      <p>
        <Trans>
          An API key is stored as a hash with its name, permission and when it was last used.
          Activity records whether each change came from you, an API key, a connected app, AI or the
          system. Disconnecting an app or revoking a key stops future access, but doesn’t erase what
          the app already received.
        </Trans>
      </p>

      <h2>
        <Trans>What stays on your device</Trans>
      </h2>
      <h3>
        <Trans>iPhone app</Trans>
      </h3>
      <ul>
        <li>
          <Trans>
            Your sign-in is kept in the iOS Keychain. It is shared, through Lymi’s own keychain
            group, with Lymi’s share extension and Shortcuts action so they can add cards for you.
          </Trans>
        </li>
        <li>
          <Trans>
            Grades and edits made offline wait in the app’s storage until they reach Lymi. A copy of
            your recent data is kept for up to 30 days so the app opens offline.
          </Trans>
        </li>
        <li>
          <Trans>
            Widgets and Control Center receive counts only: cards due, your streak and your goal.
            Never card text.
          </Trans>
        </li>
        <li>
          <Trans>
            The share extension reads only the text you share (up to 500 characters) and the title
            of the page it came from. It ignores links.
          </Trans>
        </li>
        <li>
          <Trans>
            The camera and photo library are used only when you add a picture to a card, a profile
            photo, or pages to Smart add.
          </Trans>
        </li>
        <li>
          <Trans>
            Signing out deletes your data from the phone, the offline queue, widgets and scheduled
            reminders. Your theme, app language and reminder time stay.
          </Trans>
        </li>
      </ul>
      <h3>
        <Trans>Web app</Trans>
      </h3>
      <ul>
        <li>
          <Trans>
            A sign-in cookie keeps you signed in on my.lymi.app for 30 days. Two short-lived cookies
            carry a sign-up or a deck invitation through sign-in and expire after 25 hours. They are
            never sent to lymi.app.
          </Trans>
        </li>
        <li>
          <Trans>
            Browser storage holds grades and edits made offline, a copy of your recent data for up
            to 7 days, recent card pictures and audio, and your preferences. Signing out clears it,
            except a few preferences such as your theme and app language, and saved audio.
          </Trans>
        </li>
      </ul>
      <h3>
        <Trans>Website</Trans>
      </h3>
      <p>
        <Trans>
          lymi.app sets no cookies. It remembers your theme and the language of code samples in your
          browser’s storage. We do not use advertising cookies anywhere.
        </Trans>
      </p>

      <h2>
        <Trans>Analytics and error reports</Trans>
      </h2>
      <p>
        <Trans>
          We use <strong>PostHog</strong>’s EU service to understand how Lymi is used. Events pass
          through our own servers first, which remove anything not on a fixed list and add the
          country of the request. PostHog does not look up your location, record sessions or capture
          clicks automatically.
        </Trans>
      </p>
      <p>
        <Trans>
          On lymi.app we count visits without cookies or any identifier stored on your device:
          PostHog derives a visitor code from the day, your IP address and browser, then discards
          the address, so a visit can’t be linked to another day’s. Links on lymi.app add the
          referring website and campaign labels to the address they open, so sign-up can record
          where a visit began.
        </Trans>
      </p>
      <p>
        <Trans>
          In the web and iPhone apps we link product events to your account’s opaque identifier.
          Events carry the kind of screen (never its exact address), fixed action labels, counts,
          review grades, app language, app version, your device’s operating system and country. For
          AI features they carry the model, token count and cost, never the text. We do not send
          card content, email addresses, names or credentials.
        </Trans>
      </p>
      <p>
        <Trans>
          We do this on the basis of our legitimate interest in understanding and improving Lymi. To
          object, email <a href="mailto:hello@lymi.app?subject=Lymi%20analytics">hello@lymi.app</a>{" "}
          and we will stop product analytics for your account, including from connected apps and
          background work.
        </Trans>
      </p>
      <p>
        <Trans>
          Error reports also go to PostHog, including after you object to analytics, because they
          are how we find and fix failures. A report contains the error type and technical stack
          frames, with the message and other context removed. A report from our servers includes
          your account identifier when the error happened in a signed-in request.
        </Trans>
      </p>
      <p>
        <Trans>
          Separately, we count requests and actions by type and measure response times, without any
          account identifier, card content or exact address. Our hosting provider processes request
          metadata, security signals and error logs to run and protect Lymi; query strings are
          removed from those logs.
        </Trans>
      </p>

      <h2>
        <Trans>Who receives data</Trans>
      </h2>
      <ul>
        <li>
          <Trans>
            <strong>Cloudflare</strong> hosts the website and apps, the database and file storage,
            protects the network, routes AI requests, runs Workers AI, converts pictures, keeps
            operational logs and delivers email when Resend can’t.
          </Trans>
        </li>
        <li>
          <Trans>
            <strong>OpenAI</strong> provides enrichment, deck style, memory hook drafts, deck choice
            and some pronunciation audio.
          </Trans>
        </li>
        <li>
          <Trans>
            <strong>Anthropic</strong> reads the material you give Smart add.
          </Trans>
        </li>
        <li>
          <Trans>
            <strong>Google</strong> provides Sign in with Google, some pronunciation audio and
            Japanese lead-in sentences.
          </Trans>
        </li>
        <li>
          <Trans>
            <strong>ElevenLabs</strong> provides pronunciation audio for some languages.
          </Trans>
        </li>
        <li>
          <Trans>
            <strong>Apple</strong> provides Sign in with Apple.
          </Trans>
        </li>
        <li>
          <Trans>
            <strong>PostHog</strong> provides product analytics and error reports in its EU cloud.
          </Trans>
        </li>
        <li>
          <Trans>
            <strong>Resend</strong> delivers our email.
          </Trans>
        </li>
        <li>
          <Trans>
            <strong>Expo</strong> delivers updates to the iPhone app; each time the app opens it
            checks for one, which shares the app version and your IP address with Expo.
          </Trans>
        </li>
        <li>
          <Trans>
            <strong>Your browser’s push service</strong> carries web reminders.
          </Trans>
        </li>
        <li>
          <Trans>
            <strong>Apps you connect</strong> receive what their permissions allow, and{" "}
            <strong>people you share a deck with</strong> see what is described under Shared decks.
          </Trans>
        </li>
      </ul>
      <p>
        <Trans>
          Some of these providers process data outside Estonia and the European Economic Area. Where
          required, we rely on the transfer safeguards each provider offers, such as the European
          Commission’s standard contractual clauses.
        </Trans>
      </p>

      <h2>
        <Trans>Why we use data</Trans>
      </h2>
      <ul>
        <li>
          <Trans>
            To provide your account and the features you use. This is needed to perform our
            agreement with you.
          </Trans>
        </li>
        <li>
          <Trans>
            To keep Lymi secure and working: authenticating requests, enforcing permissions,
            preventing abuse and fixing errors. This is our legitimate interest.
          </Trans>
        </li>
        <li>
          <Trans>
            To understand how Lymi is used and improve it, as described under Analytics. This is our
            legitimate interest, and you can object.
          </Trans>
        </li>
        <li>
          <Trans>To answer support and privacy requests, and to meet legal obligations.</Trans>
        </li>
      </ul>

      <h2>
        <Trans>How long we keep data</Trans>
      </h2>
      <ul>
        <li>
          <Trans>
            Account and learning data, session records and Activity stay while your account exists.
          </Trans>
        </li>
        <li>
          <Trans>
            API keys stay until you revoke them or they expire. Connected-app tokens and approvals
            stay until they expire, you disconnect the app or you delete your account.
          </Trans>
        </li>
        <li>
          <Trans>
            Web reminder subscriptions stay until you turn reminders off or the push service reports
            them expired.
          </Trans>
        </li>
        <li>
          <Trans>
            Import files stay at most three days, exports 24 hours, and Smart add material is never
            stored.
          </Trans>
        </li>
        <li>
          <Trans>
            Cloudflare keeps operational logs, and Resend and Cloudflare keep email delivery logs,
            for the periods their services set. We keep no separate long-term copy.
          </Trans>
        </li>
        <li>
          <Trans>
            Email addresses from the private beta’s access requests stay until you ask us to remove
            them.
          </Trans>
        </li>
      </ul>

      <h2>
        <Trans>Deleting your account</Trans>
      </h2>
      <p>
        <Trans>
          You can delete your account yourself: on the iPhone, in You › Delete account; on the web,
          in Settings › Delete account. You confirm with a code we email you or, on the iPhone, with
          Sign in with Apple. Deletion happens at once and can’t be undone, so export your library
          first if you want to keep it.
        </Trans>
      </p>
      <p>
        <Trans>
          We delete your profile and photo, sign-in records and sessions, decks and cards that only
          you use, pictures and audio, reviews and schedule, settings, reminders, connected apps and
          your Activity. Your API keys stop working at once. We ask PostHog to delete your analytics
          profile and its events. If you confirm with Sign in with Apple, we also revoke Lymi’s
          access to your Apple account; otherwise you can remove Lymi from your Apple or Google
          account settings. We send one last email to confirm the deletion.
        </Trans>
      </p>
      <p>
        <Trans>
          A deck other people study stays for them, without your name. It is deleted once its last
          member leaves. We keep a record that an account was deleted, with counts but no name or
          email address. Owners of decks you joined keep a note in their Activity that you left, and
          an owner who invited you by email keeps that invitation in their history. An account that
          publishes decks in Explore can’t be deleted in the app; email us instead.
        </Trans>
      </p>

      <h2>
        <Trans>Your choices and rights</Trans>
      </h2>
      <p>
        <Trans>
          In Lymi you can edit cards and settings, export your library, choose which fields AI
          fills, turn reminders off, revoke API keys, disconnect apps and delete your account.
          Archiving a card or deck hides it and can be undone; it is not deletion.
        </Trans>
      </p>
      <p>
        <Trans>
          You have the right to access, correct, delete and move your data, and to object to or
          restrict how we use it. For anything you can’t do in Lymi, email{" "}
          <a href="mailto:hello@lymi.app?subject=Lymi%20privacy%20request">hello@lymi.app</a> from
          your account address. We may ask you to confirm your identity first, and we will answer
          within the time data-protection law sets. You can also complain to the Estonian Data
          Protection Inspectorate or your local supervisory authority.
        </Trans>
      </p>

      <h2>
        <Trans>Security and children</Trans>
      </h2>
      <p>
        <Trans>
          We use access controls, encrypted connections and our providers’ security controls to
          protect data, but no online service can guarantee absolute security. Keep API keys and
          connection tokens to yourself. Lymi is not directed to children who cannot lawfully
          consent to this processing.
        </Trans>
      </p>

      <h2>
        <Trans>Changes and contact</Trans>
      </h2>
      <p>
        <Trans>
          We update this policy when Lymi or the law changes, and change the date above. When a
          change materially affects your rights, we will tell you in Lymi or by email. Questions and
          privacy requests go to <a href="mailto:hello@lymi.app">hello@lymi.app</a>.
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
