# Vice Cover Studio

[![make.fun bounty](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/c/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Alf212/vice-cover-studio-5/rank.svg)](https://make.fun/c/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Alf212/vice-cover-studio-5/reward.svg)](https://make.fun/c/gta6-cover-art-01)

Vice Cover Studio is a static, offline web app that turns your own photos into
multi-panel, GTA-style game cover art. Drop in one photo or several, arrange
them across the panels of a poster layout, add a bold headline, pick a Vice
City sunset or neon colour grade, and export a share-ready PNG.

It was built for the [gta6-cover-art-01 bounty on make.fun](https://make.fun/c/gta6-cover-art-01).

## Features

- **Multi-panel layouts** — duo, trio, quad, hero-and-strip and widescreen
  banner arrangements, drawn as one composed poster on a canvas.
- **Your photos, your machine** — photos are read locally in the browser and
  never uploaded anywhere. Fill every panel with one photo, or give each
  panel its own.
- **Position each shot** — click a panel to select it, drag the photo inside
  it, and zoom with the slider until the crop feels right.
- **Bold cover lettering** — headline and subline rendered in a heavy
  system-font stack with a gradient fill, dark outline and hard shadow, the
  way poster captions look. No webfont is loaded; it works fully offline.
- **Colour grades** — sunset, neon, noir or clean, applied per poster with
  gradient overlays, panel keylines and a vignette.
- **Post sizes** — export at 1080 x 1080, 1080 x 1350 or 1920 x 1080 PNG.
- **Instant demo** — with no photo loaded, each panel draws a procedural
  sunset skyline scene so the layouts and lettering can be tried at once.

## Run it

The app is plain static files under `app/` with no build step. Serve the
folder with any static HTTP server and open it in a desktop browser:

```sh
npx serve app
# or
python3 -m http.server --directory app 8080
```

Then open the address the server prints. Everything runs on your machine;
the app makes no network requests.

## Handing it in

`main.ts` (Node 22, standard library only) copies `app/` and `screenshots/`
to the output directory and writes `dossier.json` with the vendored
`buildDossier` from `vendor/makefun-app.ts`:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## License

MIT — see `LICENSE`. Vice Cover Studio is an original work: no Rockstar
Games logo, artwork, character or font is used anywhere in it.
