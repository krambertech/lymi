# Delete account

Ending the account from the phone. For now the phone opens the web's delete page in the in-app browser, and signs itself out when the browser closes on a session the delete ended.

## Reach

The **You** tab, then the **Delete account** row, the last one, under **Sign out**.

## Drive

[`delete-account.yaml`](delete-account.yaml), as `learner`: open **You**, tap **Delete account**, wait for the web page in the in-app browser, delete the account through the API with an emailed code ([`delete-account.js`](delete-account.js)), close the browser, and land on the signed-out start screen.

## End state

[`delete-account.mjs`](delete-account.mjs) reads `/api/me` with the runner's session: it answers 401, because the delete ended every session of the account.

## Gotchas

- The in-app browser keeps its own cookies, so the web page usually opens on its sign-in screen; the flow accepts either and deletes through the API instead of typing on the web.
- The account is gone after this feature; the next feature's persona reset creates it again.
