// Deletes the persona's account the way the web page does: ask for a code, read it from the dev outbox, confirm.
const headers = { cookie: COOKIE, "content-type": "application/json" };
const sent = http.post(`${WORKER}/api/me/deletion/code`, { headers, body: "{}" });
if (sent.status !== 200) throw new Error(`Sending the code answered ${sent.status}`);
const mail = json(
  http.post(`${WORKER}/api/dev/outbox`, {
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ to: EMAIL }),
  }).body,
);
const code = mail.message.text.match(/\b\d{6}\b/)[0];
const done = http.request(`${WORKER}/api/me`, {
  method: "DELETE",
  headers,
  body: JSON.stringify({ code }),
});
if (done.status !== 200) throw new Error(`The delete answered ${done.status}`);
output.deleted = true;
