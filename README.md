# Brightfield Solar · Case 09

## [▶ Watch the project walkthrough](https://drive.google.com/file/d/1nn6-lvvMEJNMgiJ1CNGjUZXufqMZWz8P/view?usp=sharing)

[Try the live Phoenix experience](https://brightfield-solar-three.vercel.app/city/phoenix-az) · [Open the final presentation](https://docs.google.com/presentation/d/1KcG0nMqOpKsPhYA9Mud_uPh2toX3EFW6Fxnj5vviwQs/edit) · [Browse all project materials](https://drive.google.com/drive/folders/15Ya6DqltayjOK-dKafWIQ2dnR9K8UqtG)

A responsive city landing page with a working solar estimate, an interactive Three.js house, and a downloadable estimate PDF. Built with Next.js App Router for Alvorada's **Case 09 — City Landing Page**.

Phoenix is the primary experience. City A and City B demonstrate the same template with different validated data. Brightfield Solar, its business figures, testimonials, crews, and financial assumptions are fictional challenge data. The simulator is illustrative and is not financial, tax, eligibility, or installation advice.

**Author:** Carlos Henrique  
**Approximate time spent:** 40 hours, estimated by the author; breakdown below.  
**Reviewed code baseline:** [`cfdef55fd50a20815c0c183c76d174b680aaa967`](https://github.com/CarlosHenriqueMkt/brightfield-solar/commit/cfdef55fd50a20815c0c183c76d174b680aaa967), the PR #9 merge on October 8, 2026. This identifies the application reviewed for this document, not the later commit that may publish the README.

## Start here

| Resource                                                                                                                                           | Purpose                                                                     |
| -------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| [Walkthrough video](https://drive.google.com/file/d/1nn6-lvvMEJNMgiJ1CNGjUZXufqMZWz8P/view?usp=sharing)                                            | 29:08 recorded project presentation and demonstration                       |
| [Live application](https://brightfield-solar-three.vercel.app/city/phoenix-az)                                                                     | Phoenix landing page and interactive estimate                               |
| [Final presentation](https://docs.google.com/presentation/d/1KcG0nMqOpKsPhYA9Mud_uPh2toX3EFW6Fxnj5vviwQs/edit)                                     | Selected, author-edited presentation                                        |
| [Source repository](https://github.com/CarlosHenriqueMkt/brightfield-solar)                                                                        | Application, tests, assets, and setup instructions                          |
| [Complete project folder](https://drive.google.com/drive/folders/15Ya6DqltayjOK-dKafWIQ2dnR9K8UqtG)                                                | Research, design, implementation prompts, and presentation materials        |
| [Chronological archive index](https://docs.google.com/document/d/1G3NGuXkVFvx9JtU9zdGeKjFA5GNTuUSYwerZ8zwjh_0/edit)                                | Historical directory, source dates, and bibliography                        |
| [Campaign and visual design](https://docs.google.com/presentation/d/1-jMjwAIRD7m7XgFYRGSAgwB7lotGwgu8El727VKBcnY/edit)                             | Campaign concept and selected visual direction                              |
| [Hero evolution](https://docs.google.com/presentation/d/1LJfc7GN9y0YZpd0cGgz634mUFZsy_vIbawValUoVU8A/edit)                                         | Visual development of the house and Hero                                    |
| [Hero evidence gallery](https://drive.google.com/file/d/16vb93mYiuELh-mY5B6TGwCvS9ucMHyQE/view?usp=drivesdk)                                       | Downloadable ZIP of recovered visual evidence                               |
| [Archived OMP prompts](https://docs.google.com/document/d/17jerAqduseRp2XcsiLzMW9h1cMBthlu5btDWApdP8Ik/edit)                                       | 34 final implementation, correction, publication, and verification handoffs |
| [Original challenge](https://github.com/Alvorada-Dev/desafios-tecnicos/blob/e7250d4cad0755e5ebfede6d5956f8d8f6771754/casos/09-pagina-de-cidade.md) | Requirements and supplied fictional assumptions                             |

A fresh clone contains everything needed to run the application. External research/design files are supplementary. Use the video and selected final presentation above for the delivery; the archive also preserves earlier drafts and proposals.

## Contents

- [Run with npm](#run-with-npm)
- [Run with Docker](#run-with-docker)
- [Review the experience](#review-the-experience)
- [Architecture and city configuration](#architecture-and-city-configuration)
- [Financial model](#financial-model)
- [3D and interaction decisions](#3d-and-interaction-decisions)
- [PDF export and sharing](#pdf-export-and-sharing)
- [SEO and agent-readable content](#seo-and-agent-readable-content)
- [Verification and known limits](#verification-and-known-limits)
- [Research, design, and AI assistance](#research-design-and-ai-assistance)
- [Assets and licenses](#assets-and-licenses)
- [Appendix: research and process archive](#appendix-research-and-process-archive)
- [Submission checklist](#submission-checklist)

## Run with npm

### Prerequisites

- Git to clone the repository.
- **Node 24.12.0 or later within major 24**.
- **npm 11.16.0 or later within major 11**; the recorded package manager is `npm@11.16.0`.
- Chrome or Chromium for native browser regressions in `npm run check`. A browser executable is not required to compile or serve the app.

The version contract is in [.nvmrc](.nvmrc), [package.json](package.json), and [.npmrc](.npmrc). Use the committed `package-lock.json` with `npm ci`. No application secrets or external design files are required. Compatible Node must already be installed before matching the recorded npm version:

```sh
npm install --global npm@11.16.0
node --version
npm --version
```

The global npm installation needs a writable prefix, such as one managed by a user-owned Node version manager.

### Development

Run in a terminal on Windows, macOS, or Linux:

```sh
git clone https://github.com/CarlosHenriqueMkt/brightfield-solar.git
cd brightfield-solar
npm ci
npm run dev
```

Open **http://127.0.0.1:3000/city/phoenix-az**. Stop the server with **Ctrl+C**. Development and ordinary local production bind to loopback. The root `/` intentionally returns 404 because the institutional homepage is outside this demonstration; its recovery button opens Phoenix.

### Local production

From the repository root, after installing dependencies:

```sh
npm run check
npm run build
npm run start
```

Open the same local URL. `start` requires a successful build; `check` and `build` are separate. If port 3000 is occupied, use `npm run start -- --port 3001` and open port 3001.

The tests detect standard Windows/Linux Chrome/Chromium locations. Set `CHROME_BIN` when needed, including for Google Chrome on macOS:

```sh
CHROME_BIN="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm run check
```

On Windows, stop your own running Next.js server before reinstalling dependencies, or use a fresh checkout: a loaded SWC DLL can cause `npm ci` to fail with `EPERM`. The repository's `.gitattributes` preserves LF text and the immutable 3D asset bytes across checkouts.

### Commands and environment

| Command                           | Purpose                                                   |
| --------------------------------- | --------------------------------------------------------- |
| `npm run dev`                     | Development server                                        |
| `npm run build`                   | Production compilation and static generation              |
| `npm run start`                   | Serve an existing production build                        |
| `npm run check`                   | Formatting check, zero-warning lint, typecheck, and tests |
| `npm run format:check`            | Check formatting without changing files                   |
| `npm run format`                  | Apply formatting; this changes files                      |
| `npm run lint`                    | ESLint with warnings treated as failures                  |
| `npm run typecheck`               | Generate Next.js route types, then run strict TypeScript  |
| `npm test` / `npm run test:watch` | Run Vitest once / in watch mode                           |

TypeScript is strict, with `skipLibCheck: false` and no ignored build errors. Next sets `NODE_ENV`; optional, non-secret `SITE_ORIGIN`, `VERCEL_ENV`, and `VERCEL_TARGET_ENV` control canonical identity/indexing as described under [SEO](#seo-and-agent-readable-content). Defaults work for local review without an environment file. `.env*` files are ignored except `.env.example`; no example file is currently needed or included. Never commit credentials, and treat any future `NEXT_PUBLIC_*` value as public.

## Run with Docker

### Build and serve

Use Docker Engine with BuildKit, or Docker Desktop running **Linux containers**. The build needs access to the official Node image and npm registry. Host Node/npm, host dependencies, source mounts, secrets, and a Docker socket inside the container are not needed.

Clone the repository as above, enter its root, and verify that the Docker daemon is running:

```sh
docker version
docker build --tag brightfield-solar:local .
docker run --detach --name brightfield-solar --publish 127.0.0.1:3000:3000 brightfield-solar:local
docker logs brightfield-solar
```

Open **http://127.0.0.1:3000/city/phoenix-az**. City A and City B are at `/city/city-a` and `/city/city-b`; `/` returns 404.

If host port 3000 is occupied, use `--publish 127.0.0.1:3001:3000` and open port 3001. The application listens on `0.0.0.0:3000` inside the container; the documented host mapping exposes it only on loopback. Choose an unused container name.

Stop and remove only the container you created; the final command optionally removes its local image:

```sh
docker stop --timeout 10 brightfield-solar
docker rm brightfield-solar
docker image rm brightfield-solar:local
```

### Build-time SEO settings

The Dockerfile accepts two **non-secret build arguments**: `SITE_ORIGIN`, defaulting to `https://brightfield-solar-three.vercel.app`, and `VERCEL_ENV`, defaulting to `production`.

To build a noindex preview while retaining the production canonical origin:

```sh
docker build --build-arg VERCEL_ENV=preview --tag brightfield-solar:preview .
docker run --detach --name brightfield-solar-preview --publish 127.0.0.1:3001:3000 brightfield-solar:preview
```

For a different, operator-verified production origin, pass `--build-arg SITE_ORIGIN=https://solar.example.test` together with the appropriate `VERCEL_ENV`; `.test` is only an example. The canonical origin is not the local listening address.

**Rebuild whenever either setting changes.** They are used in the builder stage and are not inherited by the runtime stage. Runtime `docker run --env ...` cannot rewrite generated HTML, social/discovery URLs, Markdown headers, robots/sitemap, or configured noindex headers. Build arguments are not secret storage; environment files are excluded from the Docker context.

### Image and verification scope

The [Dockerfile](Dockerfile) separates dependency, build, and runtime stages. It pins official `node:24.12.0-bookworm-slim` by digest, installs the npm version from `packageManager`, and uses `npm ci`. Next.js emits standalone output for the production-build phase; ordinary `npm run start` retains its normal server behavior.

The runtime contains traced standalone output, static chunks, public assets, local fonts, and license notices. It runs as non-root `node` (UID/GID 1000); only `/app/.next/cache` is explicitly made writable for ephemeral caches. Test sources and the full development dependency graph are excluded from the runtime. WebGL and PDF generation execute in the visitor's browser. No persistent volume is required.

Docker is an alternative production packaging path. Its build does not run the quality test suite; run `npm run check` separately in a suitable test environment. The existing Vercel build flow is unchanged. Recorded Docker build/runtime, route/assets, 3D interaction, and native PDF checks used **Linux/amd64 containers on Windows Docker Desktop**. Other architectures and native macOS/Linux Docker hosts were not exercised. Pinning a base digest does not promise byte-identical builds or a vulnerability-free image.

## Review the experience

The page follows **Hero and estimate → installation steps → testimonials and crews → FAQ → final CTA**. The estimate introduces cost and savings; later sections explain the work, local context, objections, and next action.

- [Phoenix](https://brightfield-solar-three.vercel.app/city/phoenix-az): supplied challenge city.
- [City A (Demo)](https://brightfield-solar-three.vercel.app/city/city-a): synthetic data and two crews.
- [City B (Demo)](https://brightfield-solar-three.vercel.app/city/city-b): different synthetic data and four crews.

These are public, statically generated routes. Demos are visibly labeled and `noindex, follow`. Unknown cities return 404. Development-only `/preview/components` and `/preview/scene` provide examples/calibration with noindex metadata; both return 404 in production.

### A short evaluator walkthrough

1. Open Phoenix and choose **See my solar estimate**. Enter a **$100** monthly bill, continue, choose **100%** coverage, and continue. Expect **10 panels, $8,662.50 net investment, $100 monthly savings, and 7.2 years payback**.
2. Download the PDF and compare its city, inputs, assumptions, and results with the screen. Text is selectable. Unsupported native file sharing falls back to a download.
3. Try **Edit estimate**, **Return to presets**, close/reopen, and **View house / Back to simulation**. Inputs and coverage remain coherent within one city. A household profile changes only the bill.
4. Select City A, then City B in the header. Each destination starts closed at **$220 / 80%**, using its own data. Expect **20 panels** for City A and **37 panels** for City B. Back/Forward also initializes the destination city rather than restoring another city's estimate.
5. Try empty/invalid inputs, keyboard navigation, a narrow viewport, and reduced motion. Invalid input preserves the last valid calculation. Inspect the synthetic notices and PDF identity on both demos.
6. Open **Talk to a solar specialist**. Its disclosure states that the site is a demo and **no request has been sent**. It is an illustrative interaction, with no lead capture or service request.

The specialist trigger is centered after the process steps, after crews, and in released simulator results. In the final CTA, both actions share the estimate button's blue/hover/focus style and equal widths capped at 280 px. They are left-aligned, stacked at up to 640 px, and side by side when space permits. Escape/outside dismissal and nested-dialog focus behavior are handled by the shared disclosure.

## Architecture and city configuration

The application uses **Next.js 16.3.8, React 19.3.0, TypeScript 6.0.3, Three.js 0.186.1, and pdf-lib 1.17.1**, with CSS Modules and locally served IBM Plex Sans. Exact dependencies are in the single lockfile. The renderer uses **vanilla Three.js**.

| Area                                          | Responsibility                                                     |
| --------------------------------------------- | ------------------------------------------------------------------ |
| [City page](src/app/city/[citySlug]/page.tsx) | Server composition, metadata, and static params                    |
| [City domain](src/domain/cities)              | Typed records, validation, registry, and derived public content    |
| [Page sections](src/components/sections)      | Hero, process, social proof, FAQ, and final CTA                    |
| [Simulator](src/features/simulator)           | Pure finance, reducer/draft transitions, controlled UI, and export |
| [Scene](src/features/scene)                   | Three.js viewer, camera/panel choreography, recovery, and cleanup  |
| [Site policy](src/domain/site.ts)             | Canonical origin and deployment/indexing policy                    |

The city registry drives page content, static routes, metadata, the selector, PDF identity, and agent-readable content. Useful text remains in HTML; WebGL is a deferred client feature with a server-supplied poster. One simulator controller handles the public estimate CTAs.

### Add or replace a city

1. Add a typed record beside [phoenix.ts](src/domain/cities/phoenix.ts), following [CityConfig](src/domain/cities/city-config.ts).
2. Supply identity/contact/designation, financial operands, profiles, statistics, neighborhoods, section copy, FAQs, testimonials, crews, and imagery. Each crew owns its portrait association rather than relying on list position.
3. Use authorized local `/assets/` files with meaningful alt text, or empty alt for explicitly decorative images. The validator rejects unsafe/malformed image paths. Shared imagery must not be described as verified municipal photography.
4. Register the record in [cities.ts](src/domain/cities/cities.ts), with a key equal to its validated slug. A synthetic city requires a visible demo designation and unavailable contact data. Invalid records fail validation rather than silently using Phoenix.
5. Run `npm run check` and `npm run build`. Rebuild production after changing data or registrations.

No duplicate page, city-specific component branch, or separate PDF mapping is needed. The three current cities share an illustrative house and some authorized imagery.

## Financial model

Inputs are **$40–$600 in $10 steps** and **50%–100% coverage in 5% steps**. Initial state: **$220 / 80%**. The pure [finance function](src/features/simulator/finance.ts) uses each city's own operands.

For Phoenix:

1. Monthly consumption = bill ÷ **$0.15/kWh**.
2. Monthly generation per panel = **0.45 kW × 6.5 peak sun hours/day × 30 days × 0.8 = 70.2 kWh**.
3. Panel count = the greater of **8** and the ceiling of target consumption ÷ generation per panel.
4. Gross investment = panels × **450 W × $2.75/W**. Net investment applies the supplied **30% federal credit**.
5. Monthly savings = the lesser of the bill and the value of generated energy. Surplus is described as utility credit, not cash income.
6. Payback = net investment ÷ (**12 × monthly savings**).

There is no intermediate rounding; display formatting is separate. The supplied **25% state incentive, capped at $1,000**, is disclosed but excluded from net investment and payback. These percentages and utility terms reproduce the fictional brief, not current policy. The minimum does not change requested coverage; the roof illustration does not cap the financial calculation.

| Phoenix input | Financial panels |                   Illustrated panels |
| ------------- | ---------------: | -----------------------------------: |
| $220 / 80%    |               17 |                                   17 |
| $100 / 100%   |               10 |                                   10 |
| $90 / 100%    |                9 |                                    9 |
| $90 / 80%     |                8 |                                    8 |
| $600 / 100%   |               57 | 51, with a visible limitation notice |

**Resolved ambiguity:** the brief's apartment example lists eight panels after reaching 100% coverage, but its formula yields nine at $90/100%. The implementation follows the formula and ceiling rule. At $90/80%, the eight-panel minimum applies.

At the default $220/80%, different city operands produce:

| City          | Panels | Net investment | Monthly savings |    Payback |
| ------------- | -----: | -------------: | --------------: | ---------: |
| Phoenix       |     17 |     $14,726.25 |         $179.01 |  6.9 years |
| City A (Demo) |     20 |     $18,000.00 |         $180.00 |  8.3 years |
| City B (Demo) |     37 |     $35,520.00 |         $177.60 | 16.7 years |

## 3D and interaction decisions

### Keep the estimate independent of the roof

The supplied examples, formula, and finite roof capacity do not always agree. Capping the financial result to fit the 51-panel illustration would understate the installation at $600/100%. The pure financial function is therefore separate from the visual adapter, with an independent oracle covering all **627 valid Phoenix input combinations**. Screen and PDF share the same estimate snapshot.

### Preserve the approved scene and own its lifecycle

The `finished-v04` scene retains its authored hierarchy, approved camera endpoints, baked/unlit materials, sRGB output, `NoToneMapping`, and exposure 1. There are no runtime lights, shadows, or fog. The 51 panel pairs are identified through `asset_id`; transitions restore original parent/order/transforms at rest.

The canvas, genuine scene-derived poster, and Hero share the same rectangle. Host measurements drive resizing; effective DPR uses a **fixed 1.5 cap**, with demand-driven rendering. Stable scenes have no animation RAF, offscreen/hidden states pause clocks, and reduced motion resolves transitions without an animation loop. This is not an adaptive-quality system.

Opening uses the approved camera/curtain choreography before panel and drawer reveal. Interrupted open/close, panel retargeting, and resizing retain sampled progress; stale callbacks are rejected. The opening curtain keeps its opaque paper surface and animated typography; its earlier decorative SVG was removed. The house panels remain unchanged.

The page and estimate remain usable when WebGL is unavailable or assets fail. Accessible loading/cancellation, 2D fallback, **Retry 3D house**, context restoration, and explicit disposal protect the interaction. At up to 700 CSS px the drawer is modal, with focus containment, inert background, Escape, and scroll-lock cleanup. **View house** provides a non-modal route back to page scrolling while retaining the estimate. Desktop interaction is non-modal.

The inherited lateral edge of the finite ground is visible at **1280 × 360**. The approved camera/asset was preserved rather than changing the composition to hide this boundary.

## PDF export and sharing

An immutable estimate snapshot supplies both the displayed result and the client-generated, selectable-text PDF. It contains city/demo identity, inputs, results, financial assumptions, excluded state incentive, and relevant minimum/savings-cap/roof/fictional-project notices. `pdf-lib` loads on demand; generation uses standard Helvetica fonts and requires no server route, upload, account, or saved-estimate link.

First preparation shows **Preparing your estimate…**. Editing, presets, close/back, and house view remain available. Matching unchanged results reuse one prepared `File`; changed input/city identity invalidates it. Import/generation failure or the **20-second timeout** exposes results with explicit retry, and late completions cannot replace a newer estimate.

Native file sharing requires a secure context and compatible `navigator.share` / `navigator.canShare({ files })`. The prepared file is shared from a user gesture; cancellation is normal. Unsupported sharing starts a download, while genuine errors expose retry instructions. A pending share owns its operation across input/city transitions without publishing stale status. Rapid download activations are coalesced, and Blob URLs are retained long enough for browser handoff.

**“Download started” means handoff began.** Actual saving and OS share-sheet completion depend on the browser/device. No public estimate URL or persistent user data is created.

## SEO and agent-readable content

The deployed city template includes canonical metadata, distinct Open Graph/Twitter cards, structured data, crawl resources, and registry-derived Markdown. They share [site policy](src/domain/site.ts) and city publication helpers rather than separate hand-maintained content.

### Canonical identity and indexing

The default production origin is **`https://brightfield-solar-three.vercel.app`**. Optional `SITE_ORIGIN` accepts only an HTTPS origin without credentials, non-root paths, query strings, fragments, whitespace, or malformed syntax. Set it before building only for a verified production origin. Request/forwarded hosts and preview URLs never set canonical identity; tracking parameters and fragments are removed.

| Surface                                               | Indexing policy                                                   | Sitemap  |
| ----------------------------------------------------- | ----------------------------------------------------------------- | -------- |
| Phoenix HTML in production                            | `index, follow`                                                   | Included |
| City A / City B HTML                                  | `noindex, follow`; publicly accessible                            | Excluded |
| City Markdown alternatives                            | HTTP `X-Robots-Tag: noindex, follow`; canonical to their own HTML | Excluded |
| Development/test or non-production Vercel environment | Noindex city metadata and all-response noindex header             | Empty    |
| Root, unknown cities, production preview routes       | 404                                                               | Excluded |

Production requires `NODE_ENV=production`, with both `VERCEL_ENV` and `VERCEL_TARGET_ENV` absent or equal to `production`. Any non-production indicator wins. Local production builds without Vercel indicators use production policy; set `VERCEL_ENV=preview` for staging. **Rebuild after changing origin or deployment policy**, and keep settings consistent through build/start.

[`robots.txt`](https://brightfield-solar-three.vercel.app/robots.txt) allows crawling so robots can read noindex directives; only production advertises the canonical [`sitemap.xml`](https://brightfield-solar-three.vercel.app/sitemap.xml). The sitemap includes only indexable city HTML, with no invented modification dates. Footer links supplement native city selection.

### Social and machine-readable routes

- `/city/{slug}/social-image` returns a **1200 × 630 PNG** used by both Open Graph and Twitter `summary_large_image`. The city, synthetic-demo designation, and fictional-project label are visible, using the approved house poster, local fonts, and palette.
- JSON-LD contains only **WebSite** and **WebPage**, with canonical identifiers, `en-US`, and explicit fictional-project descriptions. It makes no real LocalBusiness, review/rating, incentive, or FAQPage claims. Serialization escapes script-breaking content.
- [`/llms.txt`](https://brightfield-solar-three.vercel.app/llms.txt) provides an additional text entry point, identifies Phoenix as primary, and groups synthetic demos as optional.
- [`/city/phoenix-az/index.md`](https://brightfield-solar-three.vercel.app/city/phoenix-az/index.md) and matching demo routes derive readable city content from the registry. HTML alternate/described-by links and Markdown response links connect the representations. Unknown image/Markdown slugs return 404.

These are implemented discovery mechanisms. They do not guarantee indexing, rankings, AI citations, or adoption of the `llms.txt` proposal. Real message-platform previews and physical-device browser behavior remain separate checks.

## Verification and known limits

### Exact code baseline and CI

Main was reviewed on **October 8, 2026** at [`cfdef55fd50a20815c0c183c76d174b680aaa967`](https://github.com/CarlosHenriqueMkt/brightfield-solar/commit/cfdef55fd50a20815c0c183c76d174b680aaa967), after [PR #9](https://github.com/CarlosHenriqueMkt/brightfield-solar/pull/9). Its [GitHub Actions run](https://github.com/CarlosHenriqueMkt/brightfield-solar/actions/runs/37780712604) passed dependency installation, `npm run check`, and `npm run build`: **287 tests in 29 files**, with **16 generated static outputs**. This documentation review read that completed run; it did not rerun application tests.

The [CI workflow](.github/workflows/ci.yml) uses read-only repository permissions and pinned action revisions. Work follows **task branch → PR → main**, with the required successful `quality` check. Local checks or Vercel status do not replace the PR gate.

Coverage includes all valid Phoenix finance inputs, city/configuration/routing contracts, estimate preservation, PDF identity/text/pagination, retries and stale completions, export/share ownership, accessibility semantics, native Chrome intro/reduced-motion behavior, specialist-button geometry, scene contracts, and SEO/serialization policy.

### Browser and Docker evidence

Recorded milestone reviews exercised desktop/mobile-emulated Chrome, real Windows Chrome PDF saves, 200% browser zoom, city changes and interruptions, delayed/failed assets, WebGL loss/restoration, hidden/offscreen behavior, and renderer/listener/observer cleanup. Docker verification exercised standalone serving, non-root permissions, routes/assets, scene interaction, and PDF delivery on Linux/amd64 containers. Earlier review reports retain their original revision and platform scope; a historical pass is not a fresh test of every later change.

The [CI/security review](docs/ci-security-review.md) and [historical technical README](https://github.com/CarlosHenriqueMkt/brightfield-solar/blob/cfdef55fd50a20815c0c183c76d174b680aaa967/README.md) preserve detailed milestone records. Their older root-redirect, deployment, and missing-deliverable statements are superseded by the current sections here. The Git-ignored `evidence/` directory is optional local evidence, not a fresh-clone prerequisite or a promised repository download.

### Dependency security

The exact baseline CI installation reported **four high-severity development-dependency findings**. The recorded investigation identifies the ESLint transitive chain and the [braces advisory, CVE-2026-93687 / GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm); as checked on October 8, 2026, its official advisory lists no patched version.

The earlier production-lockfile audit reported **zero findings**, and the targeted development-chain packages were absent from the inspected Docker runtime and application traces. No fresh production audit or OS-image scan is claimed by this README review. The disclosed development-tooling risk remains accepted for this delivery; no audit suppression, forced downgrade, or dependency/lockfile change was made to conceal it.

### Remaining scope

- Three configured cities are delivered; the broader approximately 120-city rollout is not populated.
- Campaign attribution, GA4/UTM tracking, Windsor.ai reporting, geolocation, and persistent city preferences are proposals or future work, not implemented features.
- No business backend, lead-delivery API, authentication, scheduling, payment, or administration is implemented.
- Physical phones, Safari, real software keyboards, and successful native OS share-sheet completion still require device-specific verification. Desktop emulation is not physical-device certification.
- A broad final real-device accessibility/performance audit remains open. Implemented SEO does not establish search rankings or production analytics.
- The inherited finite-ground edge at 1280 × 360 remains. Unknown-city requests can log a framework `NoFallbackError` while correctly returning 404.

## Research, design, and AI assistance

The process progressed from the brief to U.S. residential solar context, Phoenix architecture/market references, research-informed personas, campaign concepts, visual direction, an original-house direction, component implementation, and interaction reviews. The [final presentation](https://docs.google.com/presentation/d/1KcG0nMqOpKsPhYA9Mud_uPh2toX3EFW6Fxnj5vviwQs/edit) and [design presentation](https://docs.google.com/presentation/d/1-jMjwAIRD7m7XgFYRGSAgwB7lotGwgu8El727VKBcnY/edit) summarize the outcome; the appendix provides the underlying materials.

Carlos Henrique is responsible for authorship, product/visual direction, 3D and implementation decisions, and final review. OpenAI tools, including **Koji**, assisted with research organization, prompt drafting/refinement, review, and documentation. **OMP** was used in the implementation workflow.

AI suggestions were checked against the brief, supplied assets, source code, independent financial calculations, automated checks, and recorded browser observations. Work included rejecting the first campaign's visual direction, refining subsequent designs, and correcting implementation behavior. Personas are fictional research-informed tools, not customer-interview evidence. A delivered prompt is not proof of completed implementation.

### Time investment

Approximate effort reported by the author, **40 hours total**:

- Research, study, and concept: **8 hours**
- Hero and 3D: **12 hours**
- Coding and multiple regression tests: **10 hours**
- Corrections, validation, and refactoring: **5 hours**
- Recording a video under 30 minutes, with three dogs providing unsolicited audio feedback — **5 hours**.

## Assets and licenses

The supplied OpenDesign export, proof of concept, and finished-v04 contract are provenance/design inputs; they are not required to run a fresh clone.

- **Eight supplied PNGs:** Carlos authorized their use/copying for this project. They are in `public/assets/approved-v2`. Original authorship and possible AI-generation history were not established; they are not declared CC0.
- **Finished-v04 scene:** `house.glb`, `house.manifest.json`, and `sky-softened-2k.jpg` in `public/assets/finished-v04` total **2,866,541 raw bytes**. This is a 3D-file budget, not full-page transfer size, RAM, or VRAM. The model's material textures are embedded.
- **Poly Haven materials and sky:** names, authors, and URLs are recorded in the [CC0 notice](licenses/finished-v04/CC0-1.0-NOTICE.txt). The notice does not license all application code, geometry, or supplied imagery as CC0.
- **IBM Plex Sans:** locally served weights 400/500/600, with [OFL 1.1 preserved](src/app/fonts/LICENSE.txt).
- **pdf-lib:** [MIT license preserved](licenses/pdf-lib/LICENSE.md).

There is no blanket reuse license for all project materials. Third-party images, marks, research sources, and dependencies retain their own rights and terms. Research references do not grant production reuse rights.

## Appendix: research and process archive

The [project folder](https://drive.google.com/drive/folders/15Ya6DqltayjOK-dKafWIQ2dnR9K8UqtG) and [chronological index](https://docs.google.com/document/d/1G3NGuXkVFvx9JtU9zdGeKjFA5GNTuUSYwerZ8zwjh_0/edit) preserve the process and bibliography. Source dates are distinct from dates on which copies were archived. Historical proposals and superseded designs are retained for context; inclusion does not mean every proposed feature shipped.

### Original studies and planning

| Source date | Material                                                                                                                    | Status and purpose                                                                                       |
| ----------- | --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Oct 3, 2026 | [U.S. residential solar and Phoenix](https://docs.google.com/document/d/1-NxRwNTMMnC_CPf52zUADT7uBVn4v8k0/edit)             | Market, household, and utility context                                                                   |
| Oct 3, 2026 | [Phoenix architecture and eight-panel scale](https://docs.google.com/document/d/1qJRhW273MLEsVr073Q6PU23JFnTxBmkD/edit)     | Visual/architectural research; no structural certification                                               |
| Oct 3, 2026 | [Ten solar brands serving Phoenix](https://docs.google.com/document/d/1jWktrm4Ripgq3-JNKKXjHc0ybd3c8Jtb/edit)               | Positioning, visual references, and explicitly inferred audiences                                        |
| Oct 3, 2026 | [Five solar personas](https://drive.google.com/file/d/1-_Lx0Bp8UZJo6Qss6ud7V1K-9YzLoCMp/view?usp=drivesdk)                  | Fictional design tools; no interview participants                                                        |
| Oct 3, 2026 | [Creative campaign V1](https://drive.google.com/file/d/1MtbMkerDaFlnJ4ZyZbDzXOSmQ6fUqeuD/view?usp=drivesdk)                 | Historical concept/copy; rejected visual direction                                                       |
| Oct 4, 2026 | [Creative campaign V2](https://drive.google.com/file/d/1EH_MZ39W2rsWDAm-f2oMHA1jFV7Gu1_w/view?usp=drivesdk)                 | Revised direction; advertising/storyboards are proposals                                                 |
| Oct 5, 2026 | [Final page section references](https://drive.google.com/file/d/1zzikSETCuMZsL3bhO8loyuDvQHg2lre_/view?usp=drivesdk)        | Process, testimonial, portrait, FAQ, and closing references                                              |
| Oct 5, 2026 | [Brief audit and application architecture](https://docs.google.com/document/d/1ypnnEpVnEU_ICdZ0NYFraPPQ-AgMh480/edit)       | Dated requirements/calculation plan; current implementation takes precedence                             |
| Oct 5, 2026 | [Original attribution proof-of-concept proposal](https://docs.google.com/document/d/1lriOUXKUdXkVPF24YCWKudpizhBkBYis/edit) | Original first-party collector/report concept; proposal only, with no GA4 integration or campaign launch |

The [final presentation](https://docs.google.com/presentation/d/1KcG0nMqOpKsPhYA9Mud_uPh2toX3EFW6Fxnj5vviwQs/edit) contains the later attribution proposal: UTM-tagged Meta/Google placements, GA4, Windsor.ai, and an AI daily brief. This is a proposed extension, with no analytics collection or automation configured in the application. It supersedes the earlier tracking concept as the current proposal, without implying implementation.

### Visual exploration

- [Historical moodboard and five directions](https://docs.google.com/presentation/d/1SAHvrpGe-zXON8RA-RYDSzLNsJkIdlcSjo3I2pVqV74/edit)
- [Original Blender house direction and 25 Arizona references](https://docs.google.com/presentation/d/14M-j3jUOSfpNvqw5Zjwul23hg095ni7kuPbtbkIEzbc/edit)
- [25 third-party house models](https://docs.google.com/presentation/d/1ZnERfRtXzFD_RniOskW8uaGdUtVtKLRkV70hlVIKeZU/edit), a superseded exploration; no purchase or use is implied
- [Earlier technical walkthrough deck](https://docs.google.com/presentation/d/1wkejZFWY57372Eu53rpNtOZ8EaXprSS5-x94pw04j64/edit), historical presentation support; the selected final deck is linked at the top
- [Hero evolution](https://docs.google.com/presentation/d/1LJfc7GN9y0YZpd0cGgz634mUFZsy_vIbawValUoVU8A/edit) and [downloadable evidence gallery](https://drive.google.com/file/d/16vb93mYiuELh-mY5B6TGwCvS9ucMHyQE/view?usp=drivesdk)

### Prompt archive scope

The [OMP prompt archive](https://docs.google.com/document/d/17jerAqduseRp2XcsiLzMW9h1cMBthlu5btDWApdP8Ik/edit) contains **34 archived final task handoffs**, including the later SEO, final landing complement, publication, and correction work. It preserves the original prompt bodies and their historical context. A handoff or its original status label does not by itself prove execution; consult the [merged PR history](https://github.com/CarlosHenriqueMkt/brightfield-solar/pulls?q=is%3Apr+is%3Amerged) and the exact CI/code baseline above for delivered implementation status.

## Submission checklist

- [x] Link the walkthrough video, live city page, selected presentation, repository, and project materials from this README.
- [x] Provide reproducible npm/Docker instructions and disclose implementation/verification limits.
- [x] Record the full reviewed application SHA and its successful CI run.
- [x] Include the author's approximate 40-hour effort breakdown.
- [ ] Approve this README before publishing it through the repository's PR workflow.
- [ ] After the documentation PR merges, include the actual final submission commit in the handoff, with **Case 09**, the delivery links, and approximate time spent. Obtain it with `git rev-parse HEAD` from the exact submitted checkout; it may differ from the reviewed application baseline above.
