import { ORIGIN } from "../origin";
import { Defs, H2, H3, Lead, NextLinks, Note, Steps, StepTitle } from "../Prose";

const HOST = new URL(ORIGIN).host;

/** Written for a learner holding a phone, not for a developer. */
export function Mobile() {
  return (
    <div className="doc-prose">
      <Lead>
        A Lymi app for iPhone and Android is planned, but it is not in the App Store or Google Play
        yet. Until then, add Lymi to your home screen. It opens from its own icon, without the
        browser around it, and keeps the same cards you see on a computer.
      </Lead>

      <Note title="Lymi can show you the steps">
        Open Lymi on your phone and tap your picture at the top of Today. If the menu has{" "}
        <strong>Install Lymi</strong>, choose it. On Android it asks to install Lymi, and on an
        iPhone it shows the steps below.
      </Note>

      <H2>iPhone and iPad</H2>
      <Steps>
        <div>
          <StepTitle>Open Lymi in Safari</StepTitle>
          <p>
            Go to <a href={ORIGIN}>{HOST}</a> and sign in.
          </p>
        </div>
        <div>
          <StepTitle>Tap Share</StepTitle>
          <p>
            Share is the square with an arrow pointing up. If you don’t see it, tap{" "}
            <strong>•••</strong> first.
          </p>
        </div>
        <div>
          <StepTitle>Tap Add to Home Screen</StepTitle>
          <p>
            Scroll down the list to find it. Leave <strong>Open as Web App</strong> on, then tap{" "}
            <strong>Add</strong>.
          </p>
        </div>
        <div>
          <StepTitle>Open Lymi from the new icon</StepTitle>
          <p>
            The icon on your Home Screen keeps its own sign-in, separate from Safari, so Lymi may
            ask you to sign in once more.
          </p>
        </div>
      </Steps>
      <p>
        Chrome and Edge on an iPhone can add Lymi too. Tap Share in the address bar, then{" "}
        <strong>Add to Home Screen</strong>.
      </p>

      <H2>Android</H2>
      <Steps>
        <div>
          <StepTitle>Open Lymi in Chrome</StepTitle>
          <p>
            Go to <a href={ORIGIN}>{HOST}</a> and sign in.
          </p>
        </div>
        <div>
          <StepTitle>Open the Chrome menu</StepTitle>
          <p>
            Tap <strong>⋮</strong> next to the address bar, then <strong>Add to home screen</strong>
            . On some phones it says <strong>Install app</strong>.
          </p>
        </div>
        <div>
          <StepTitle>Tap Install</StepTitle>
          <p>Lymi appears on your home screen and in your list of apps.</p>
        </div>
      </Steps>
      <p>
        Samsung Internet and Firefox can install Lymi as well. Open the browser menu and look for{" "}
        <strong>Add to home screen</strong> or <strong>Install</strong>.
      </p>

      <H2>What you get</H2>
      <Defs
        items={[
          {
            term: "Its own window",
            def: "Lymi opens full screen from its icon, with no address bar, and shows up in the app switcher like any other app.",
          },
          {
            term: "A daily reminder",
            def: "In Settings, turn on Daily reminder. It arrives only on days with cards due. An iPhone or iPad sends reminders only to Lymi on the Home Screen, so install it first.",
          },
          {
            term: "Reviews without a connection",
            def: "Open Lymi once while you are online. After that you can review on a plane, and your answers are sent when you are back online.",
          },
          {
            term: "Updates",
            def: "There is nothing to update. Lymi loads its newest version when you open it.",
          },
          {
            term: "One account",
            def: "Your phone, your computer and any connected assistant see the same decks and cards. Reminders are set on each device.",
          },
        ]}
      />

      <H2>Remove Lymi from your phone</H2>
      <p>
        Touch and hold the icon. On an iPhone choose <strong>Remove App</strong>, and on Android
        choose <strong>Uninstall</strong>. Your decks and cards stay in your account.
      </p>

      <H2>If something goes wrong</H2>
      <H3>There is no Add to Home Screen</H3>
      <p>
        On an iPhone, scroll to the bottom of the Share list, tap <strong>Edit Actions</strong> and
        add it. On either phone, check that Lymi is open in the browser itself. A link opened from
        inside another app, such as Gmail or Instagram, opens a small browser that can’t install
        anything. Open the link in Safari or Chrome instead.
      </p>
      <H3>Lymi says notifications are blocked</H3>
      <p>
        Your phone is blocking notifications from Lymi. On an iPhone, open <strong>Settings</strong>
        , then <strong>Notifications</strong>, then <strong>Lymi</strong>. On Android, open{" "}
        <strong>Settings</strong>, then <strong>Apps</strong>, then <strong>Lymi</strong> or{" "}
        <strong>Chrome</strong>, then <strong>Notifications</strong>. Allow them, then turn the
        reminder on again.
      </p>

      <Note title="When the app arrives">
        The Lymi app will use the same account. Sign in and your decks, cards and review history are
        already there.
      </Note>

      <NextLinks
        items={[
          {
            to: "/docs/cards",
            title: "Decks and cards",
            blurb: "How a card is shaped, and what counts as a duplicate.",
          },
          {
            to: "/docs/import-from-anki",
            title: "Import from Anki",
            blurb: "Bring your Anki decks across, from a computer or a phone.",
          },
        ]}
      />
    </div>
  );
}
