---
status: accepted
date: 2026-10-16
---

# Import and export run on the phone

Import and export are native on the phone, with the same API, the same steps and the same words as the web. The phone picks a file from iOS's Files with the system document picker, sends it through the same resumable upload in parts, and asks the preview's questions one screen at a time; it exports by having the server write the file, downloading it with the learner's session and handing it to iOS's share sheet, where it can be saved to Files, sent with AirDrop or opened in Anki. This moves two of the five setup jobs in [ADR 0030](0030-the-phone-leads-the-daily-jobs-and-setup-stays-on-the-web.md) to the phone; API keys and connected apps, publishing and deck reports stay on the web.

## Context

ADR 0030 kept import and export on the web because they involve files and were done at a desk, and said a setup job moves once learners reach for it on the phone. Learners arriving from AnkiMobile, AnkiDroid, Mochi and Noji have their collection on the phone they open Lymi on: those apps export to the share sheet and Files, and Noji mails the file. Sending them to the web meant moving a file to a computer first, on the first day, when Welcome's own start choice offers an import. The phone already ships `expo-file-system`, whose picker, file reads and authenticated download cover both jobs, so this needs no new native module and ships over the air ([ADR 0032](0032-the-phone-ships-over-the-air-and-the-api-keeps-every-supported-release-working.md)).

## Considered options

- **Keep both on the web:** rejected. The file is on the phone, and the web route made the first import a two-device job.
- **Native screens over the shared API and upload:** accepted. `packages/client` owns the upload in parts, its retries and the note types the preview asks about, so the two apps differ only in how a file is read and saved.
- **Receive files shared from other apps into Lymi:** deferred. Registering Lymi as a handler for `.apkg`, `.mochi` and `.ofc` needs document types in the binary and a native release; choosing the file from Files covers the same need meanwhile.

## Consequences

- The phone's import pages live at the web's paths, `/import`, `/import/<app>` and `/import/<id>`, so Activity opens an import on the screen that started it, and `$pageview` counts both apps under one path.
- An upload runs while Lymi is open. iOS suspends the app soon after it leaves the screen, so the upload page says to keep Lymi open and the failed part is retried from where it stopped; a closed app asks for the same file again.
- The phone's frozen API contract now includes the import and export routes, so they keep every supported release working.
- `export_started` counts exports from both apps, and `import_started` and `export_started` from the phone carry `client=phone`.
