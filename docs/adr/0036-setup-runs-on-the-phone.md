---
status: accepted
date: 2026-10-17
supersedes: 0030
---

# Setup runs on the phone

Import, export, API keys and connected apps are native on the phone, with the same API, the same steps and the same words as the web, so nothing in the phone app sends the learner to the web app. The phone picks a file from iOS's Files with the system document picker, sends it through the same resumable upload in parts, and asks the preview's questions one screen at a time; it exports by having the server write the file, downloading it with the learner's session and handing it to iOS's share sheet, where it can be saved to Files, sent with AirDrop or opened in Anki. API keys and connected apps are pages under You with the web's rows, and their final actions, revoking a key and disconnecting an app, ask first in iOS's alert. Publishing and deck reports are done with an API key from the docs, so You links to the API reference, as the web does. This replaces the setup half of [ADR 0030](0030-the-phone-leads-the-daily-jobs-and-setup-stays-on-the-web.md); its rule that the phone is built first for the daily jobs stands.

## Context

ADR 0030 kept five setup jobs on the web because they involve files or long secrets and were done at a desk, and said a job moves once learners reach for it on the phone. Learners arriving from AnkiMobile, AnkiDroid, Mochi and Noji have their collection on the phone they open Lymi on: those apps export to the share sheet and Files, and Noji mails the file. Sending them to the web meant moving a file to a computer first, on the first day, when Welcome's own start choice offers an import. Keys and connected apps were the remaining rows that left the app, and each is a short list with one form, so a learner who reaches You for them should not be dropped into a browser to sign in again. The phone already ships `expo-file-system`, whose picker, file reads and authenticated download cover the file jobs, so this needs no new native module and ships over the air ([ADR 0032](0032-the-phone-ships-over-the-air-and-the-api-keeps-every-supported-release-working.md)).

## Considered options

- **Keep the setup jobs on the web:** rejected. The file is on the phone, and the web route made the first import a two-device job.
- **Native screens over the shared API and client:** accepted. `packages/client` owns the upload in parts, its retries, the note types the preview asks about and how a connected app is identified, so the two apps differ only in how a file is read and saved.
- **Receive files shared from other apps into Lymi:** deferred. Registering Lymi as a handler for `.apkg`, `.mochi` and `.ofc` needs document types in the binary and a native release; choosing the file from Files covers the same need meanwhile.

## Consequences

- The phone's import pages live at the web's paths, `/import`, `/import/<app>` and `/import/<id>`, so Activity opens an import on the screen that started it, and `$pageview` counts both apps under one path. Keys count as `/api-keys`, and Apps and each app's page as the web's `/settings` and `/settings/:item`.
- An upload runs while Lymi is open. iOS suspends the app soon after it leaves the screen, so the upload page says to keep Lymi open and the failed part is retried from where it stopped; a closed app asks for the same file again.
- The phone's frozen API contract now includes the import, export, key and connected-app routes, so they keep every supported release working.
- `export_started` counts exports from both apps, and `import_started` and `export_started` from the phone carry `client=phone`.
- A new learning feature still ships on the web first and reaches the phone through a linked phone issue, as ADR 0030 says.
