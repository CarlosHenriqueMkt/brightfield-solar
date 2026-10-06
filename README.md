# Brightfield Solar — Case 09

A responsive Phoenix landing page, real financial simulation, and the `finished-v04` 3D scene for [Alvorada Case 09](https://github.com/Alvorada-Dev/desafios-tecnicos/blob/main/casos/09-pagina-de-cidade.md). WEB 03 builds on the WEB 01 foundation and WEB 02 components. The company, city financial assumptions, incentives, crew identities, and testimonials are fictional; they are not current tax advice.

**Published application:** https://brightfield-solar-three.vercel.app — the public page is `/city/phoenix-az`. PR #1 was merged into `main` on October 6, 2026. The CI/security review records the exact commits, deployment evidence, and verification limits in [the review report](docs/ci-security-review.md).

## Run locally

Use **Node 24.12.0 or later within major 24** and **npm 11.16.0 or later within major 11**. `.nvmrc` selects Node 24.12.0; `packageManager` records npm 11.16.0, and `.npmrc` enforces engines and exact dependency versions. Install compatible Node/npm before running the project. No application secrets, global application tooling, or external design-reference files are required.

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

Exact versions in the single `package-lock.json`: Next **16.3.8**, React/React DOM **19.3.0**, TypeScript **6.0.3**, ESLint **10.12.0**, Prettier **3.9.9**, and Vitest **5.0.3**. WEB 03 added only **three 0.186.1** and **@types/three 0.186.0**. IBM Plex Sans 400/500/600 is served locally through `next/font/local`, without a font CDN.

### Environment and Git workflow

No authentication or build-secret variables are required by the current application. The source uses `NODE_ENV` for development-only gates; Next sets the appropriate mode through its commands. `.env*` files are ignored except `.env.example`; no example is currently included. Never populate a committed example with credentials. Any future `NEXT_PUBLIC_*` value must be treated as client-public, not a secret.

Start every implementation on a dedicated task branch, never directly on `main`. Inspect the working tree and index first, preserve existing work, and use the branch → PR → `main` workflow. `main` requires a PR and the GitHub Actions `quality` check on an up-to-date branch, including for administrators. The [CI workflow](.github/workflows/ci.yml) has one read-only job running `npm ci`, `npm run check`, and `npm run build`; Node/npm versions come from `.nvmrc` and `packageManager`.

**CI gate:** merging requires a successful `quality` result for the applicable PR revision. Local verification or a Vercel deployment status does not replace that required check; consult the PR's current checks for GitHub-hosted results. This workflow does not merge or deploy. Existing Vercel Git integration may create a Preview independently when a branch is published. See [the review findings](docs/ci-security-review.md#findings) for configuration and recorded verification evidence.

## Page, routes, and boundaries

- `/` redirects with **307** to `/city/phoenix-az`. Phoenix is **SSG** through `generateStaticParams`; it is the only registered slug. Unknown slugs return **404**.
- Server composition is **Hero/simulator → three installation steps → testimonials/crews → FAQ → final CTA**. Metadata, one `h1`, city data, and useful content are present in the HTML. FAQ uses native `details/summary`; testimonials have manual navigation without autoplay.
- `/preview/components` retains isolated WEB 02 examples and explicitly illustrative fixtures. `/preview/scene` provides calibration and technical inspection. Both return **200 with `noindex, nofollow` metadata in development** and **404 in production**, without public navigation links.
- `src/app/city/[citySlug]/page.tsx` composes `src/components/sections`. `src/domain/cities` owns the independent data contract, validation, and registry.
- `src/features/simulator/finance.ts` contains pure mathematics; `simulation-state.ts` contains the reducer; `SimulatorHero.tsx` coordinates interaction/focus; `SimDrawer` is controlled presentation. One controller handles all public CTAs, without duplicate simulators.
- `src/features/scene` owns the viewer, cache/lifecycle, manifest/hierarchy validators, solar states, approved presets, and trajectory. The server supplies the poster; WebGL loads as a client island. No renderer or debug handle is created on the server, and the DOM debug handle is development-only.
- No custom backend/API, scheduling, payment, authentication, administration, global state store, localStorage, geolocation, or analytics is implemented. The challenge does not require the first five. Production is published, but canonical metadata and a sharing image are not configured; do not confuse a known live URL with implemented SEO metadata.

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

## Hero, interaction, and scene

Canvas, poster, and Hero share **the same full-bleed rectangle**. Aspect uses actual host measurements and `ResizeObserver`; effective DPR is capped at **1.5**. Introductory copy remains in the DOM/layout and is hidden during simulation and return, so opening/closing does not change the Hero height. Desktop **1440×820** and mobile **390×780** posters are genuine `CASA_BASE` captures, not photographs standing in for the 3D result.

Desktop interaction is non-modal. At up to 700 CSS px, the panel is a modal dialog with contained focus, circular Tab/Shift+Tab navigation, an inert background, Escape, and scroll-lock cleanup. Focus moves to a non-inert target before the panel is hidden and returns to the CTA after the frontal camera arrives. **View house** hides the panel without ending simulation and preserves values/panels/elevated camera; **Back to simulation** restores the step. The historical mobile measurement recorded control heights of at least 44 px.

The scene starts in `CASA_BASE`, including the first cold-load frame. The viewer always receives the latest intent: opening/editing/closing before the GLB finishes does not launch an obsolete journey. Network/context failure leaves the poster and **Retry 3D house** available without blocking calculation. Retry is manual; restoration uses the current financial intent.

- **207 original nodes + 3 environment nodes = 210**, **51 panels**, identified by `asset_id`. No removed hexagonal bed is recreated; there is no alternative assembly, materialKit, or historical asset dependency in runtime.
- Baked/unlit materials, **sRGB** output, **NoToneMapping**, exposure **1**, and no lights, shadows, or fog; the JPG sky has zero yaw. Approved artistic transforms and presets are preserved.
- A complete journey in either direction lasts **4 seconds**, using `easeInOutCubic` and an orbital path from the actual current pose. Reversal/resize retarget proportionally, up to four seconds, without jumping to an old endpoint or repeating a completed arrival. Revisions reject stale callbacks.
- Module and support share only a transient wrapper. A **150 ms** tween and `min(40 ms, 1300 ms / max(1, N − 1))` stagger give at most **1,450 ms nominally** for 51 panels. Historical final-frame measurements were **1,462.9 ms**, or **1,464 ms** with a real 1024→768→1024 resize; these are dated observations, not current performance guarantees. The panel clock does not reset when the camera retargets.
- Reconciliation preserves actual progress without shrinking partially revealed panels. All wrappers disappear at rest, restoring original parents, child order, and TRS; module/support do not become independent root nodes.
- Offscreen or hidden-document states pause clocks/RAF; resuming excludes hidden time. A stable scene keeps no animation RAF. Reduced motion completes once without an animation loop.

The technical GUI supports pose editing/application, preset selection, current pose, approved-preset restoration, scrub/play/pause, duration/easing/trajectory, solar states, and copying/exporting JSON. Historical evidence records draft editing during advancing playback and inspection of 102 module/support records with correct parents and identity local TRS.

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
