import { H2, Lead, NextLinks, Note, Steps, StepTitle } from "../Prose";

export function Readwise() {
  return (
    <div className="doc-prose">
      <Lead>
        Connect Readwise to turn new highlights from your reading apps into cards. Lymi checks
        Readwise every hour, even when Lymi is closed.
      </Lead>
      <H2>Connect Readwise</H2>
      <Steps>
        <div>
          <StepTitle>Give your decks a language</StepTitle>
          <p>
            Readwise sends highlights to a deck for each language you learn. Create a deck for that
            language, or set the language in an existing deck’s settings.
          </p>
        </div>
        <div>
          <StepTitle>Copy your Readwise token</StepTitle>
          <p>
            Open <a href="https://readwise.io/access_token">readwise.io/access_token</a>, sign in
            and choose <strong>Get Access Token</strong>. Copy it. This is a Readwise token, not a
            Lymi API key.
          </p>
        </div>
        <div>
          <StepTitle>Connect in Lymi</StepTitle>
          <p>
            On the web, open <strong>Settings → Apps → Readwise</strong>. In the phone app, open{" "}
            <strong>You → Apps → Readwise</strong>. Paste the token and choose{" "}
            <strong>Connect</strong>.
          </p>
        </div>
        <div>
          <StepTitle>Check books and destination decks</StepTitle>
          <p>
            Lymi lists your books and articles. Books it recognizes in a language you learn start
            switched on. Turn off any you do not want, and choose where each language’s highlights
            go. If Lymi cannot tell a book’s language, choose it beside the book.
          </p>
        </div>
      </Steps>
      <Note title="New highlights from when you connect">
        Connecting does not import your whole Readwise history. Lymi looks for highlights added or
        updated after you connect. Use <strong>Check now</strong> to check sooner than the next
        hourly check.
      </Note>
      <H2>What becomes a card</H2>
      <p>
        A highlight of a word or short phrase becomes the term. For a longer passage, put just the
        word or short phrase you want to learn in its Readwise note. Lymi uses that as the term and
        keeps a sentence containing it as the example when it fits.
      </p>
      <p>
        For example, highlight “La nebbia copre la valle ogni mattina.” and put “la nebbia” in its
        note. The card asks about “la nebbia”, with the sentence as its example. A long passage
        without a short term in its note is skipped.
      </p>
      <p>
        A short phrase can have up to four words and 48 characters. For Chinese, Japanese and Thai
        text, the limit is 12 characters. The book’s title and author become the source. Tags from
        Readwise are not copied to the card.
      </p>
      <p>
        Lymi asks to enrich missing fields according to the deck’s settings and your AI services
        choice. Text from the highlight stays. A badge marks the fields Lymi’s AI fills.
      </p>
      <H2>Existing cards and later edits</H2>
      <p>
        A term you already have is skipped. A highlight that already made a card does not make
        another card or overwrite the first when edited in Readwise. Edit the card in Lymi. Deleting
        a highlight or turning off a book does not archive cards already added.
      </p>
      <H2>Find the cards</H2>
      <p>
        Readwise’s page shows its recent Activity and a link to everything it did. Open a card there
        to inspect, edit or archive it. The cards are also in the destination deck in Library.
      </p>
      <H2>If cards are missing</H2>
      <p>
        Check that the highlight has reached Readwise, the book is switched on, its language matches
        a deck, and the destination deck is chosen. A passage needs a short term in its note. Then
        choose <strong>Check now</strong>.
      </p>
      <p>
        <strong>Token refused</strong> means Readwise no longer accepts the token. Copy a new one
        from Readwise and paste it on the connection page. <strong>Token needed</strong> means Lymi
        cannot read its saved token; paste it again. If Readwise does not answer, wait a minute and
        try again.
      </p>
      <H2>Disconnect</H2>
      <p>
        Choose <strong>Disconnect Readwise</strong> on its page and confirm. Lymi forgets the saved
        token and stops checking. Cards already added stay.
      </p>
      <p>
        Lymi reads Readwise’s book details, highlights and notes using its{" "}
        <a href="https://readwise.io/api_deets">API</a>. The token is stored encrypted. If AI
        services are allowed, samples of highlights may be used to identify a book’s language, and
        card content may be sent for enrichment. See the <a href="/privacy">privacy policy</a>.
      </p>
      <NextLinks
        items={[
          {
            to: "/docs/yomitan",
            title: "Yomitan",
            blurb: "Add a card directly from a dictionary lookup.",
          },
          {
            to: "/docs/mcp",
            title: "Connect an assistant",
            blurb: "Make cards from material you share in a conversation.",
          },
        ]}
      />
    </div>
  );
}
