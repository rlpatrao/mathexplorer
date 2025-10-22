# Times Table Explorer

Times Table Explorer is an interactive multiplication-table coach that combines a hop-by-hop visual grid, spoken narration, and ambient background music. Learners pick a number, watch a translucent orb glide across multiples, and hear each product called out—perfect for memorising tables up to 12 × 150.

You can see the demo at: https://rlpatrao.github.io/mathexplorer/

## Features

- **Dynamic grid:** 1–150 board arranged into columns of ten with animated hop indicator.
- **Adaptive narration:** Full "n × n = product" narration at slower speeds; product-only callouts when hops are faster than 1.5 s.
- **Persistent highlights:** Every landing cell keeps its colour so patterns build visually.
- **Tempo & volume controls:** Adjustable hop speed and shared narration/music volume slider.
- **Background ambience:** Local MP3 loop keeps runs engaging (works offline thanks to precaching).
- **PWA ready:** Manifest, icons, and service worker for installability and offline-first behaviour.
- **Production build pipeline:** `npm run release` bundles with esbuild and emits a deployable `dist/` folder.

## Getting Started

```bash
npm install
npm run release
npx serve dist   # optional: preview locally
```

Open `http://localhost:3000` (or the port shown) after running `npx serve`. The UI loads from the built `dist/` directory.

## Scripts

| Script          | Description |
|-----------------|-------------|
| `npm run clean` | Remove the `dist/` directory. |
| `npm run build` | Bundle and minify `main.ts` → `dist/main.js` using esbuild. |
| `npm run copy:assets` | Copy HTML, CSS, manifest, service worker, audio, and icons into `dist/`. |
| `npm run release` | Run clean → build → copy:assets; use this before deploying. |

## Deployment

1. Run `npm run release` to refresh `dist/`.
2. Deploy the `dist/` folder to your preferred static host (Netlify, Vercel, Cloudflare Pages, GitHub Pages, etc.).
3. Ensure the site is served over HTTPS so the service worker can register and the PWA install prompt appears.

## PWA Notes

- `manifest.webmanifest` defines display mode, theme colours, and icons.
- `sw.js` precaches the core assets (HTML, CSS, JS, MP3, icons) and serves them offline.
- `main.ts` registers the service worker after window load.

## Customisation

- **Audio:** Replace `audio/ambient-loop.mp3` with any royalty-free loop (keep the same filename or update `index.html`, `sw.js`, and `package.json`).
- **Colour palette:** Edit CSS custom properties at the top of `style.css` for different themes.
- **Grid size:** Adjust `GRID_LIMIT`, `GRID_ROWS`, and `MAX_TABLE` in `main.ts` to cover more (or fewer) numbers.

## License

This project bundles icons and generated assets for convenience. Replace them if you plan to publish under a different licence.
