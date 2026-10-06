# CI/CD and security review

**Review and correction date:** October 6, 2026. The original task covered documentation, root evidence exclusion, and read-only CI/CD/security assessment. The subsequent authorized correction adds one CI workflow, an LF checkout policy, and main branch protection. Runtime/UI/3D behavior, asset bytes, dependency versions, and Vercel/Socket settings remain unchanged.

## Authorized corrections — current state

- User first selected **“Protect main now, without publishing,”** then explicitly authorized **commit, push, and opening a PR**. Publication uses `chore/docs-ci-security-review` with the prior 36 evidence removals preserved. No merge, automerge, or direct production deployment is authorized.
- `.github/workflows/ci.yml` defines one `quality` job on `pull_request` and `push` to main: pinned official checkout/setup-node commits, Node from `.nvmrc`, npm from `packageManager`, `npm ci`, `npm run check`, then `npm run build`. Token permission is `contents: read`; checkout credentials are not persisted. No matrix, scanner, privileged PR trigger, production secret, or second deployment mechanism was added.
- Main protection was applied through the authenticated GitHub API: PR required, **`quality` from GitHub Actions app 15368** required, branch must be up to date, and administrators are subject to enforcement. Force pushes/deletion are disabled. Approval count is zero so this personal repository does not require an impossible self-approval; the PR and successful quality check remain mandatory.
- Main requires a successful `quality` run for the applicable PR revision. The local command replay below is not a GitHub/Ubuntu result; published execution must be verified through the PR's checks and exact head SHA. Existing Vercel Git integration may create a Preview independently on publication.
- `.gitattributes` now sets `* text=auto eol=lf` and retains the exact finished-v04 `-text` exception. Only the 41 diagnosed CRLF text files were normalized; all 41 match their Git-index content exactly after normalization.
- An actual temporary Git checkout with `core.autocrlf=true` exported all 41 affected files in LF and preserved the hashes of all 16 public/font assets. The temporary export was removed; no global Git setting or index entry was changed.

The preflight, baseline findings, and initial validation below describe the state **before** these corrections. Current verification and skill reviews are distinguished from those historical observations.

## Preflight and Git state

| Item                                       | Observed value                                                          |
| ------------------------------------------ | ----------------------------------------------------------------------- |
| Repository                                 | `CarlosHenriqueMkt/brightfield-solar`                                   |
| Origin                                     | `https://github.com/CarlosHenriqueMkt/brightfield-solar.git`            |
| Initial local branch / expected default    | `main` / `main`                                                         |
| Initial full HEAD                          | `c90101bdaf108edb8419ded5cb44ffdf0a37130b`                              |
| Initial local tracking state               | `origin/main`, ahead 0 / behind 0                                       |
| Initial working tree / index               | Clean / clean; no pre-existing staging                                  |
| Fresh remote default / main                | `main` / `c90101bdaf108edb8419ded5cb44ffdf0a37130b`                     |
| Remote prior feature branch                | `feat/web03-finished-v04` at `b478ab614ec11f918665db2edc746c5884a878f2` |
| Implementation branch created before edits | `chore/docs-ci-security-review`                                         |

