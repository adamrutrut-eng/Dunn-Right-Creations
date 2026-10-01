# Dunn Right Creations — website

Single-page marketing site for Dunn Right Creations (irrigation, sprinkler repair and drainage in Mansfield, TX and the southern DFW area). Static HTML, CSS and vanilla JavaScript. No build step is required to run it.

## What's in here

| Path | Purpose |
| --- | --- |
| `index.html` | The whole page: hero, services, why-us, process, reviews, service area, quote form, footer |
| `styles.css` | Design tokens and all styling |
| `main.js` | Scroll-scrubbed hero, lazy video loops, nav, reveal animations, quote form |
| `assets/hero/` | 120 WebP frames for the scroll-scrubbed hero (generated from the hero clip) |
| `assets/video/` | Looping background clips (720p H.264, crossfaded loop seam) |
| `assets/img/` | Logo, favicon, poster frames |
| `scripts/process-video.sh` | Turns raw renders into the frame sequence, loops and posters (needs ffmpeg) |
| `scripts/build-artifact.mjs` | Builds `dist/artifact.html` (CSS and JS inlined) for the claude.ai preview |

## Run locally

Any static server works:

```sh
python3 -m http.server 8080
# then open http://localhost:8080
```

## Deploy

The site is plain files, so it deploys anywhere that serves static files. GoDaddy's Website Builder cannot host custom code, so point the domain at one of these instead:

- **Netlify**: drag the folder onto app.netlify.com, or connect this repo. Publish directory is the repo root.
- **Vercel**: import the repo, framework preset "Other", output directory `.`.
- **GitHub Pages**: Settings → Pages → deploy from the `main` branch, folder `/ (root)`.

Then in GoDaddy DNS, point `dunnrightcreations.com` (A/ALIAS) and `www` (CNAME) at the host. Each host's dashboard shows the exact records.

## Wiring up the quote form

The form works on day one with no account: it composes the request and opens the visitor's email app (and offers a text message and a copy button). To have submissions land in an inbox automatically, edit the `QUOTE_CONFIG` block at the top of `main.js`:

```js
// Formspree (formspree.io, free tier is fine)
endpoint: 'https://formspree.io/f/<your-form-id>',

// or Web3Forms (web3forms.com, key is emailed to you)
endpoint: 'https://api.web3forms.com/submit',
accessKey: '<your-access-key>',
```

Both services forward to `dunnrightcreations1@gmail.com` and support the photo attachments on their paid tiers.

## Regenerating video assets

Raw clips were generated with OpenArt (Veo 3.1 for the hero, Kling 3.0 for the loops). To rebuild the web assets from new raw clips:

```sh
# raw/ must contain hero.mp4, loop-sprinkler.mp4, loop-creek.mp4, loop-lighting.mp4, loop-drain.mp4
scripts/process-video.sh path/to/raw
```

The hero frame count is set in `scripts/process-video.sh` (`FRAMES`) and must match `HERO.frameCount` in `main.js`.

## Things to confirm with Connor before launch

- Texas requires a TCEQ Licensed Irrigator number on irrigation advertising. Add the LI number to the footer once confirmed.
- Service-area city list (currently from the Nextdoor page plus nearby cities).
- Business hours, if any should be shown.
- Replace AI-generated footage with real job photos and video as they become available. The `assets/` layout and `scripts/process-video.sh` work the same with real clips.
- Reviews are quoted from public Nextdoor recommendations with initials only. Swap in full names with permission.
