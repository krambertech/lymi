# Screenshots for UI PRs

Capture screenshots for any PR that changes what the learner sees, and embed them in the PR body yourself. A reviewer should understand the visual change without running the app. Never silently skip screenshots on a visual change: if you truly cannot produce one, say so explicitly and ask the user to add it.

Lymi is a phone-first PWA. **Every UI shot comes in a pair: one iPhone-width, one desktop.** A desktop-only screenshot hides the surface the app is actually used on. When the change touches color or theme, shoot both themes too.

## Capture (before the PR opens)

Screenshots must be real PNG files on disk; an inline screenshot from a browser pane cannot be attached.

### 1. Start the app

```bash
pnpm dev        # http://localhost:5173
```

The app sits behind Google login, so a cold headless Chrome sees the login screen and nothing else. Use a persistent profile: log in once in that profile, and every later run reuses the session.

```bash
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PROFILE="$HOME/.cache/lymi-shots"

# One time, headed: sign in, and set the theme you want in Settings.
"$CHROME" --user-data-dir="$PROFILE" http://localhost:5173
```

The profile also carries `localStorage`, which is where the theme choice lives — set dark in Settings once and shots from that profile come out dark until you change it back.

If the screen needs data the local D1 doesn't have, seed it through the app or the API rather than screenshotting an empty state and calling it done.

### 2. Shoot both viewports

```bash
SHOTS=/tmp/lymi-shots; mkdir -p "$SHOTS"

"$CHROME" --headless=new --user-data-dir="$PROFILE" --hide-scrollbars \
  --window-size=1280,900 --screenshot="$SHOTS/after-review-desktop.png" \
  http://localhost:5173/review

"$CHROME" --headless=new --user-data-dir="$PROFILE" --hide-scrollbars \
  --window-size=393,852 --force-device-scale-factor=2 \
  --screenshot="$SHOTS/after-review-phone.png" \
  http://localhost:5173/review
```

393×852 is an iPhone 15/16. Headless Chrome cannot hold the profile lock while a headed window is open on it — close the headed browser first, or copy the profile directory.

For a state that takes interaction to reach (a sheet open, a card graded, a hover), drive the page with the browser tools instead and save the PNG from there, or add the interaction as a temporary URL.

### 3. Before/after

Capture a "before" only when the change reshapes an *existing* screen. Build `main` in a scratch worktree so the PR branch is untouched, shoot the same views as `before-*.png`, then shoot the branch as `after-*.png`. A brand-new screen gets "after" only. If a clean before is impractical, one after pair is acceptable.

## Attach

The repo is **private**, so only an image inside GitHub's own storage renders inline. A `raw.githubusercontent.com` URL or a third-party host shows a broken image to viewers — camo cannot authenticate.

### 1. The user-attachments endpoint (primary)

The endpoint behind the web editor's drag-drop. Undocumented, but it takes the normal `gh` token and mints the same official `user-attachments` URL a manual drag-drop would. Per image:

```bash
curl -sf "https://uploads.github.com/user-attachments/assets?name=after-review-phone.png&content_type=image/png&repository_id=$(gh api repos/krambertech/lymi --jq .id)" \
  -X POST -H "Authorization: Bearer $(gh auth token)" -H "Accept: application/json" \
  --data-binary "@/tmp/lymi-shots/after-review-phone.png"
```

Parse the response before touching the PR: `jq -er .url` must print a non-empty URL, and anything else stops the flow before `gh pr edit`. Put each URL into the body's `## 📸 Screenshots` table as `![name](url)` — phone and desktop as two columns, before and after as two rows — and push with `gh pr edit N --body-file …`.

### 2. Hand-off (fallback)

Don't block the PR:

1. Hand the image files to the user through the runtime's file-sharing mechanism, or provide clickable local file paths.
2. Leave the `## 📸 Screenshots` heading in the body with a drag-drop placeholder, and tell the user plainly to open the PR on github.com and drag the files into the description box. Say the images are handed over, never that they are attached.

### Verify (rung 1)

Fetch the PR body and confirm the image URLs are in place. Only then is the screenshot handled.
