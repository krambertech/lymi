// Reads the deletion code from the local Worker's outbox, as the learner reads it from their email.
const response = http.post(`${WORKER}/api/dev/outbox`, {
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ to: EMAIL }),
});
const text = json(response.body).message.text;
output.CODE = text.match(/\b(\d{6})\b/)[1];
