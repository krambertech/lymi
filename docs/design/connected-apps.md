# Letting an app in

Three screens carry the connection between Lymi and an MCP client: the door (`/login`), the decision (`/consent`), and the ending (the same route, after the decision).

Who is asking is answered by the **host of the `client_id`**, and by nothing else the client sent. A recognised host is named ("Claude"); every other app is titled by its address, and its own `client_name` appears only as a claim, in the form "it calls itself X". Putting an unverified name in the headline of a permission screen is the same mistake as rendering an unverified logo. A client identifies itself with a Client ID Metadata Document that has to be served from that HTTPS host, so the host is the one claim in the request that cannot be forged. It is shown in mono, in a pill under the app's name, with a check when it is a host we ship a mark for. An app we do not recognise says so in words and shows the address to check.

Marks for known clients are bundled and drawn in their own brand colour, which is what makes one recognisable at a glance. A vendor's colour is a quotation, not a token: it lives inside the mark and nowhere else, the tile around it stays a plain plate, and amber remains Lymi's only accent. A brand that is monochrome takes the room's ink. `logo_uri` from the client's metadata is never rendered: an attacker-controlled image on a permission screen, shown with the confidence of a verified one, is how consent phishing works. An unrecognised client gets a monogram, so it can never borrow a known app's appearance.

Read access is stated, not offered, because a connector cannot work without it. Write is the only decision on the screen, so it is the only control: a switch, with a grant dot that mirrors the read row so what the app ends up with reads at a glance. Under both, a plain list of what it can never do, whatever is chosen.

The ending is not optional. An MCP client's redirect is usually a custom scheme, so the browser hands off to the app and leaves the tab where it was; without this screen that tab sits on a blank form. It says what happened, what the app got, and that the tab is finished with.

A grant lasts until it is taken back, so Settings has Connected apps beside API keys, with the same row shape: name, what it may do, the host, and an inline confirm to cut it off.
