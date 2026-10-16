# Delete account

Ending the account from the phone, as the web's page does: what goes and what stays, a link to the web's export, then an emailed code and the delete. The phone signs out after.

## Reach

The **You** tab, then the **Delete account** row, the last one, under **Sign out**.

## Drive

[`delete-account.yaml`](delete-account.yaml), as `learner`: open **You**, tap **Delete account**, check the page counts what goes, tap **Send code**, type the code from the dev outbox ([`delete-account.js`](delete-account.js)), delete, and land on the signed-out start screen.

## End state

[`delete-account.mjs`](delete-account.mjs) reads `/api/me` with the runner's session: it answers 401, because the delete ended every session of the account.

## Gotchas

- The delete button shares its label with the page title, so the flow taps it by its `delete-account` test ID.
- The account is gone after this feature; the next feature's persona reset creates it again.
- The row is the last on You, so the scroll centres it first; left at the bottom edge, the floating tab bar takes the tap.
