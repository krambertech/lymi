# Learning email

The series that reaches a learner who has stopped: one email per person, a card on a loose pile, and a signed Flip page that opens with no session. [The proposal](../../../../docs/proposals/email.md) owns who gets what and when.

## Reach

`/emails` draws every kind. An email's links open `/flip/$token` and `/unsubscribe/$token`.

## Drive

`POST /api/dev/emails/learning` with `{"as":"learner","step":"next"}` returns what the cron would send, including the real `url` and `unsubscribeUrl`. The steps are `first`, `how`, `nodeck`, `next`, `back` and `last`.

1. Open `url` signed out. The card turns by itself, shows no grades, and Continue goes to `/login`, which returns to `/review`.
2. Open it signed in as that persona. Grade **Good**. The page goes to `/review`, and opening the link again offers no grades.
3. Open `unsubscribeUrl` and press **Turn off**. Settings shows Learning emails off. Turn it back on.

## End state

`reviews` holds one row for the grade, and none from opening the link. `user_settings.learning_emails` follows the switch. `dispatchLearningEmails` sends nothing without `LEARNING_EMAILS_SINCE`.

## Gotchas

The local Worker reads `.dev.vars`, so a real send through `/emails` needs `RESEND_API_KEY` there. A sent email's links point at localhost unless they come from the sample data.
