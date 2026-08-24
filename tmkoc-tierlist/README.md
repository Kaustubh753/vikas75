# Gokuldham Tier List 👓

A tier-list board for **Taarak Mehta Ka Ooltah Chashmah** story arcs. As and when
you watch an arc, drag it into a tier — S ("Ek Number!") down to F ("Fire Brigade
Bulao!"). It comes pre-loaded with the show's famous arcs (researched and
fact-checked from the web), and you can add your own as you go.

> **Live board:** https://claude.ai/code/artifact/a1b2a212-4c4e-4a44-8169-f552f162f41b

## Using it

- **Rate an arc** — drag a card into a tier row, or tap the card and pick a tier.
  Keyboard: focus a card and press `S` `A` `B` `C` `D` `F` (`P` sends it back).
- **Add an arc** — "+ Add arc". New arcs go straight into the tier picker.
- **Rename tiers** — tap the name on any tier plate.
- **Kya dekhein?** — picks a random unwatched arc from the pool.
- **Poster** — exports the whole board as a shareable PNG.
- **Undo** — `Cmd/Ctrl+Z` or the Undo button.
- **Saves itself** — the board persists in the page itself (works across your
  devices when opened from the live link) plus a local copy in the browser.
  Backup/restore as JSON lives under the `⋯` menu.

## Putting it on your Home Screen (daily use)

The app is built to live on your home screen:

- **iPhone / iPad** — open the live board in **Safari → Share → Add to Home
  Screen**. It gets its own icon and opens full-screen like any app.
- **Even better, once this branch is deployed**: open
  `https://<your-vikas75-domain>/tierlist` and add *that* to your home screen.
  It's a full PWA (`public/tierlist/`) — custom ooltah-chashmah icon,
  standalone window, works offline via a service worker.
- **Android** — open either URL in Chrome → menu → **Add to Home screen**
  (Chrome offers "Install app" on the `/tierlist` URL).
- **Mac** — Safari → **File → Add to Dock**, or use the DMG builder below.

One note: the claude.ai link syncs your board across devices; the `/tierlist`
PWA saves per device (use the `⋯` menu's JSON backup to move a board).

## Getting it on your Mac (app + DMG)

A genuine `.dmg` has to be minted by macOS's own `hdiutil`, and an unsigned app
*downloaded* from the internet gets blocked by Gatekeeper — so instead of
shipping a pre-made DMG that macOS would refuse to open, this repo ships a tiny
builder that makes both **on your Mac, locally** (locally built apps carry no
quarantine flag and open cleanly):

1. Download [`mac/Make-Mac-App.command`](mac/Make-Mac-App.command).
2. Open **Terminal** and run:
   ```bash
   bash ~/Downloads/Make-Mac-App.command
   ```
3. Done — **Taarak Tier List.app** is in your Applications (with a proper
   ooltah-chashmah icon), and **Taarak-Tier-List.dmg** is on your Desktop for
   carrying to another Mac.

**Zero-install alternative:** open the live board in **Safari → File → Add to
Dock**. macOS turns it into a Dock app with its own window. Same trick on
iPhone: Share → Add to Home Screen.

## Files

| File | What it is |
|---|---|
| `app.html` | Source of the published artifact page (body content) |
| `index.html` | Standalone build — open directly in any browser, works offline |
| `build.sh` | Wraps `app.html` into `index.html` |
| `mac/Make-Mac-App.command` | Builds the Mac app + DMG locally |
| `mac/make-mac-app.template.sh` | Template the `.command` is generated from |
| `mac/appicon-1024.png` | App icon |
| `../public/tierlist/` | Installable PWA build (manifest, icons, service worker) |

No frameworks, no build tools — one self-contained HTML file (vanilla JS),
Google Fonts (Modak + Baloo 2) as the only external resource.
