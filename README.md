# Brightfield Solar — Case 09

A responsive, data-driven city landing page, real financial simulation, and the `finished-v04` 3D scene for [Alvorada Case 09](https://github.com/Alvorada-Dev/desafios-tecnicos/blob/main/casos/09-pagina-de-cidade.md). Phoenix retains the approved presentation; City A and City B are explicitly synthetic public demonstrations. The company, financial assumptions, incentives, crew identities, and testimonials are fictional; they are not current tax advice.

**Published application:** https://brightfield-solar-three.vercel.app — the public page is `/city/phoenix-az`. PR #1 was merged into `main` on October 6, 2026. The CI/security review records the exact commits, deployment evidence, and verification limits in [the review report](docs/ci-security-review.md).

## Run locally

Use **Node 24.12.0 or later within major 24** and **npm 11.16.0 or later within major 11**. `.nvmrc` selects Node 24.12.0; `packageManager` records npm 11.16.0, and `.npmrc` enforces engines and exact dependency versions. Install compatible Node/npm before running the project. No application secrets, global application tooling, or external design-reference files are required.

With compatible Node installed, match the pinned npm before installation:

```sh
npm install --global npm@11.16.0
node --version
npm --version
```

The npm installation requires a writable global prefix (as provided by a user-owned Node version manager, or appropriate OS permissions). `npm ci` uses the committed lockfile v3; do not replace it with a dependency update.

Run these commands from the repository root on Windows, macOS, or Linux:

```sh
npm ci
npm run dev
```

Open **http://127.0.0.1:3000/city/phoenix-az**. Development and local production bind to loopback only; stop either server with Ctrl+C. For local production:

```sh
npm run check
npm run build
npm run start
```

**Line endings:** `.gitattributes` keeps project text in LF even when Git uses `core.autocrlf=true`, while preserving the finished-v04 `-text` exception. The corrective task normalized 41 existing CRLF files without changing their logical content. The original Windows formatting failure and current verification are distinguished in [the review report](docs/ci-security-review.md#validation-and-change-scope); no global Git setting was changed.

| Script                    | Purpose                                                               |
| ------------------------- | --------------------------------------------------------------------- |
| `dev` / `start`           | Development / local production server; `start` requires a build       |
| `build`                   | `next build`, including static generation and TypeScript verification |
| `lint`                    | ESLint; warnings also fail the command                                |
| `format` / `format:check` | Apply / check Prettier formatting                                     |
| `typecheck`               | `next typegen && tsc --noEmit`; generates route types before checking |
| `test` / `test:watch`     | One Vitest run / watch mode                                           |
| `check`                   | `format:check`, lint, typecheck, and tests; build remains separate    |

TypeScript remains strict with `skipLibCheck: false` and no ignored build errors. `.next/dev` is excluded from compilation to avoid duplicate generated route types after development runs. `format` writes files; use `format:check` when only verification is intended.

The native intro-fade regressions use installed Chrome/Chromium to resolve the real Hero's CSS and seek the same paused Web Animations to **125 ms** (strictly intermediate supplementary opacity) and **300 ms** (completed opacity), without sleeps or an application server. A separate native reduced-motion run checks immediate endpoints and no tween; the heading remains outside the supplementary fade. Standard Windows/Linux executable locations are detected; set `CHROME_BIN` when Chromium is installed elsewhere. No browser-automation package is added.

Exact versions in the single `package-lock.json`: Next **16.3.8**, React/React DOM **19.3.0**, TypeScript **6.0.3**, ESLint **10.12.0**, Prettier **3.9.9**, and Vitest **5.0.3**. WEB 03 added only **three 0.186.1** and **@types/three 0.186.0**. IBM Plex Sans 400/500/600 is served locally through `next/font/local`, without a font CDN.

### Environment and Git workflow

No authentication or build-secret variables are required. Next sets `NODE_ENV` for development/production gates. SEO additionally reads the optional server-side `SITE_ORIGIN` and Vercel deployment indicators described below; none are secrets. `.env*` files are ignored except `.env.example`; no example is currently included. Never populate a committed example with credentials. Any future `NEXT_PUBLIC_*` value must be treated as client-public, not a secret.

Start every implementation on a dedicated task branch, never directly on `main`. Inspect the working tree and index first, preserve existing work, and use the branch → PR → `main` workflow. `main` requires a PR and the GitHub Actions `quality` check on an up-to-date branch, including for administrators. The [CI workflow](.github/workflows/ci.yml) has one read-only job running `npm ci`, `npm run check`, and `npm run build`; Node/npm versions come from `.nvmrc` and `packageManager`.

**CI gate:** merging requires a successful `quality` result for the applicable PR revision. Local verification or a Vercel deployment status does not replace that required check; consult the PR's current checks for GitHub-hosted results. This workflow does not merge or deploy. Existing Vercel Git integration may create a Preview independently when a branch is published. See [the review findings](docs/ci-security-review.md#findings) for configuration and recorded verification evidence.

## Production Docker (CAR-28)

**Prerequisites:** Docker Engine with BuildKit, or Docker Desktop running **Linux containers**, and network access to the official Node image and npm registry during the build. Verify the daemon with `docker version`. Use an already checked-out repository as the build context; Docker builds/runs do not require host Node/npm, host `node_modules`, mounted source, Git inside the image, application secrets, or a mounted Docker socket.

From the repository root:

```sh
docker build --tag brightfield-solar:local .
docker run --detach --name brightfield-solar --publish 127.0.0.1:3000:3000 brightfield-solar:local
docker logs brightfield-solar
```

Open **http://127.0.0.1:3000/city/phoenix-az** (or `/city/city-a` and `/city/city-b`). `/` deliberately returns **404** because the institutional homepage is outside this demonstration; its recovery button links to Phoenix without redirecting. If host port 3000 is occupied, use `--publish 127.0.0.1:3001:3000` and open port 3001; the container port stays **3000**. The server listens on **0.0.0.0 inside the container**, while the documented host mapping is loopback-only. `EXPOSE` documents the port; it does not publish it.

Stop, remove the named container, and optionally remove this locally tagged image:

```sh
docker stop --timeout 10 brightfield-solar
docker rm brightfield-solar
docker image rm brightfield-solar:local
```

Choose an unused container name; stop/remove only containers you created. No shared-resource prune, Compose, registry publication, automatic deployment, or privileged/GPU/X-server/browser service is required. WebGL/Canvas and PDF preparation/download execute in the evaluator's browser, not in the application container.

### Image, output, and permissions

- The Dockerfile pins the official **`node:24.12.0-bookworm-slim`** multi-platform image to verified index digest **`sha256:7326fb2dbdce998edd72140946851be64ef4a643e8715e138ca467e8e9d92c99`**. A digest fixes the base content; updating Node/security fixes requires a deliberate tag/digest update and verification, not a mutable `latest` pull. This does not promise byte-identical application builds: Next.js generates build identifiers and platform-specific native dependencies.
- Separate dependency, build, and runtime stages keep the full build/test dependency graph out of the runtime. The shared base installs `package.json`'s `packageManager` (currently **npm@11.16.0**, the same convention as CI), so build and runtime both satisfy the npm engine requirement. The dependency stage then runs **`npm ci` with `package-lock.json` and `.npmrc`**. The official image's bundled npm **11.6.2** is replaced, not used to install project dependencies.
- `next.config.ts` uses the documented production-build phase to emit **standalone** output, retaining **`cacheComponents: false`**. Ordinary `npm run build` generates the same output, while unchanged `npm run start` uses the normal server phase and **127.0.0.1** binding without the incompatible unconditional standalone/`next start` configuration. No new build-mode variable, custom server, or npm script is needed. Existing Vercel build commands remain unchanged; Docker is an alternative packaging path, not a Vercel configuration requirement.
- The runtime copies the **entire traced standalone directory**, plus `public` into `/app/public` and `.next/static` into `/app/.next/static`. This retains traced native image-optimization dependencies, JS/CSS chunks and the three generated local Plex font assets. All authorized images/posters, `house.glb`, `house.manifest.json`, and `sky-softened-2k.jpg` are included. The GLB's three material textures are embedded buffer views, not missing external texture URLs. Project asset/PDF and Plex license notices are also retained.
- `.dockerignore` excludes host dependencies/builds, Git, evidence, coverage, logs, editor/OS junk, local environment/credential files and test sources. The committed, credential-free root `.npmrc`, build source, local font sources/licenses and all public assets remain build inputs. Chromium, Vitest, ESLint and TypeScript are not copied from the build dependency graph into the application runtime.
- Runtime **UID/GID 1000 (`node`)** is non-root. Application files remain root-owned/readable; only `/app/.next/cache` is explicitly made writable for image/data caches. Cache contents are ephemeral and disappear when the container is removed. No persistent volume is required for this static-city application.
- The image sets **`NODE_ENV=production`**, **`HOSTNAME=0.0.0.0`**, **`PORT=3000`** and disables Next telemetry. These defaults are built in; no `.env`, token, application configuration or `--env-file` is required. Exec-form **`node server.js`** receives container shutdown signals directly.

### OS and architecture

The pinned image index provides Linux **amd64**, **arm64/v8**, **ppc64le** and **s390x** manifests; availability is not evidence that each platform was exercised. Docker normally selects the native platform. Windows requires Docker Desktop's Linux-container engine (not Windows-container mode); macOS/Windows run Linux containers in a VM. Forcing a different `--platform` can require emulation and be slower; the source includes local fonts and Linux native dependencies are installed inside the build, not copied from the host.

Keep daily development on the existing `npm run dev` workflow. Native CSS tests require Chrome/Chromium **in the test environment only**; set `CHROME_BIN` for an unrecognized executable location, including macOS. On Windows, stop your own running Next server before replacing its loaded native SWC module with `npm ci`, or use a fresh checkout for verification. Do not kill unrelated processes or weaken the browser regressions.

### Local verification and limitations

CAR-28 started from freshly fetched remote `main` **`cd8835afd804f71c70221739a4786d8b3c9ebcf3`** with a clean worktree/index, on `feat/car28`. Verification used **Windows x64 (10.0.26200), Node 24.12.0, npm 11.16.0, Chrome 154.0.8037.98, Docker Desktop 4.91.0 / Engine 29.8.0**, and **Linux/amd64** containers.

The first root `npm ci` hit Windows **EPERM** because an existing, unrelated `next start` process held the SWC DLL. That process was not stopped. A task-owned copy of the same source/package/lock/npm inputs passed **`npm ci && npm run check && npm run build`**, including **238 tests in 21 files** and the native Chrome regressions. **`npm run start -- --port 3329`** advertised only loopback and passed the production route/asset checks without a standalone incompatibility warning. The nested temporary copy emitted a multiple-lockfile workspace-root warning; Docker did not. Missing root dependency files were restored from that fresh installation without overwriting existing files or the loaded DLL; the temporary copy/server were removed after verification.

Actual Docker commands included:

```sh
docker buildx imagetools inspect node:24.12.0-bookworm-slim
docker pull node:24.12.0-bookworm-slim@sha256:7326fb2dbdce998edd72140946851be64ef4a643e8715e138ca467e8e9d92c99
docker build --progress=plain --tag brightfield-solar:car28 .
docker run --detach --name brightfield-solar-car28 --publish 127.0.0.1:3328:3000 brightfield-solar:car28
docker logs brightfield-solar-car28
docker stop --timeout 10 brightfield-solar-car28
docker rm brightfield-solar-car28
```

- The final cache-cleaned image built and ran successfully, with **Node 24.12.0 / npm 11.16.0** in the runtime. Docker reported **446,451,902 bytes** of uncompressed image content including the base; traced application `node_modules` occupied approximately **38 MiB**.
- Both ordinary npm and Docker serving returned **307** from `/` with location `/city/phoenix-az`, **200** for all three cities, and **404** for an unknown city and both preview routes. **39 asset URL checks** per server covered actual HTML chunk/font/image URLs and every public file, validating MIME/body signatures and byte-identical public assets rather than accepting HTML fallbacks. GLB, manifest and sky returned `model/gltf-binary`, `application/json` and `image/jpeg`; all three Plex fonts returned `font/ttf`.
- Real Chrome exercised Phoenix desktop **1440×900**, City A mobile **390×844**, and City B desktop: ready/rendered 3D, normal activation, Phoenix result editing/close/reopen, City A retained bill after close/reopen, and City B's 37-panel result/PDF readiness. **95 browser requests** had no failed network responses, browser exceptions or error-console entries; lazy scene/PDF JavaScript was served as JavaScript, not HTML.
- A genuine native Windows Chrome download completed for **Phoenix $90 / 100%**: a **5,337-byte, two-page selectable-text PDF** with **9 panels / $7,796.25 / $90.00 per month / 7.2 years**. This proves that browser's preparation/save path, not all device share sheets or PDF failure cases.
- Runtime checks established **UID/GID 1000**, no source/socket/host mounts or privileged mode, retained license notices, no application `.env`, Git, test sources or direct test/browser-tool packages, and no Git/Chromium executable. A real cache write/read/delete succeeded and optimized-image cache files were created; application/static/public files were non-writable to the runtime user.
- `docker stop --timeout 10` completed within the timeout with **143 (SIGTERM), no OOM/error and no forced SIGKILL**. Only task-owned containers/servers/tabs/temp directories were stopped or removed; the local image tag remains available.

**Inherited warnings, not hidden fixes:** unknown-city requests log `Internal: NoFallbackError` while correctly returning 404. The same warning was reproduced with the **pre-existing, non-standalone production build** (`cacheComponents: false`, build ID `KI1x57Fat5eJCfmj82CAB`) on a separate task-owned loopback server, as well as the new npm/Docker outputs. City routing and framework errors were not modified or suppressed. Linux `npm ci` also reported **four high-severity vulnerabilities** in the existing dependency graph; no audit fix, dependency upgrade or lockfile regeneration was performed.

Optional, Git-ignored records in `evidence/car28/` contain exact commands/results, HTTP/runtime/browser inventories, screenshots and the actual downloaded PDF. They are local evidence, not fresh-checkout prerequisites. Only **Linux/amd64 on this Windows Docker Desktop host** was exercised; other architectures, native macOS/Linux hosts, Safari/physical devices, genuine OS sharing, cloud/Vercel deployment and broader performance/security matrices remain unverified. No CI expansion, registry push, deployment, commit/push/PR/merge or Linear mutation was performed.

## Page, routes, and boundaries

- `/` deliberately returns **404**, with an honest unavailable-homepage message and an explicit Phoenix recovery button. `/city/phoenix-az`, `/city/city-a`, and `/city/city-b` are ordinary **SSG** public routes through the validated registry and `generateStaticParams`. Unknown and test-only fixture slugs return **404**; there is no fallback city.
- Server composition is **Hero/simulator → three installation steps → testimonials/crews → FAQ → final CTA**. Metadata, one `h1`, city data, and useful content are present in the HTML. FAQ uses native `details/summary`; testimonials have manual navigation without autoplay.
- `/preview/components` retains isolated WEB 02 examples and explicitly illustrative fixtures. `/preview/scene` provides calibration and technical inspection. Both return **200 with `noindex, nofollow` metadata in development** and **404 in production**, without public navigation links.
- At narrow widths, the embedded component-gallery drawer preserves its **14 px** side margins instead of letting its mobile minimum width override the preview maximum. This development-only adjustment does not change the public simulator drawer.
- `src/app/city/[citySlug]/page.tsx` composes `src/components/sections`. `src/domain/cities` owns the independent data contract, validation, and registry.
- `src/features/simulator/finance.ts` contains pure mathematics; `simulation-state.ts` contains the reducer; `SimulatorHero.tsx` coordinates interaction/focus; `SimDrawer` is controlled presentation. One controller handles all public CTAs, without duplicate simulators.
- `src/features/scene` owns the viewer, cache/lifecycle, manifest/hierarchy validators, solar states, approved presets, and trajectory. The server supplies the poster; WebGL loads as a client island. No renderer or debug handle is created on the server, and the DOM debug handle is development-only.
- No custom backend/API, scheduling, payment, authentication, administration, city-preference store, localStorage, geolocation, or analytics is implemented. The challenge does not require the first five. This branch implements canonical metadata, link-preview images and agent-readable routes; the published URL above is not evidence that these changes have been deployed.

## SEO, GEO and shared-link presentation

The city registry remains the only source of city content. `src/domain/site.ts` owns production identity and indexing policy; `city-publication.ts` shares city titles/descriptions; `city-structured-data.ts` and `city-markdown.ts` derive public representations. No dependency, simulator mathematics, PDF behavior, 3D asset or page-sharing button was added or changed.

### Canonical configuration and indexing

The default verified production origin is **`https://brightfield-solar-three.vercel.app`**. Optional **`SITE_ORIGIN`** replaces it only when an operator has verified a new production origin. Set it before building, for example in an ignored `.env.production.local`:

```dotenv
SITE_ORIGIN=https://brightfield-solar-three.vercel.app
```

Only an HTTPS origin is accepted. Credentials, non-root paths, query strings, fragments, whitespace, backslashes and malformed URLs fail configuration instead of falling back. A root trailing slash is normalized away. Request hosts, forwarded hosts, `VERCEL_URL` and Preview URLs never determine canonical identity. `metadataBase`, canonical/OG/Twitter URLs, image/discovery URLs, JSON-LD identifiers and sitemap entries all use this module; tracking parameters and fragments do not enter page identity. Each demo keeps its own canonical.

| Surface / build environment                                                           | Indexing policy                                                                        | Sitemap  |
| ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | -------- |
| Phoenix HTML, production                                                              | `index, follow`                                                                        | Included |
| City A / City B HTML                                                                  | `noindex, follow`; publicly accessible and crawlable                                   | Excluded |
| Any city Markdown alternative                                                         | HTTP `X-Robots-Tag: noindex, follow`; canonical points to its own HTML page            | Excluded |
| Development/test, Vercel Preview/development or a custom non-production Vercel target | City HTML `noindex, follow`, plus an all-response HTTP `X-Robots-Tag: noindex, follow` | Empty    |
| Root, unknown cities and development-only preview routes                              | HTTP 404; the institutional homepage is not implemented                                | Excluded |

Production means `NODE_ENV=production` with both `VERCEL_ENV` and `VERCEL_TARGET_ENV` either absent or equal to `production`. Any defined non-production value wins over production. Local `npm run build`/`start` without Vercel indicators exercises the production policy; other staging hosts can explicitly set `VERCEL_ENV=preview`. Keep these variables consistent at build/start. **Rebuild for every origin or deployment-policy change:** static HTML/metadata, text routes, sitemap and configured headers are build artifacts; do not promote a production build unchanged into a preview environment.

`src/app/robots.ts` allows crawling, including demos, so crawlers can read their `noindex`. Only production advertises the canonical `/sitemap.xml`. `sitemap.ts` includes only indexable registry HTML city URLs, without fabricated last-modified dates, redirects, demos, previews, unknown routes or Markdown. Native footer city links supplement the existing select/router navigation, with an accessible navigation label and active-page indicator. Useful initial HTML, one `h1`, semantic sections and native FAQ content are retained.

### Social cards and structured data

Each city publishes distinct English-US title/description metadata, Open Graph `website` identity, site name, `en_US` locale and Twitter `summary_large_image`. Both cards advertise the same absolute `/city/{slug}/social-image` URL, meaningful image alt and a **1200 × 630 PNG**. The statically generated `ImageResponse` uses the registry's approved house poster, local IBM Plex fonts and existing palette. The large city name, demo/synthetic designation and fictional-challenge label remain readable without invented accounts, reviews, endorsements or business claims. The PNG renderer is narrowly excluded from the HTML-only `next/image` lint rule; page images retain that rule.

Safely serialized JSON-LD contains only **WebSite** and **WebPage**, canonical `/#website` and `/city/{slug}#webpage` identifiers, `en-US` language and explicit fictional-project descriptions. The origin-level WebSite identifier names the site, not an implemented homepage; WebSite omits `url`, while each WebPage retains its city URL and `isPartOf` relationship. Serialization escapes `<` and script-breaking Unicode separators without changing the parsed content. There is no LocalBusiness, review/rating/incentive markup, invented breadcrumb hierarchy, or FAQPage that could turn fictional financial answers into structured real-world claims. The visible FAQ is unchanged.

### Agent-readable entry point

**`/llms.txt`** is an additional UTF-8 `text/plain` entry point following the current [llmstxt.org proposal](https://llmstxt.org/): project H1, concise blockquote summary, interpretation notes and H2 resource link lists. It explains the fictional challenge and Phoenix's primary role; synthetic demos are in **Optional**. Its eight destinations are public HTML/Markdown/crawl-resource URLs, not an unavailable institutional homepage, internal notes or private files.

Compact **`/city/{slug}/index.md`** alternatives follow the proposal's extensionless-page convention and are served as UTF-8 `text/markdown`. They derive identity, Hero/process copy, simulator assumptions/profiles, explicitly fictional crews/testimonials, exact FAQ content and next-step copy from the same registry. Text is escaped for Markdown/HTML; there is no manually maintained city-content copy or `llms-full.txt`.

HTML discovers Markdown through `rel="alternate" type="text/markdown"` and the site entry point through `rel="describedby"`. Markdown responses carry HTTP `Link` relations for their canonical HTML and `/llms.txt`. Unknown Markdown/image slugs return 404, not Phoenix content. These mechanisms complement ordinary crawlability and useful text; they do not guarantee agent adoption, indexing, rankings or citations. [Google's AI Search guidance](https://developers.google.com/search/docs/appearance/ai-features) still emphasizes ordinary SEO fundamentals.

### Baseline verification and actual limits

Work started on `feat/seo-geo-link-previews` from freshly fetched `main` **`7650f624fb21dc308e3e9728e2ce69d189f481b3`**, with a clean tree/index. Installed Next **16.3.8** metadata, route-handler, robots/sitemap, image-response and JSON-LD guides were read before implementation. Node **24.12.0** / npm **11.16.0** and the existing pinned dependencies were used.

- **`npm run check` passed: 266 tests in 24 files. `npm run build` passed**, including all three static HTML/Markdown/image city routes. Focused tests protect malformed origins (including empty user-info/ports), query/fragment exclusion, demo/deployment indexing precedence, unknown-city 404, numeric-assumption precision, Markdown block escaping and hostile JSON-LD content. Fractional-operand and Markdown-block regressions failed before correction, then passed. The script-boundary test failed before escaping, observing two scripts instead of one, then passed with content preserved. A malformed-origin build was also rejected before compilation.
- **48 real HTTP requests per local production/Preview-policy run** covered ordinary, `Twitterbot/1.0` and `facebookexternalhit/1.1` agents. Checks covered all three cities with tracking queries and spoofed forwarded-host headers, root 307, unknown/preview 404s, unique head metadata, clean canonical/social/discovery URLs, one `h1`, initial text/links/FAQ, parsed JSON-LD, robots, sitemap exclusions, all nine llms resources and Markdown/visible city-copy parity. A separate `VERCEL_ENV=preview` build retained production canonicals, returned noindex headers, allowed crawling and produced an empty sitemap.
- All advertised local image paths returned **200 / `image/png` / 1200 × 630**. Phoenix was **213,567 bytes**, City A **218,938 bytes**, City B **218,756 bytes**. Actual PNGs were inspected for crop, city/demo/fictional labeling and legibility; the standalone output also contained the traced local fonts/posters. No new Docker image run is claimed.
- Chromium **1440 × 900** desktop and **390 × 844** mobile inspection showed unchanged Hero presentation and legible, fitting footer links without horizontal overflow. Real footer navigation, native city selection and browser Back synchronized city identity/selection. Simulator smoke produced Phoenix **$90 / 100% → 9 panels / $7,796.25 / $90.00 / 7.2 years**, City A defaults **20 panels / $18,000 / $180 / 8.3 years**, and City B defaults **37 panels / $35,520 / $177.60 / 16.7 years**. Phoenix Edit retained the operands; an actual **5,337-byte, two-page selectable-text PDF** saved with the matching identity/results. No broad 3D regression campaign or native-share-sheet certification was performed.
- The browser recorded **83 requests**, no browser exceptions/error-console entries, and one unrelated automatic **`/favicon.ico` 404**; that unadvertised asset is absent in the existing application. Optional screenshots, response summaries and PDF evidence remain under ignored `evidence/seo/`, not public routes or setup requirements.
- **The deployed origin was inspected separately** with ordinary/Twitter crawler agents: root 307, all three city HTML pages 200, unknown city 404. It does not expose the new canonical/social metadata; new robots/sitemap/llms/Markdown/social-image endpoints returned **404**. This task did not commit, push, open a PR, merge or deploy. Public-host availability of the new resources and real shared-link rendering therefore still require an authorized deployment and post-deployment checks. Local results are not evidence of indexing, rankings or AI citations; physical-device/Safari and real message-platform previews remain unverified.

### Final landing complement

The local complement replaces the root redirect with a real 404 and removes only the opening curtain's decorative SVG and orphaned styles/asset. Its opaque `--paper` surface, typography motion, curtain/camera choreography and 3D house panels remain. Historical results above and in CAR-28 describe earlier trees, not this complement's final integrated regression.

One shared **Talk to a solar specialist** button follows the process steps and installation crews, appears only in released simulator results, and sits beside the final estimate action on desktop/below it on mobile. Its small disclosure explains that this is a demo and **no request has been sent**. Toggle, outside dismissal and Escape retain sensible focus; a nested disclosure consumes Escape before the mobile simulator. No lead capture, analytics or service request is implemented. Final-tree commands, browser/Docker outcomes and artifacts are recorded in the delivery; deployment remains separately authorized.

## Financial contract

Bill: **$40–$600**, in **$10** steps. Coverage: **50%–100%**, in **5%** steps. Initial state: **$220 / 80%**. Household profiles change only the bill. Invalid fields, including empty fields, preserve the last valid calculation and scene intent, display the validation policy, and do not produce `NaN`. Financial values update immediately; only the accessible announcement is moderated at 600 ms.

For Phoenix:

1. Monthly consumption = bill / **$0.15/kWh**.
2. Generation per panel = **0.45 kW × 6.5 h/day × 30 days × 0.8 = 70.2 kWh/month**.
3. Panels = the maximum of **8** and the ceiling of target consumption divided by per-panel generation. Coverage is not adjusted to accommodate the minimum.
4. Gross investment = panels × **450 W × $2.75/W**; net investment = gross × **70%**, after the 30% federal credit.
5. Savings = the minimum of the bill and the value of generated energy. Surplus becomes Arizona Public Service credit, not cash income. Payback = net investment / (12 × monthly savings).

There is no intermediate rounding. Currency and payback-year formatting belong to the UI. The state incentive of **25%, capped at $1,000**, is disclosed but **excluded from net investment and payback**. Ceiling handling accounts for floating-point precision at an integer boundary without first rounding consumption or generation.

| Bill / coverage | Financial panels |               Visual panels |
| --------------- | ---------------: | --------------------------: |
| $220 / 80%      |               17 |                          17 |
| $90 / 100%      |                9 |                           9 |
| $90 / 80%       |                8 |       8, coverage preserved |
| $600 / 100%     |               57 | 51, with an explicit notice |

The financial domain does not cap panels at 51. An independent oracle covers all **627 valid combinations**. The historical WEB 03 browser session also exercised eight UI cases, a profile preserving coverage, and an empty field preserving previous numbers; those observations are not a fresh browser run for this review.

The supplied brief's apartment example lists eight panels after coverage reaches 100%, but its stated formula requires nine for $90/100%. This implementation follows the formula and ceiling rule, rather than rounding nine down to the minimum. At $90/80%, the minimum correctly produces eight. The inconsistency is documented without changing the supplied city content or interface text.

## Data-driven public cities (CAR-30)

The native header **Choose city** select replaces only the former header estimate CTA. Its options are **Phoenix**, **City A (Demo)**, and **City B (Demo)**; its value follows the URL, including direct entry and browser Back/Forward. Hero and final estimate CTAs remain available. Demo metadata, visible notices, footer, and PDF identify the synthetic municipality, utility, incentives, testimonials, and crews. Demo contacts are unavailable, plain text, and non-operational.

### Add or replace a city

1. Add a typed configuration beside `src/domain/cities/phoenix.ts`, or replace the data in an existing configuration. Supply identity/location, designation/contact, all financial operands, utility/incentives, stats/neighborhoods, household profiles, FAQ, testimonials, and crews.
2. Supply `hero.description`, the desktop/mobile `scenePoster` sources and alt, the complete `process` copy/steps/images, `socialProof` headings/accessibility labels, `finalCTA` copy/image, and **each crew's own `portrait`**. Associations belong to the record, never to list position or a global portrait index. Different crew counts, ordering, and intentionally repeated image sources are supported.
3. Image records use `src`, `alt`, and `decorative`. Use existing authorized local `/assets/` files or add properly licensed local assets. Non-decorative images require meaningful alt; decorative images require empty alt. Validation rejects traversal, empty/dot path segments, backslashes, encoded paths, query strings, and fragments. Poster alt must be meaningful. Do not describe shared imagery as a verified photograph of the configured municipality.
4. Register the configuration in `src/domain/cities/cities.ts` with a key equal to its validated `slug`. Standard slugs follow the normalized city/state-code identity; demo slugs follow the normalized city name. A demo requires `{ kind: 'demo', label: 'Demo', notice: '...' }` and `{ kind: 'unavailable', label: '...' }` contact data. The notice must plainly communicate that its figures and identities are synthetic, not verified local claims. Invalid data fails validation rather than silently using Phoenix.
5. Run `npm run check` and `npm run build`. **Rebuild production whenever registrations or data change**: static params, metadata, page content, and selector options are generated from the registry. No page/component identity branch, new route implementation, test flag, or export-specific city mapping is required.

The three cities intentionally share authorized installation/closing photography, some portraits, the approved posters, and the finished-v04 house. Sources and accessibility descriptions are configured explicitly. The 3D scene is an illustrative house, not municipality-specific geography; its camera, materials, trajectory, panel ceiling, and choreography are unchanged.

### Navigation and financial policy

Changing city remounts the city-owned page subtree. The new city starts **closed at $220 / 80%**, with its own matching profile (or no selected profile when none matches); draft, calculation, notice, prepared file, and scene intent cannot carry over from the previous city. Back/Forward likewise initializes the destination city. Within one city, editing, presets, close/reopen, and View house preserve draft/profile/coverage and unchanged prepared-file reuse. Nothing persists as a city preference.

The formula is shared, not the operands. At **$220 / 80%**, independently checked results are:

| City          | Rate / sun / panel / performance | Cost per W / floor / federal credit | Panels | Net investment | Monthly savings |    Payback |
| ------------- | -------------------------------- | ----------------------------------- | -----: | -------------: | --------------: | ---------: |
| Phoenix       | $0.15 / 6.5 h / 450 W / 0.8      | $2.75 / 8 / 30%                     |     17 |     $14,726.25 |         $179.01 |  6.9 years |
| City A (Demo) | $0.20 / 5 h / 400 W / 0.75       | $3.00 / 6 / 25%                     |     20 |     $18,000.00 |         $180.00 |  8.3 years |
| City B (Demo) | $0.10 / 4 h / 500 W / 0.8        | $2.40 / 10 / 20%                    |     37 |     $35,520.00 |         $177.60 | 16.7 years |

State incentives remain disclosed but excluded from investment/payback. Savings cannot exceed the bill; surplus credit is not cash. Only the illustration caps panels at 51. PDF identity includes active-city content and the designation notice, not merely bill/coverage.

Native share ownership alone is tab-scoped: an outstanding OS share operation still disables a newly mounted city's share/download actions until it settles. It does not retain the previous city as current data, release an obsolete result, or announce the previous share's result in the new city. PDF cache/generation remains city-owner scoped and disposes on city unmount.

### Evaluator walkthrough — ordinary public UI

1. Build/start locally and open `/city/phoenix-az`. Activate **See my solar estimate**, enter **$90**, continue, set coverage to **100%**, and continue. Expect **9 panels, $7,796.25 investment, $90 monthly savings, 7.2 years**. Download the selectable-text PDF; it must identify Phoenix and the same operands/results.
2. Close the simulator, choose **City A (Demo)** in the header, and activate the normal estimate CTA. The destination starts at **$220 / 80%**; continue twice and compare its **20-panel** result with the table. Inspect its synthetic notices, Quartz Demonstration Utility, two configured crews, and PDF. No preview or harness route is needed.
3. Close, choose **City B (Demo)**, and repeat. Expect **37 panels** with the distinct Cedar Demonstration Grid assumptions, four configured crew associations, different profiles/content, and a City B demo PDF.
4. Use **Edit estimate**, **Return to presets**, close/reopen, and **View house / Back to simulation** without changing city; check preserved inputs and results. Change city, then use browser Back/Forward; check the URL/selected option and destination defaults rather than an old city's estimate.
5. Download or share only after preparation is ready. Unsupported native file sharing starts a download; it does not claim a share sheet appeared. Actual save/share handoff depends on the browser and device.

Fresh local CAR-30 evidence includes **238 passing tests in 21 files**, a production build with all three static city routes, actual selectable-text PDFs and rendered two-page pagination, and a **24-case** three-city desktop/mobile/short-height viewport matrix. Native wheel/touch, modal focus/lock cleanup, city interruptions, and **30 city scene lifetimes** were exercised; settled viewer counters remained **1 renderer / 5 listeners / 2 observers / 0 pending RAF** within the page. Actual Windows Chrome **200% keyboard zoom** changed 1440×900 to 720×450 CSS pixels and native DPR 1.25 to 2.5, with unchanged results, at least 44 CSS px targets, and no horizontal page/drawer overflow. A real native background-tab transition preserved frame count, camera, and curtain progress while `document.hidden` was true, then restored the normal exit and CTA focus without a getter override.

Actual production PDF checks also exercised cold preparation/focus retention, module rejection/retry, generation failure/retry, a measured **20-second timeout** with explicit retry, and a pending City A import completed after City B became current. GLB HTTP503 fallback still produced the City B PDF; recovery reused the same prepared File. Native context loss/restoration, queued cold-load cancellation, obsolete-city asset completion, reduced motion, and partial **8 → 51 → 9** panel retargeting were exercised without changing the approved choreography.

Optional local artifacts are under ignored `evidence/car30/`, not public routes or checkout prerequisites. Physical phones, Safari, software keyboards, and genuine OS share sheets remain unverified; simulated native-share API results are labeled as simulations. The inherited finite-ground edge at 1280×360 is preserved rather than hidden through artistic recalibration.

## Result actions and estimate export (CAR-29)

Results retain manual **Edit estimate** controls and add three centered action rows: **See the installation steps**, **Return to presets**, and the paired **Download PDF / Share estimate** buttons. Returning to presets changes only the step; selecting a profile changes only the bill. Coverage, manual values, and the last valid estimate survive navigation and close/reopen. The close control is a round blue, decorative X with the accessible name **Close simulation**.

`estimate-draft.ts` owns draft/navigation transitions. `estimate-document.ts` captures a deep-frozen estimate using the unchanged financial function and supplies both on-screen formatting and PDF content. `estimate-pdf.ts` creates selectable text with the brand palette, selected city/bill/coverage, financial results, assumptions, the excluded state incentive, applicable minimum/savings-cap/non-cash/illustrative-roof notices, and fictional-estimate/tax/eligibility limitations. Financial calculation still includes all **57** panels at $600/100%, even though the illustration displays **51**.

Export adds one direct dependency, **pdf-lib 1.17.1 (MIT)**, and its four transitive packages. The lightweight export owner is imported normally; the PDF generator and library are imported on demand at result entry, without a server route, upload, HTML/image capture stack, or PDF preview. Standard Helvetica/Helvetica Bold keep the PDF portable without adding fontkit or duplicating the private IBM Plex assets. Unsupported font characters reject preparation instead of silently changing city or utility text. The PDF license is preserved in [the license file](licenses/pdf-lib/LICENSE.md).

The export owner remains mounted outside the gated result content through navigation and close/reopen. First entry without a prepared file shows **Preparing your estimate…** while both module import and PDF generation run; summary, notices, installation link, and export controls appear together when the matching file is ready. Editing still updates the calculation and panels immediately. Close, back/edit, and presets remain usable during preparation, with persistent navigation nodes and visible retained focus when results appear. Cached unchanged results appear immediately. Import/generation errors or a 20-second preparation timeout expose usable results and an explicit export retry; late completions cannot replace a newer retry or snapshot. A single prepared `File` belongs to the current immutable snapshot and raw-input key; input or relevant city changes invalidate it. Concurrent generation is deduplicated, and download/sharing reuse the same file.

Identity changes also clear released presentation and PDF status. Editing away from a ready estimate and returning to the same inputs requires regeneration before that result is released again; unchanged cached files and already released same-identity retries are unaffected. A mounted React regression covers ready A → inactive B → inactive A → active A with generation deferred, using a file-local jsdom test environment.

Native file sharing requires a secure context, `navigator.share`, and `navigator.canShare({ files })`. Generation happens ahead of activation; preparation/retry without a ready file explicitly requires another activation. Native sharing starts synchronously from that gesture. Cancellation is a normal result; unsupported sharing starts a PDF download instead; genuine errors are announced with retry instructions. A pending native share retains tab-scoped operation ownership across input changes, navigation, and city-owner unmount/remount. Download activations are coalesced for 500 ms; Blob URLs remain valid for at least 60 seconds rather than being revoked immediately or on drawer unmount. “Download started” does not claim that the browser or user completed saving.

The narrow drawer remains a modal with contained internal scrolling, focus containment, inert background, Escape, and body scroll-lock cleanup. **View house** is the active, non-modal path for full-page scrolling and preserves the estimate; **Back to simulation** restores the drawer. Desktop drawer scrolling chains to the document at its boundaries. A stable scrollbar gutter and restrained spacing keep the content track consistent; related notices share one visual group without removing their wording. Step changes restore the drawer's own scroll position to the top before focusing the heading. If preparation completes while a navigation control is focused, only the drawer scrolls as needed to keep that same control visible. Controls have at least 44 CSS px targets, and numeric fields use at least 16 px text.

Automated coverage includes draft/profile preservation, immediate live calculation during deferred preparation, immutable snapshot/assumption identity, actual compressed PDF text and pagination bounds, import/generation readiness, timeout and retry, obsolete generation completion/failure, same-file reuse, share activation/cancellation/capability/error handling, cross-snapshot pending-share ownership, delayed URL release, rapid download coalescing, and drawer accessibility semantics. Physical phone/Safari share-sheet handoff and a real software keyboard remain manual checks; desktop Chromium mobile/touch emulation is not physical-device certification. This branch does not publish or update Linear.

Original CAR-29 verification passed **199 tests across 17 files** (baseline: 152 across 13), `npm run check`, and the production build. Native Chromium wheel/touch journeys reached the bottom and returned to the top with the simulator closed and genuinely active: desktop 1440×900 and 1280×360; mobile 320, 390, 430, and 470 px widths, plus 430×380 short-height emulation. The visible mobile modal retained internal scrolling and background locking; View house unlocked document scrolling without resetting the estimate. Real Chromium 200% browser zoom, separate 200% root-text enlargement, 44 px targets, no horizontal drawer overflow, sampled result-text contrast of at least 5.97:1, and the 1.5 DPR cap at device DPR 3 were checked. The four native downloaded financial-fixture PDFs were extracted and rendered: each had two selectable-text pages with no text outside the page bounds.

Original CAR-29 browser evidence held actual-200 asset responses for four seconds and preserved zero camera/curtain movement and zero GL clears until release; queued opening and pending cancellation were exercised. Desktop/mobile HTTP503 cases still calculated and downloaded the estimate, then recovered through Retry 3D house with the same prepared file. Native interrupted panel retargeting, in-progress offscreen pause/resume, reduced motion, and WebGL context loss/restoration were exercised. Share success/cancellation/unsupported/error and pending-owner races were tested with explicitly simulated native APIs in the actual widget; a real Windows Chromium request ended as cancelled, not a certified successful share-sheet handoff. At that revision, city-change invalidation was covered at the snapshot/session contract and Phoenix was the only routed city; CAR-30 adds the public multi-city path above.

The original CAR-29 PDF/export chunk measured **434,006 bytes raw / 179,659 bytes with local gzip**; the ready, cold initial bill page did not request it. Original runtime evidence, screenshots, and actual PDFs are kept in ignored `evidence/car29-final/`, not application routes or committed test scaffolding.

Local UI-correction evidence is kept in ignored `evidence/car29-ui-corrections/`. Four presets at retained 55% and 80% were exercised at 1920×1080 and 1440×900 CSS viewports. The desktop profile track stays 285 px wide; Apartment at $90/55% shrank from an 898 px result to 743 px, with exports visible at 1440×900. Native wheel/touch/keyboard journeys covered 390 and 320 px mobile widths, 390×380 short mobile height, 1280×360 desktop height, and real Chrome 200% zoom (720×450 CSS within 1440×900). Controlled cold import, real import rejection/retry, delayed generation, cached reopening, close/back navigation, stale success/error, timeout/retry, and preparation-to-ready focus retention were exercised. These are local Chromium observations, not physical-phone certification.

The UI corrections passed `npm run check` (**205 tests across 17 files**) and `npm run build`. Production smoke covered cold-import gating, rejected-import retry, genuine same-File cached reopening, mobile preparation/focus/contained touch scrolling and View house cleanup. Explicitly simulated native-share APIs received the actual cached File synchronously under trusted browser activation; pending ownership survived a bill change, and cancellation remained normal. Unsupported sharing and direct download initiated export using the same File, with its Blob URL still readable after close. The actual prepared $60/55% PDF was copied by QA and its two pages extracted to verify results and notices. Native browser save completion was not established in this headless session; no successful physical share-sheet handoff is claimed.

## Hero, interaction, and scene

Canvas, poster, and Hero share **the same full-bleed rectangle**. Aspect uses actual host measurements and `ResizeObserver`; effective DPR is capped at **1.5**. A positioned, opaque white curtain covers the entire scene and caption before activation. Introductory copy remains mounted, centered in the available host, with inert controls during opening; it returns at complete exit coverage, without waiting for the hidden timeline tail. The Hero is not a scroll container. The intro can scroll internally on short viewports and chains vertical wheel/touch scrolling to the document at either boundary; mobile drawer scrolling remains contained, while desktop drawer scrolling chains to the document at its boundaries. Opening aligns a partially scrolled Hero below the measured header, without changing the reserved Hero/header dimensions. Desktop **1440×820** and mobile **390×780** posters are genuine `CASA_BASE` captures, not photographs standing in for the 3D result.

The centered motto retains local **IBM Plex Sans 600**, the approved two lines, and responsive display sizing; narrow and short layouts are tuned separately. The opening curtain now uses only its opaque **`--paper` / `#FBFCFD`** surface: the former decorative panel SVG and orphaned motif styles were removed. The actual 3D house panels and approved social-card house posters are unchanged.

The motto has one intact accessible heading name; visual grapheme spans are hidden from the accessibility tree and wrap only between words. Native CSS transitions follow the existing `data-copy-hidden` milestone in both directions: **460 ms** per transition plus at most **48 ms** of normalized stagger, independent of character count. Interruption reverses from the current computed state. Reduced motion applies endpoints immediately. There are no new timers, listeners, animation dependencies, or camera/curtain/focus gates.

On opening, the eyebrow, description, CTA/helper group, and caption share a scoped **250 ms opacity fade** driven by the existing `data-copy-hidden` state. Neither the heading nor its ancestors or the brand header is faded. Existing intro inert handling remains in force; hidden supplementary content also ignores pointer input. Supplementary opacity restores immediately at the unchanged full-white visibility gate, without adding a return fade. Reduced motion applies the hidden/restored states immediately.

Desktop interaction is non-modal. At up to 700 CSS px, the panel is a modal dialog with contained focus, circular Tab/Shift+Tab navigation, an inert background, Escape, and scroll-lock cleanup. Focus moves to a non-inert target before the panel is hidden or loses usability during recovery, and returns to the CTA at the full-white milestone. **View house** hides the panel without ending simulation or changing its revision; **Back to simulation** restores the step, inputs, profile, coverage, and estimate. The drawer reveals its outer width from a fixed right edge without scaling its contents: **340 px** internally on desktop, available viewport width minus safe-area insets and **28 px** on mobile. The historical mobile measurement recorded control heights of at least 44 px.

The scene starts in `CASA_BASE`, including the first cold-load frame. Before readiness, activation stays queued behind the full white cover with accessible cancellation; the viewer always receives the latest intent. Network/unavailable-WebGL/context failure releases the visual barriers into an explicitly announced 2D estimate with **Retry 3D house**, without blocking calculation. A render exception stops painting until manual retry; a failed inactive exit restores the readable intro and settles the base scene. Retry retains the latest intent and waits for native context restoration when necessary. After a successful recovered paint, readiness precedes authoritative snapshot replay, so a settled active scene clears the curtain without requiring a resize or another RAF. Disposed/superseded generations cannot replay stale readiness, and closing while unavailable cannot revive an obsolete opening.

- **207 original nodes + 3 environment nodes = 210**, **51 panels**, identified by `asset_id`. No removed hexagonal bed is recreated; there is no alternative assembly, materialKit, or historical asset dependency in runtime.
- Public panel counts use `MISTO_PREFIXO` with `n` equal to the visible count, preserving the prefix pose through removal and settlement. An explicitly selected `REFINADOS_08` remains the separate technical/legacy fixture with its authored transforms; shared IDs do not make the poses interchangeable. Phoenix retains its minimum of **8** and **“The minimum system size is 8 panels”** notice; demo minima and their notices derive from their configured **6** and **10** floors.
- Baked/unlit materials, **sRGB** output, **NoToneMapping**, exposure **1**, and no lights, shadows, or fog; the JPG sky has zero yaw. Approved artistic transforms and presets are preserved.
- Public simulation entry holds the approved frontal camera for **0.4 seconds** (`leadInSeconds`, clamped to **0.3–0.5 seconds**), then follows the unchanged approved orbit over **3 seconds**. Camera progress is raw; `easeInOutCubic` is applied only inside approved pose interpolation. The curtain shares the normalized composite coordinate `s`: lift is `smoothstep(clamp((s − 0.03) / 0.97))`, rather than a late jump. Full white is preserved through `s = 0.03`. Desktop and portrait samples at camera progress **0.25, 0.45, 0.65, and 0.85** were visually checked without an exposed horizon. At **1280×360**, the unchanged elevated preset exposes a lateral edge of the finite ground; this also appears in the reviewed HEAD and is not hidden by changing the camera, composition, or asset.
- Camera **and** curtain completion start panel reveal and the **400 ms** drawer reveal on the same clock tick. Module/support share only a transient wrapper. Each panel uses a **150 ms** cubic tween and `min(40 ms, 1300 ms / max(1, N − 1))` stagger: **1,450 ms nominally** for 51 panels. Local foreground-browser evidence measured **1,462.4 ms**, including frame quantization; this is an observation, not a performance guarantee.
- During an interrupted addition-to-removal retarget, currently visible partial panels that remain in the target continue their **150 ms** cubic tween while excess pairs shrink. Their sampled transforms do not jump at retarget; wrapper cleanup waits for both groups to settle before restoring native parents. The focused ninth-panel regression exercises a fully settled **8 → 51 → 9** sequence at an exact **80 ms** addition sample.
- Closing contracts the drawer in **200 ms** and removes panels in reverse actual entrance order, monotonically from their sampled scales. Only after both are hidden does the **same forward coordinate** return using `(1 + cos(πt)) / 2`: **2.4 seconds** for a complete return, proportionally shorter for a partial one. The same curtain mapping runs backwards; intro copy, controls, and focus return as soon as it is fully white, while the remaining hidden clock finishes separately. Reopening, count retargeting, and resize preserve sampled progress; revisions reject stale callbacks, and duplicate completion cannot restart a return. All wrappers disappear at rest, restoring original parents, child order, and TRS.
- Offscreen or hidden-document states pause clocks/RAF; resuming excludes hidden time. A stable scene keeps no animation RAF. Reduced motion completes once without an animation loop.

The technical GUI supports pose editing/application, preset selection, current pose, approved-preset restoration, scrub/play/pause, duration/easing/trajectory, solar states, and copying/exporting JSON. Historical evidence records draft editing during advancing playback and inspection of 102 module/support records with correct parents and identity local TRS.

## Focused palette and typography pass (CAR-31)

Source and live Chromium styles were inventoried before editing the merged CAR-30 baseline `76b05f65c75de53eb74f5629746d3129df1b8fcf`. Core tokens remain `--paper #FBFCFD`, `--navy #102B4E`, `--text #244568`, and `--blue #315C9A`; primary CTA hover uses `--blue-hover #23497F`. The follow-up makes existing `--paper` the single semantic white-surface token, including header/select, curtain, ProcessSteps and FAQ. `--sky #EDF4F7` remains the deliberately colored simulator/social background and selected/informational state color. `--green #557653` and `--yellow #E6BD4F` are defined but have no public CSS consumers; neither was removed or substituted.

| Source inspected                                                                                                           | Checked color roles retained                                                                                                                                                                                                                                                                                                                                                           |
| -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/globals.css`, `src/app/layout.tsx`                                                                                | Paper body, text/heading/link tokens, blue 3px focus outline; local Plex declarations unchanged.                                                                                                                                                                                                                                                                                       |
| `src/app/city/[citySlug]/page.module.css`, `src/components/CitySelector.module.css`                                        | Paper header/select, navy brand/select, blue primary CTA with contrast-white text, paper/navy final CTA; helper `#4F6F8B`, selector border `#B2C6D4`, navy footer with `#DCE8EE` text and contrast-white brand.                                                                                                                                                                        |
| `src/components/sections/{Hero,Motto,ProcessSteps}.module.css`, `src/components/ui/{SectionHeading,Container}.module.css`  | Opaque `--paper (#FBFCFD)` curtain and explicit paper ProcessSteps background; navy headings, blue eyebrows/numbers, `#466780` notice/caption. Curtain opacity/animation, motif opacity and motto/intro transitions are untouched; Container has no color/type overrides.                                                                                                              |
| `src/components/sections/{SocialProof,TestimonialCarousel}.module.css`                                                     | Testimonials and crews share sky; paper-white cards/controls, `#CBD9E0` borders, navy quotes/names/values, `#466780` metadata/status. Portrait fallback `#DCE7EC` and `linear-gradient(transparent, rgb(8 31 54 / 84%))` remain; arrow hover/focus is blue and disabled opacity remains `0.45`.                                                                                        |
| `src/components/sections/{FAQ,FinalCTA}.module.css`                                                                        | Explicit paper FAQ background, navy questions, text-token answers and `#CBD9E0` dividers; final image fallback `#0D2744`, contrast-white/sky copy and navy mobile copy background. Section variation is preserved.                                                                                                                                                                     |
| `src/components/ui/Button.module.css`, `src/features/simulator/{SimulatorHero,SimDrawer,EstimateExportActions}.module.css` | Blue primary controls with contrast-white text, paper/navy alternatives, paper drawer/inputs with `#AFC2CE` borders, `#CBD9E0` profile/result dividers, sky selected profiles/notices/colored result hover, blue selected/focus/accent states, navy `rgb(16 43 78 / 18%)` shadow. Export status retains text blue and semantic error `#8B1E1E`; disabled/busy selectors are unchanged. |
| `src/app/not-found.module.css`, `src/app/preview/{components/preview,scene/calibration}.module.css`                        | Not-found inherits the global palette/type. Preview-tool white controls/diagnostics also use paper; these development tools are not additional public-page palette rules.                                                                                                                                                                                                              |

Supporting blues, pale borders, image fallbacks and alpha overlays above were retained for their existing roles, not asserted to be exact mathematical blends of core tokens. No blind color replacement, asset/foreground normalization or section recomposition was performed.

`layout.tsx` still loads local IBM Plex Sans **400/500/600** into `--font-plex`; body uses that family with its existing Arial/sans-serif fallback. Chromium reported all three Plex faces loaded and actual Regular/Medium/SemiBold custom fonts on quotes, city selection and display text. Native buttons/inputs/selects/textareas now inherit the family without resetting their sizes, weights or line heights. The footer brand's browser-default **700** is explicitly **600**, matching an available local face.

| Measured public type                   | Weight    | Desktop size / line height (px) | Mobile size / line height (px) |
| -------------------------------------- | --------- | ------------------------------- | ------------------------------ |
| Body                                   | 400       | 16 / 25.6                       | 16 / 25.6                      |
| Header brand / city select             | 600 / 500 | 20 / 26; 14 / normal            | 20 / 26; 12 / normal           |
| Hero motto / lead                      | 600 / 400 | 97.2 / 99.144; 20 / 32          | 44 / 46.64; 16 / 25.6          |
| Section heading / process step heading | 600       | 46 / 48.76; 36 / 38.16          | 31 / 32.86; 28 / 29.68         |
| Carousel quote / author                | 400 / 600 | 19 / 28.5; 15 / 21.75           | 18 / 27; 15 / 21.75            |
| Crew name / FAQ question               | 600 / 500 | 26 / 28.08; 21 / 33.6           | 26 / 28.08; 18 / 28.8          |
| Final CTA heading / drawer heading     | 600       | 52 / 55.12; 24 / 25.44          | 32 / 33.92; 24 / 25.44         |

The carousel defect was selection-driven **19→21px**, **28.5→31.5px** and slide opacity **0.88→1**, not a weight mutation: quotes computed **400** throughout. Quotes now keep **19px/1.5** above 640px and **18px/1.5** at/below 640px, with opacity **1** regardless of selection. The obsolete `data-active` styling hook was removed; `aria-current`, live status, arrows, keyboard handling and focus remain. Desktop widths remained **387.625 / 488.75 / 387.625px** (the existing **0.92 / 1.16 / 0.92** proportions); mobile cards remained **326px** at the measured viewport. Demo crew counts remain **2** and **4**, using the existing grid.

**Targeted local evidence:** Chromium **1440×900** and **390×844**, before/after Hero/process/social/final-CTA screenshots, nine repeated arrow clicks per viewport, Home/ArrowRight/End/ArrowLeft/Home, live status, focused rail/input, disabled carousel endpoints, primary hover and selected-profile styles. The final CTA above the footer still invokes `openSimulation` with `window.scrollTo({ behavior: 'instant' })`: measured **5786→0px** desktop and **6534→0px** mobile synchronously, then focus reached `simulation-panel-title` with the panel usable. `SimulatorHero.tsx` was not changed. Ignored local screenshots and exact computed-style/verification JSON are in `evidence/car31/`.

**Checks and limits:** `npm run lint`, `npm run typecheck`, and `npm test -- src/components/sections/testimonial-carousel-navigation.test.ts src/components/sections/section-rendering.test.ts` passed (**5 tests, 2 files**). Native CSS behavior is demonstrated by live before/after probes, not those unit tests. An invalid-bill probe initially expected a disabled Continue button incorrectly: this form uses native required/min/max/step validity, so no form logic was changed. Primary-disabled styling and export error/busy styling were source-reviewed; actual disabled carousel states were exercised. No full test suite/build, production/browser/device/performance/3D/share-failure matrix was run. Any future PR still requires the repository's full CI quality gate; this pass remains local, without publishing or changing Linear.

### White-surface and city-typography follow-up

The existing six-file uncommitted pass was preserved on `feat/car31`. White-role declarations in the city/selector, Hero/ProcessSteps/FAQ/SocialProof/carousel, shared Button, simulator/export and two preview CSS modules now resolve through **one existing token, `--paper: #FBFCFD`**; no white alias was added. Pure white foregrounds needed for contrast on blue/photos, SVG/image/3D content, sky sections, selected-profile/colored-hover states and semantic error colors were not replaced.

| Representative computed background, all three cities at both viewports   | Before follow-up                | After              |
| ------------------------------------------------------------------------ | ------------------------------- | ------------------ |
| Header / city selector                                                   | `#EDF4F7`                       | `#FBFCFD`          |
| Curtain / quote and crew cards / arrow and alternative controls / drawer | `#FFFFFF`                       | `#FBFCFD`          |
| ProcessSteps / FAQ                                                       | Transparent over body `#FBFCFD` | Explicit `#FBFCFD` |

**Testimonial diagnosis:** a fresh development load did not reproduce a remaining selection-dependent highlight. Five repeated arrow clicks per viewport and Home/ArrowRight/End/ArrowLeft/Home showed unchanged card/text background, borders, shadows, transforms, filters, colors, family, weight, size, line height and opacity as `aria-current` moved. Native matched CSS showed no selected-card rule. The only follow-up card-style change was background **`#FFFFFF→#FBFCFD`**. Fixed **0.92/1.16/0.92** desktop proportions and the **3px `#315C9A` keyboard-only rail focus outline** remain; disabled arrows keep **0.45** opacity and live announcements remain. The reported residual highlight was not independently reproduced, so no speculative selected-style reset or focus suppression was added.

**Phoenix reference:** side-by-side computed family/weight/size/line-height comparisons covered **39 semantic roles** in Phoenix, City A and City B at **1440×900** and **390×844**, before and after. There were **zero demo/Phoenix mismatches and zero before/after font changes**. All three cities match the measured type table above, including quotes **400, 19/28.5px desktop and 18/27px mobile** and leads **400, 20/32px desktop and 16/25.6px mobile**. The extra demo disclaimer remains a separate **400, 14/21px** role, not a shrunk hero description. No typography or city-specific overrides were introduced; accepted crew counts remain **2/4**.

Ignored follow-up evidence is in `evidence/car31/followup/`: before/after Hero/social screenshots, white hex/style inventories, selected-node matched selectors, arrow/keyboard states, full side-by-side city typography JSON and `verification.json`. After-only ProcessSteps/FAQ/drawer screenshots supplement the computed comparisons. Live final-CTA checks still measured **5786→0px desktop / 6534→0px mobile**, synchronously with `instant`, then panel-heading focus; primary hover remains **`#23497F`** with contrast-white text. Preview-tool/error surfaces were source-reviewed, not exercised as a failure matrix. No camera/math logic, copy, layout, animation, public counts or publication state changed.

**Follow-up checks:** changed-file Prettier write/check passed across the 16-file local diff; `npm run lint` and `npm run typecheck` passed. `npm test -- src/components/sections/testimonial-carousel-navigation.test.ts src/components/sections/section-rendering.test.ts src/features/simulator/intro-copy-fade.test.ts` passed **7 tests in 3 files**, including native intro-opacity/reduced-motion regressions. Live browser probes, not those unit tests, verify white hex values and cross-city typography. No full suite, production build, performance/device/3D matrix, commit, push, PR, merge, deployment or Linear mutation was performed.

## Assets, authorization, and licenses

Read-only design inputs were the supplied `Brightfield-Solar-Phoenix-v2` OpenDesign export, `BRIGHTFIELD_WEB_POC_V01` proof of concept, and `CONTRATO_WEB03_FINISHED_V04.txt` delivered with finished-v04. These external inputs are provenance, not clone/setup prerequisites; no internal absolute path is needed to run the application.

Carlos Henrique authorized use/copying of the **eight supplied PNGs** during the October 6, 2026 WEB 03 session. They are in `public/assets/approved-v2`: `house-front`, `step-assess`, `step-plan`, `step-install`, `crew-ray`, `crew-danielle`, `crew-okafor`, and `closing-home`. The original session compared all eight against the supplied source by SHA-256 and found byte-identical copies. `house-front` remains in the component gallery; the public Hero uses the scene/posters. Installation steps and crews use the supplied images, and the final CTA preserves the blue-hour image. Primary authorship/origin, including possible AI generation, is unknown; these PNGs are not declared CC0 and no attribution is invented.

IBM Plex uses [official OFL 1.1](https://github.com/IBM/plex/blob/master/LICENSE.txt), preserved in `src/app/fonts/LICENSE.txt`. Poly Haven material/sky provenance is in [the CC0 notice](licenses/finished-v04/CC0-1.0-NOTICE.txt), including authors/URLs for White Stucco, Granular Concrete, Gravel Floor, and Kloofendal 48d Partly Cloudy Pure Sky. See [Poly Haven's license policy](https://polyhaven.com/license) and [CC0](https://creativecommons.org/publicdomain/zero/1.0/). This does not declare the entire project geometry, PNGs, or application CC0. The technical 2K sky resize is recorded in the manifest; WEB 03 did not re-bake, use Blender, or alter the art.

Only these three finished-v04 files are runtime 3D assets:

| File                  |     Bytes | Historical source/destination/HTTP SHA-256                         |
| --------------------- | --------: | ------------------------------------------------------------------ |
| `house.glb`           | 1,865,736 | `20cdc8f8ede8396227c5c7f4f38ab1e5f95d9dfe0ea22d28072d9bd62600b7c3` |
| `house.manifest.json` |   881,999 | `8ef5a7a184855aab05b1aeb5c2b51ff30aa4b1e00e28ddf51f5dc06f969e8d7d` |
| `sky-softened-2k.jpg` |   118,806 | `afd97440b1fbcbf98c534a8a269a2ccba525e75396c49c84d051b4e9ee6e3f12` |

Raw 3D total: **2,866,541 bytes**, below 3 decimal MB. `.prettierignore` excludes only the immutable manifest to preserve its bytes/hash, not source validation. `.gitattributes` disables line-ending conversion for the three finished-v04 assets, including Windows checkouts with `core.autocrlf=true`. The eight raw photos total **16,445,531 bytes**; the two posters total **800,089 bytes**. These are separate budgets, not a claim that the whole page, RAM, or VRAM fits in 3 MB.

### Historical traffic and memory observations

**Source/date:** the October 6, 2026 local WEB 03 implementation session, recorded in optional local `evidence/web03/acceptance.json` at `2026-10-06T10:46:58.871Z`. Its scope describes pre-publication work; subsequent PR/merge/deployment events are recorded separately. The following measurements were not repeated by the CI/security documentation review.

The local production build used a 1440×900 viewport, cache disabled only for that page, cold navigation, and actual scrolling to load all seven public photos:

| Group                        | Encoded HTTP body | Body after HTTP decompression |
| ---------------------------- | ----------------: | ----------------------------: |
| HTML                         |             8,950 |                        56,238 |
| JavaScript, 11 requests      |           317,389 |                     1,167,328 |
| CSS, 3 requests              |             5,536 |                        25,312 |
| Local fonts, 3 requests      |           326,595 |                       615,828 |
| Optimized photos, 7 requests |           465,266 |                       465,266 |
| Selected poster              |            16,358 |                        16,358 |
| Finished-v04, 3 requests     |         1,563,012 |                     2,866,541 |
| **Total**                    |     **2,703,106** |                 **5,212,871** |

`ResourceTiming.transferSize` reported **2,711,806 bytes**, including its overhead estimate, without third-party requests. This is not a packet/TLS measurement or a guarantee for every viewport/format. HTTP decompression is not pixel decoding.

Unique CPU index/attribute geometry buffers: **469,568 bytes**, not total RAM. Material images: 1024², 2048², and 512²; sky: 2048×1024. Scene counts: **148 meshes / 48 geometries / 3 materials / 3 textures**. Warm GPU counts: **49 geometries / 5 textures**, including internal renderer resources, stable through the recorded repeated restorations. Counts are not VRAM bytes and do not cover all framebuffer, mipmap, multisampling, or decoding costs.

## Local evidence and historical verification

The historical WEB 03 session recorded passing `npm run check` and `npm run build`: formatting, zero-warning lint, strict TypeScript, 101 tests across 11 files, pure contracts, and Phoenix SSG. Its actual browser scenario, rather than a simulated WebGL test suite, recorded:

- Public HTTP/307/404, metadata, and five section headings in HTML; production preview guards and development `noindex, nofollow` metadata.
- **1440×900, 1920×1080, 390×844, 470×815**, plus 768/1024 resize: matching Hero/canvas/poster rectangles, stable mode-switch height, one `h1`, and no horizontal overflow; desktop non-modal and mobile focus/keyboard/house/back/Escape cleanup.
- Immediate calculation, coverage-preserving profiles, minimum/cap/surplus/57 financial versus 51 visual panels, and empty fields retaining valid numbers.
- Outbound/return/reversal/resize from the actual pose; 210 matrices/parents/children without divergence after a roundtrip, zero stable wrappers, and no regression in partial reveal scale.
- Delayed GLB with open/edit/close before readiness and no obsolete journey; aborted GLB followed by edited-intent Retry restoring 33 panels, real context loss/restoration, editing while lost, and three cycles without warm-resource growth.
- Manual dispose during pending fetch, releasing renderer/canvas/observers/refs and rejecting old-generation callbacks. This is not presented as proof of React unmount.
- Actual offscreen RAF freeze, controlled-event/getter hidden-document testing, reduced motion, and DPR cap/shared ownership between two viewers.
- Calibration during playback, solar states, hierarchy, and valid copied JSON.

The root `evidence/` directory is ignored and untracked; its physical files remain local. These artifacts are **optional historical local evidence**, not links available in a fresh checkout of this change. No hosting or future publication is promised. Existing Git history is not rewritten.

If retained locally, the records are `evidence/web03/acceptance.json`, `evidence/web03/calibration-qa.json`, and `evidence/web03/failure-recovery-qa.json`. Full-page captures are `evidence/web03/final-page-desktop-1440.png`, `evidence/web03/final-page-desktop-1920.png`, `evidence/web03/final-page-mobile-390.png`, and `evidence/web03/final-page-mobile-470.png`. Closed/open/house states and native 1440/390 references are in the same optional directory; WEB 02 captures are under `evidence/web02`. The OpenDesign export uses fixed boards, so 1920/470 tested adaptation rather than an original baseline that did not exist. Current review validations are listed separately in [the review report](docs/ci-security-review.md#validation-and-change-scope).

### Limits of the historical evidence

Chromium on a desktop host, actual DPR **1.25**, without physical mobile/Safari testing. A DPR 3 getter simulated the 1.5 cap. The harness kept `document.hidden=false` between tabs, so visibility was exercised through a controlled getter/event rather than certified physical backgrounding. Blob JSON download was clicked, but the harness download list stayed empty: copied content/schema were checked, not physical downloaded-file persistence. Approved mobile crops were preserved without artistic recalibration to claim pixel equivalence with the export photograph. These observations do not replace final accessibility/performance/SEO evaluation on real devices in WEB 04, and this review did not repeat them.

## Delivery history and challenge status

- **WEB 01:** foundation, quality tooling, local fonts, Phoenix registry, and a verifiable minimal route.
- **WEB 02:** reusable components, tokens/CSS Modules, a development gallery, and controlled visual states. Historical local evidence is optional under `evidence/web02`.
- **WEB 03, October 6, 2026:** complete public composition, pure calculation, one controller, mobile modal, finished-v04, genuine posters, authorized images, calibration/lifecycle work, and recorded browser evidence. Obsolete media placeholders were removed; fixtures remain only in the development gallery. PR #1 later merged and Vercel recorded Preview/Production deployments.
- **Not implemented:** expansion to approximately 120 city pages, campaign attribution/geolocation, and the final physical-device accessibility/performance/SEO review. The wider city-template/campaign context in the brief is not a claim that these features exist now. Backend, authentication, scheduling, and payment are outside the required challenge implementation.

Two implementation decisions and their basis:

1. **Keep financial calculation separate from the roof illustration.** The pure function follows the supplied data/formula and an independent 627-combination oracle, while the visual adapter caps only rendering at 51. This preserves the 57-panel financial result and exposes the limitation instead of silently changing an estimate.
2. **Preserve the approved baked scene and camera rather than introducing new lighting or reframing the asset.** The implementation retains `asset_id` hierarchy, baked/unlit color handling, and approved endpoints; historical browser/transform/resource checks were used to catch lifecycle and transition regressions. Mobile crop limitations remain explicit rather than being hidden behind a substituted photograph or a pixel-equivalence claim.

Implementation was AI-assisted through OMP, using supplied data/assets, documented APIs, reusable components, and independently checked mathematics. **Time spent was not measured**; no estimate is inferred from timestamps. The supplied brief requires an **English video of up to 30 minutes** showing the page, a different simulation scenario, code decisions, and limitations. **No video link is currently provided**, and no hosted design link is claimed. The live application and repository are available; the remaining delivery items are not represented as completed by this documentation review.
