// The code the phone just asked for, read from the dev outbox.
const mail = json(
  http.post(`${WORKER}/api/dev/outbox`, {
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ to: EMAIL }),
  }).body,
);
output.code = mail.message.text.match(/\b\d{6}\b/)[0];