[PR #1](https://github.com/CarlosHenriqueMkt/brightfield-solar/pull/1) is confirmed **merged**, not merely assumed merged from context: head `b478ab614ec11f918665db2edc746c5884a878f2`, merge commit `c90101bdaf108edb8419ded5cb44ffdf0a37130b`, merged at **2026-10-06T14:32:49Z**. Initial local and freshly queried remote `main` matched that merge commit.

The original review/correction stage made no commit, push, merge, deployment, history rewrite, dependency-version update, audit fix, scanner installation, or production-secret change. Main protection was its sole remote settings change; Vercel/Socket settings were unchanged. The subsequent publication authorization permits staging and committing the reviewed local files and existing evidence removals, pushing the task branch, and opening a PR—not merging it.

## Documentation inventory and corrections

The tracked authored documentation inventory contains **README.md only**. There were no pre-existing project `docs/`, handoff, or report documents. This requested English report is the only new document.

| Path/group                                                                         | Treatment                                                                                                                                    |
| ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `README.md`                                                                        | Entire authored content translated to English; structure, contracts, identifiers, numbers, asset provenance, and historical results retained |
| `docs/ci-security-review.md`                                                       | New English report requested by this task                                                                                                    |
| `licenses/finished-v04/CC0-1.0-NOTICE.txt`                                         | Excluded license/provenance notice, already English; unchanged                                                                               |
| `src/app/fonts/LICENSE.txt`                                                        | Excluded third-party license, already English; unchanged                                                                                     |
| Generated agent instructions/pointer                                               | Excluded tooling-generated content; unchanged                                                                                                |
| `evidence/**/*.json`, `evidence/**/*.png`                                          | Excluded machine-readable/historical evidence; not translated or modified                                                                    |
| Dependencies, technical JSON, lockfile, source code, assets, raw logs, Git history | Excluded from translation; corrective source changes are LF-only, with no logical diff. Assets and dependency versions remain unchanged.     |

README now distinguishes implementation from future city expansion, final device/SEO evaluation, and absent video/time records. It records the observed live application instead of the obsolete “no deployment” claim, corrects source paths to `src/...`, uses portable root-relative setup, and separates current review facts from the dated WEB 03 browser measurements. It records the brief's formula/example discrepancy without changing financial behavior. Two implemented decisions and their rationale are documented rather than inventing decisions or completed deliverables.

All three QA JSONs and four full-page captures are now **optional local historical references**, not repository hyperlinks. No new evidence host or publication promise is invented. Historical performance, resource, interaction, and test results are explicitly attributed to the October 6, 2026 WEB 03 record and retain their original limitations. Existing Git history remains intact.

## Root evidence exclusion and integrity

Before mutation, the tracked root evidence list, every file size, and every SHA-256 were recorded. `.gitignore` now contains exactly one root-anchored **`/evidence/`** rule. Only this command removed evidence from the index:

```sh
git rm -r --cached -- evidence/
```

No `-f`, filesystem deletion, reset, or extra staging was used. The physical contents remained unchanged.

| Integrity field                |                                                             Before |                                                              After |
| ------------------------------ | -----------------------------------------------------------------: | -----------------------------------------------------------------: |
| Local evidence files           |                                                                 36 |                                                                 36 |
| Total local bytes              |                                                         39,037,417 |                                                         39,037,417 |
| Tracked root evidence paths    |                                                                 36 |                                                                  0 |
| Per-file size/SHA-256 equality |                                                  Baseline recorded |                                                   All 36 identical |
| Aggregate manifest SHA-256     | `a812d1b9e9c904ef08e722b7aff47e63e378b851c0ea598169fe5c943a6ea09d` | `a812d1b9e9c904ef08e722b7aff47e63e378b851c0ea598169fe5c943a6ea09d` |

The aggregate is SHA-256 over sorted UTF-8 records consisting of path, NUL, decimal byte count, NUL, per-file SHA-256, and LF. Every one of the 36 paths passes `git check-ignore`; the three QA records and four full-page captures explicitly resolve to `.gitignore`'s root evidence rule. `git ls-files -- evidence/` is empty, and the cached diff outside evidence is empty. These are proposed index changes, not removal from older commits.

### Tracked paths recorded before removal

```text
evidence/web02/desktop-1440.png
evidence/web02/drawer-states-desktop.png
evidence/web02/final-mobile.png
evidence/web02/hero-open-desktop.png
evidence/web02/hero-open-mobile.png
evidence/web02/mobile-390.png
evidence/web03/acceptance.json
evidence/web03/calibration-04.png
evidence/web03/calibration-qa.json
evidence/web03/failure-abort.png
evidence/web03/failure-context-loss.png
evidence/web03/failure-cycle2.png
evidence/web03/failure-old-asset.png
evidence/web03/failure-open.png
evidence/web03/failure-recovered.png
evidence/web03/failure-recovery-qa.json
evidence/web03/failure-unknown-asset.png
evidence/web03/final-closed-desktop-1440.png
evidence/web03/final-closed-desktop-1920.png
evidence/web03/final-closed-mobile-390.png
evidence/web03/final-closed-mobile-470.png
evidence/web03/final-house-mobile-390.png
evidence/web03/final-house-mobile-470.png
evidence/web03/final-max-57-financial-51-visual.png
evidence/web03/final-open-desktop-1440.png
evidence/web03/final-open-desktop-1920.png
evidence/web03/final-open-mobile-390.png
evidence/web03/final-open-mobile-470.png
evidence/web03/final-page-desktop-1440.png
evidence/web03/final-page-desktop-1920.png
evidence/web03/final-page-mobile-390.png
evidence/web03/final-page-mobile-470.png
evidence/web03/html-desktop-1440.png
evidence/web03/html-mobile-390.png
evidence/web03/reference-desktop-1440.png
evidence/web03/reference-mobile-390.png
```

## Findings

### 1. High — no enforced repository quality gate before main (baseline)

**Baseline evidence, before correction:** GitHub reported [zero Actions workflows](https://api.github.com/repos/CarlosHenriqueMkt/brightfield-solar/actions/workflows) and [zero workflow runs](https://api.github.com/repos/CarlosHenriqueMkt/brightfield-solar/actions/runs?per_page=20). [`main` was unprotected](https://api.github.com/repos/CarlosHenriqueMkt/brightfield-solar/branches/main), with no required-status contexts/enforcement, and [repository rulesets were empty](https://api.github.com/repos/CarlosHenriqueMkt/brightfield-solar/rulesets). An authenticated request for main protection returned **404, “Branch not protected”**; this was not inferred from an unauthenticated access error.

The [PR head check-runs](https://api.github.com/repos/CarlosHenriqueMkt/brightfield-solar/commits/b478ab614ec11f918665db2edc746c5884a878f2/check-runs) contain Vercel Preview Comments and GitGuardian, not a run of the project's quality scripts. The [merge SHA check-runs](https://api.github.com/repos/CarlosHenriqueMkt/brightfield-solar/commits/c90101bdaf108edb8419ded5cb44ffdf0a37130b/check-runs) are empty. Queued GitGuardian/Vercel suites with no concluded runs are not passing quality checks. A successful Vercel deployment status does not establish that `npm run check` ran or was required before merge.

**Local evidence:** `package.json:6–21` defines compatible Node/npm engines, the existing aggregate `check`, and separate `build`; `.nvmrc:1` selects Node 24.12.0; `package-lock.json` is the single lockfile. No `.github` workflow exists in the reviewed tree at `c90101bdaf108edb8419ded5cb44ffdf0a37130b`.

**Baseline impact:** a merge or direct push could reach main without enforcing formatting, lint, strict typechecking, tests, and a production build. This was a governance/verification gap, not evidence of a vulnerable deployment.

**Correction applied:** the one-job workflow and required main check are configured as described above. Main protection requires the exact `quality` context from GitHub Actions app 15368, including administrators and up-to-date branches. The workflow reuses the existing aggregate check and separate build, without duplicate jobs or a deploy step. Publication was subsequently authorized; the gate is satisfied only by a successful required GitHub check, not by these local verification results.

### 2. Medium — Windows checkout line endings break the existing quality command (resolved)

**Baseline evidence:** `npm run check` exited 1 at `format:check`, reporting **41 files**, before lint/typecheck/tests could run. System-level `core.autocrlf=true` produced `i/lf w/crlf` for the warned paths. At that time `.gitattributes` contained only the finished-v04 `-text` exception; Prettier's LF default was unchanged.

During the baseline review, in-memory CRLF→LF normalization made all 41 warned files match Prettier output, with zero writes or other formatting changes. The aggregate was not rerun merely to confirm that known failure; the later corrective task normalized these same files.

**Baseline impact:** the quality command stopped at formatting on this Windows checkout, preventing its later stages from running. This was a reproducibility/tooling gap, not a runtime or security vulnerability.

**Correction applied:** `.gitattributes:1–2` defines LF for text and preserves the original asset exception. Targeted normalization changed only the diagnosed files' line endings. All 41 now equal their Git-index content, and a real `core.autocrlf=true` export confirmed LF text plus 16 unchanged asset hashes. Neither Prettier rules nor global Git configuration was weakened.

There are no additional confirmed source/config vulnerabilities in the bounded security review. Unverified integration coverage is listed below as a limitation, not promoted into a fabricated vulnerability.

## CI/CD and Vercel observations

### Existing project contract

`package.json`, `.nvmrc`, `.npmrc`, and the lockfile agree on Node **>=24.12.0 <25**, npm **>=11.16.0 <12**, npm package manager **11.16.0**, and exact dependency versions. The observed workstation uses Node **v24.12.0** and npm **11.16.0**. `check` already combines formatting, zero-warning lint, route/type generation, strict TypeScript, and Vitest; build is separate. No lockfile, engine, script, or dependency change is recommended for this review.

### Observed deployments versus unverified settings

| Evidence                                                                                                                             | Confirmed observation                                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| [PR #1 Vercel bot comment](https://github.com/CarlosHenriqueMkt/brightfield-solar/pull/1#issuecomment-6017818986)                    | Git-linked preview activity on the reviewed PR                                                    |
| [Preview deployment 6885880566](https://api.github.com/repos/CarlosHenriqueMkt/brightfield-solar/deployments/6885880566/statuses)    | Success for `b478ab614ec11f918665db2edc746c5884a878f2`, at 2026-10-06T13:54:58Z                   |
| [Production deployment 6886809053](https://api.github.com/repos/CarlosHenriqueMkt/brightfield-solar/deployments/6886809053/statuses) | Success for `c90101bdaf108edb8419ded5cb44ffdf0a37130b`, at 2026-10-06T14:33:31Z                   |
| [Live Phoenix page](https://brightfield-solar-three.vercel.app/city/phoenix-az)                                                      | Fresh HTML response with page title/metadata; not a fresh interactive/WebGL/performance benchmark |

These observations confirm Vercel Git activity and Preview/Production provenance, **not** the dashboard's configured production branch, linked repository setting, preview policy, build/install overrides, environment-variable names/values, or integration permission scope. No authenticated Vercel project-settings tool or session was available; unauthenticated project settings were not accessible. These settings remain **unverified**, and no correction is justified without observing an actual misconfiguration.

Read-only follow-up requires an authorized Vercel view of the linked repository, production branch, preview behavior, overrides, and integration permissions. No settings were changed and no tokens or CLI installation were requested.

## Socket and security review

### Socket: separate reported installation, coverage, and execution

| Question                                  | Status                                         | Evidence / limit                                                                                      |
| ----------------------------------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Installed on the personal GitHub account? | **User-reported; not independently confirmed** | Reported installation is not installation metadata                                                    |
| This repository selected/covered?         | **Unverified**                                 | No verified installation ID or selected/all repository list                                           |
| Actual granted installation permissions?  | **Unverified**                                 | Public requested permissions are not granted installation permissions                                 |
| Executed for the reviewed main/PR SHAs?   | **Not verified**                               | No Socket check, suite, status, or comment was observed for either exact SHA                          |
| Socket alerts/results clear?              | **Not established**                            | Absence of visible alerts/checks is not evidence that dependencies are safe or that the app is absent |

Authenticated GitHub `GET /user/installations` returned **403**, requiring an access token authorized to a GitHub App. `GET /repos/CarlosHenriqueMkt/brightfield-solar/installation` returned **401**, “A JSON web token could not be decoded”; that [app-authentication endpoint](https://docs.github.com/en/rest/apps/apps#get-a-repository-installation-for-the-authenticated-app) cannot be satisfied by treating ordinary CLI authentication as the app's JWT. No installation ID was verified, so an installation-specific repository list was not invented or queried with a guessed ID. This is an authentication-type limitation, not proof of insufficient OAuth scopes or a missing installation.

The [public Socket Security app metadata](https://api.github.com/apps/socket-security) identifies app **156372**, slug `socket-security`, owner `SocketDev`. Requested permissions observed on that metadata: **checks/contents/pull_requests: write**; **emails/issues/members/merge_queues/metadata: read**. These are not verified grants for this account/repository. Socket's [permissions documentation](https://docs.socket.dev/docs/permissions) explains that contents write supports Socket Patches and GitHub cannot scope contents permission by filename. Do not label that permission alone a vulnerability or confuse it with an Actions job token.

[Socket installation documentation](https://docs.socket.dev/docs/socket-for-github-installation) describes repository selection, dependency-change PR analysis, and default-branch project reports where supported manifests exist. This project has `package.json`/`package-lock.json`, but that only makes analysis plausible, not observed. No Socket configuration file was found, and no Socket configuration was added.

**Smallest read-only follow-up:** inspect personal GitHub Settings → Applications → Installed GitHub Apps → Socket Security to verify installation, selected/all repository coverage, this repository's inclusion, suspension, and granted permissions; then inspect Socket's latest default-branch report/execution and PR evidence against the two exact SHAs above. Check report/check/comment settings before interpreting missing GitHub output. No dummy PR, push, new scanner, or permission expansion is recommended to manufacture evidence.

### Versioned secret and workflow surface

The original bounded review covered source/configuration, tracked filenames, package scripts/lifecycle metadata, environment references, and workflow presence. Credential searches returned zero high-confidence credential/private-key/authenticated-URL matches and zero quoted credential assignments; only safe counts/names were printed. No versioned `.env`, key/PEM, or workflow existed in that baseline. The new local CI uses no production secrets and does not change this source/environment surface. History, dependencies, logs, binary assets, and machine-generated evidence were not scanned; no whole-history or dependency safety guarantee is made.

`.gitignore:7–8` ignores `.env*` while allowing `.env.example`; no example is tracked. That exception is appropriate only for non-secret placeholders. No build/auth secret lookup or `NEXT_PUBLIC_*` variable was found in project source. The four environment references are only `NODE_ENV`: `src/app/preview/components/page.tsx:20`, `src/app/preview/scene/page.tsx:10`, and `src/features/scene/SceneCanvas.tsx:59,64`, protecting development-only surfaces. Future public-prefixed variables must be assumed browser-visible.

Project scripts contain no install/prepare/build lifecycle hook beyond the explicit declared commands. The lock's optional macOS `fsevents` install metadata is not treated as malicious evidence; dependency bodies were not inspected. Known asset allowlists, own-property city lookup, React-escaped content, development-only debug handles, and production 404 preview gates were reviewed without a confirmed exploitable source/config issue.

The baseline had no Actions workflows. The new local CI grants only `contents: read`, uses ordinary `pull_request`, does not persist checkout credentials, and runs no secret-bearing deployment or `pull_request_target` code. This least-privilege policy is for the job token, not a substitute for Socket's independently documented app permissions. Socket/Vercel settings were not changed.

### Other observed security output

At PR head `b478ab614ec11f918665db2edc746c5884a878f2`, GitGuardian Security Checks **112306964261** completed successfully and reported two commits scanned with no detected secrets. Vercel Preview Comments **112306995151** also succeeded. These are distinct from Socket and from the project's quality gate; neither establishes whole-repository or dependency safety. At merge SHA `c90101bdaf108edb8419ded5cb44ffdf0a37130b`, check-runs were empty; queued suites without a conclusion are not reported as successful scans.

## Validation and change scope

### Corrective verification — current

**VERIFIED — original Windows formatting regression:** the baseline aggregate failed on 41 CRLF files; after the LF correction, the actual working checkout's `npm run check` exited successfully through formatting, zero-warning lint, strict typecheck, and all 101 tests.

| Scope / command                             | Observed result                                                                                                              |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Working Windows checkout: `npm run check`   | **Passed**, including 101 tests / 11 files                                                                                   |
| Exact workflow npm bootstrap in Git Bash    | **Passed**, npm 11.16.0 installed into an isolated prefix, not the user's global installation                                |
| Clean isolated workspace: `npm ci`          | **Passed**, 216 packages installed from the unchanged lock                                                                   |
| Clean isolated workspace: `npm run check`   | **Passed**, formatting/lint/types and 101 tests / 11 files                                                                   |
| Clean isolated workspace: `npm run build`   | **Passed**, cold production compilation, TypeScript, and static generation; Phoenix SSG                                      |
| Actual Git export with `core.autocrlf=true` | All 41 affected text files in LF; all 16 asset hashes preserved                                                              |
| Authenticated main protection read-back     | Required `quality`/app 15368, strict/up-to-date, PR and administrator enforcement confirmed                                  |
| Preservation                                | 41 text files match index content; 52 other baseline files unchanged; all evidence/assets unchanged; prior staging identical |

The isolated workspace was exported from the index with the local corrective files overlaid. It used Node v24.12.0 and the workflow's npm 11.16.0 bootstrap. Both npm bootstrap and install/check/build executed, not just YAML inspection. The temporary workspace and installed dependencies were removed; the project's existing `node_modules` and user's global tools were not replaced.

The original checkout's lockfile uses CRLF while the isolated export uses LF. Comparison with the Git-index blob confirmed that `npm ci` did not change the isolated lock; the original lockfile's size/SHA-256 remained unchanged. The cold build's expected no-cache/Next telemetry notices were not failures or new project instrumentation.

[Main protection API](https://api.github.com/repos/CarlosHenriqueMkt/brightfield-solar/branches/main/protection) independently confirmed the accepted settings. These recorded results are **local Windows command and repository-policy verification, not a GitHub-hosted Ubuntu job result**. Later publication authorization does not retroactively turn that replay into remote execution evidence; consult the published PR's checks for its exact head SHA.

### Initial review verification — before corrections

The initial documentation/index-only review used installed dependencies with Node **v24.12.0** / npm **11.16.0**. It did not run `npm ci` or change package versions. These results precede the authorized findings correction:

| Command / proof         | Observed result                                                                            |
| ----------------------- | ------------------------------------------------------------------------------------------ |
| `npm run check`         | **Failed** at formatting: 41 unchanged CRLF files; subsequent aggregate stages did not run |
| `npm run lint`          | **Passed**, zero warnings                                                                  |
| `npm run typecheck`     | **Passed**, route types generated and strict TypeScript completed                          |
| `npm test`              | **Passed**, 101 tests across 11 files                                                      |
| `npm run build`         | **Passed**, production compilation/TypeScript/static generation; Phoenix listed as SSG     |
| In-memory LF diagnostic | All 41 warned files otherwise formatted; zero writes                                       |
| Evidence smoke proof    | All 36 local files unchanged in size/hash; all ignored; zero tracked                       |

Lint/typecheck/tests/build were run separately because the aggregate stopped at formatting; they are not represented as an aggregate pass. README and this report alone were formatted; no source/config/package or asset formatting was applied.

The README's browser, WebGL, resource, performance, and previous test results remain historical October 6, 2026 evidence. This review does not claim a fresh interactive benchmark or reinterpret copied observations as fresh passes.

### Initial document and preservation proof — before corrections

- Before correction, all 94 other tracked files were byte-identical. The subsequent correction changes `.gitattributes` and normalizes 41 text files only; it does not claim those normalized physical bytes are unchanged. All 36 local evidence files and all 16 public/font assets retain their original byte counts/SHA-256.
- All **five relative Markdown links/anchors** resolve. All **23 literal local path references**, after interpreting line-number suffixes and excluding illustrative path shorthand/globs, exist. The three QA JSONs and four full-page captures remain local and are not Markdown hyperlinks. There are **zero evidence hyperlinks**.
- External references were checked through fresh GitHub API/project/file reads and official license/Socket/GitHub documentation during the review. The production Phoenix HTML was observed. API evidence links may require authorized access; access limits are disclosed rather than treated as passing integrations. No unprovided video/design URL is represented as a working link.
- At the end of local correction, branch was `chore/docs-ci-security-review`, HEAD `c90101bdaf108edb8419ded5cb44ffdf0a37130b`. Pending files were `.gitattributes`, `.gitignore`, README, this report, and `.github/workflows/ci.yml`. Normalized source/package text had no logical Git diff. The publication commit is identified by the PR's head SHA, not this starting HEAD.
- Before publication staging, the index held exactly 36 evidence deletions and no other staged change. All 36 paths passed `git check-ignore`, with zero tracked evidence and physical bytes preserved. Publication stages the reviewed correction/docs files alongside these existing removals; it does not restore or delete local evidence.

**Not verified:** Socket installation/coverage/granted permissions/execution, Vercel dashboard settings/permission scope, historical Git or dependency secret safety, physical mobile/Safari behavior, and fresh WebGL/performance benchmarks. The absence of detected credentials or visible Socket alerts is not a safety guarantee.

Additional read-only authentication check: browser relay attachment targeted only existing `github.com/settings/installations` and `vercel.com` tabs, with no navigation or account-setting action. Both attempts timed out after 15 seconds without returning an attached session. No cookies, credentials, or screenshots were read. This does not prove those integrations are absent; it confirms that authenticated UI evidence was unavailable through those attempts.

## Requested quality reviews

- **`deslop`:** reviewed the branch diff and full new workflow/attributes. No new application functions, guards, casts, nesting, logging, or abstraction were introduced. Version comments identify otherwise opaque action SHA pins and remain useful. Obsolete documentation claims were corrected; no unrelated production code was cleaned up.
- **`thermo-nuclear-code-quality-review`:** this is the installed skill corresponding to the requested `thermo-quality-review`. The review found no scoped structural regression: one 27-line job, two attribute lines, no file crossing 1,000 lines, no helper/bootstrap script, no matrix, no duplicated quality jobs, and no logic outside its canonical configuration layer. Reading Node/npm pins from existing files avoids a second version convention.
- Native YAML parsing confirmed ordinary PR/main-push triggers, exactly one `quality` job, read-only contents permission, no persisted checkout credentials, and the existing install/check/build sequence. The required check context matches the job ID. YAML inspection alone establishes no remote run result; the PR checks are the source for published execution.
