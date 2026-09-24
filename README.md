# KOTONA Web

Frontend for [**kotona-analyzer**](https://github.com/2daKaizen-gun/kotona-analyzer) — a Japanese business communication analyzer that reads the 本音 (true intent) behind the 建前 (public face).

Next.js 16 (App Router) · TypeScript · Tailwind CSS 4

**Live: https://kotona-web.vercel.app/** — running in [demo mode](#demo-mode), since the backend is not hosted. The scores and replies there are prepared samples, and the site says so on every page.

## Getting started

The backend must be running first.

```bash
# 1) Start the backend (in the kotona-analyzer repo)
docker compose up -d --build          # app on :8081, MySQL on :3307

# 2) Start the frontend
cp .env.local.example .env.local
npm install
npm run dev                            # http://localhost:3000
```

Node 24 is pinned in `.nvmrc` (`nvm use` / `fnm use` pick it up); Next.js 16 needs at least 20.9, which `engines` in `package.json` records.

`.env.local` defaults work out of the box for local development:

| Variable | Default | Notes |
|---|---|---|
| `KOTONA_API_URL` | `http://localhost:8081` | Backend base URL |
| `KOTONA_API_KEY` | *(empty)* | Only needed if the backend sets `API_KEY` |
| `KOTONA_DEMO` | *(empty)* | `true` serves prepared samples instead of calling the backend |

## Pages

| Path | What it does |
|---|---|
| `/` | Analyze a sentence — score, risk, 本音 / 建前, smart replies |
| `/history` | Past analyses, newest first, 20 at a time behind a "더 보기" button. Expanding a row fetches that record's stored result on demand; delete with a second click |
| `/phrases` | Business phrase dictionary with a situation filter. Add, edit and delete entries |

Deleting a phrase is permanent, including the ones the backend ships with. They used to return on the next backend restart; that stopped when the seed became a Flyway repeatable migration, and this page said otherwise for a while.

## Demo mode

The deployed site has no backend behind it, so it runs on prepared samples.

Set `KOTONA_DEMO=true` and reads return fixtures from `src/lib/demo-data.ts` —
real analyser output, copied verbatim — while writes are refused with a 403 that
explains why. An amber banner sits above the navigation on every page saying the
data is a sample and nothing typed is stored.

That banner is what makes this honest rather than deceptive, and the reason it is
a coloured bar rather than a footnote. The result card carries a "샘플" chip too,
since a screenshot of just the score is how a demo actually gets shared.

It is an explicit flag, never an automatic fallback. Dropping into demo mode
whenever the backend is unreachable would mean a production outage quietly
serving invented analyses as real — the exact failure the feature exists to
prevent. A configured backend that does not answer still produces an error.

**`KOTONA_DEMO` is read at build time** for `/`, `/history` and `/phrases`, which
are statically prerendered. See [DEPLOYMENT.md](DEPLOYMENT.md).

## Architecture: why a BFF

The browser never calls the backend directly.

```
Browser  ──▶  Next.js route handler  ──▶  Spring Boot  ──▶  Gemini
              (/api/analyze)              (:8081)
              server-only — holds the API key
```

The backend protects `/analyze`, `/api/history` and dictionary writes (`POST` / `PUT` / `DELETE` on `/api/phrases`) with an `X-API-KEY` header; dictionary reads stay open. If the browser sent that header itself, the key would sit in the JavaScript bundle for anyone to read — security in appearance only.

Instead, `src/app/api/*` route handlers run server-side and read `KOTONA_API_KEY`. The absence of a `NEXT_PUBLIC_` prefix is what keeps it out of the client bundle. All backend calls are funnelled through `src/lib/backend.ts`, which is imported only by those handlers.

## Types come from the backend

`src/types/api.d.ts` is generated from the backend's OpenAPI spec — never edit it by hand.

```bash
curl http://localhost:8081/v3/api-docs -o openapi/kotona-api.json
npm run gen:types
```

The backend derives that spec from its `NuanceResponseDTO` record tree, so a field added in Java propagates to the frontend types by rerunning the two commands above. Nothing is typed twice.

The generator is run through `npx` at a version pinned in the `gen:types` script rather than installed. Nothing imports it — it writes a file and exits — and as a dependency it declares `typescript: ^5.x`, which held the whole repository's TypeScript back.

## The 25-second wait

Analysis usually takes 20–30 seconds, but the tail is long — 79 seconds is the slowest run observed. Most of the cost is output token generation: three smart replies plus two alternatives, written in Japanese and Korean.

The rest is model thinking, and that part is deliberate. The backend runs Gemini at `thinking-level: high`. At `low` the model code-switches mid-sentence and writes Japanese replies with Korean and English spliced in (`予算や schedule 面で`), which the backend then has to discard — two of every three replies were being thrown away. See `PROMPT_DESIGN.md` in [kotona-analyzer](https://github.com/2daKaizen-gun/kotona-analyzer) for the measurements. Speed here costs correctness, so it is not tuned down.

A bare spinner reads as a hang at that length, so `ProgressIndicator` walks through the stages the backend actually performs. The timings are measured estimates; the server does not stream progress.

Two consequences worth knowing:

- `maxDuration = 120` is set on the analyze route handler. The framework default would cut the request off first.
- `src/lib/backend.ts` uses a 110-second `AbortController` timeout — above the observed worst case, and below `maxDuration` so our own message reaches the user before the framework cuts in.

## Checks

GitHub Actions (`.github/workflows/ci.yml`) runs on every push to `main` and every pull request:

```bash
npm ci
npm run typecheck    # next typegen && tsc --noEmit
npm run lint
npm run build
npm test             # 138 unit tests — Vitest + Testing Library
npm run test:coverage  # the same, with coverage and its floor
npm run test:e2e     # 12 browser tests — Playwright, Chromium
```

`typecheck` runs `next typegen` first because globals such as `LayoutProps` and `RouteContext` only exist after Next.js generates them.

The unit tests cover every component, the demo fixtures, and the route handlers against a stubbed backend — that last part is the branch demo mode never takes, so nothing else in CI runs it. Coverage is measured on every run: 94% of lines, 85% of branches. CI writes the totals and the five least-covered files to the run summary, uploads the report, and fails below the floor in `vitest.config.mts`. `page.tsx` and `layout.tsx` are excluded, since server components cannot run meaningfully in jsdom and the browser tests cover what they do. One of them compares the input limits in `src/lib/limits.ts` with the `maxLength` values in the checked-in spec, so a limit changed on the backend fails here until the form follows. The browser tests in `e2e/` follow a visitor through analyse, history and dictionary against a production build in demo mode. They need no backend, so CI runs them as they are. Playwright builds and starts the site on port 3100 itself; run `npx playwright install chromium` once beforehand. When a browser test fails, CI uploads its trace as an artifact.

On Windows, if the user profile path contains non-ASCII characters, Playwright crashes silently (exit `0xC0000409`) when it compiles a spec containing Korean or Japanese text, because its compile cache lives under that profile. Move the cache:

```bash
PWTEST_CACHE_DIR=C:/pw-cache npm run test:e2e
```

**TypeScript stays on 6 and ESLint on 9**, and Dependabot is told not to offer their next majors. Neither is held back by this code: `typescript-eslint` refuses to load on TypeScript 7 and says it is tracking support for 7.1, and the `eslint-plugin-react` that `eslint-config-next` depends on calls `context.getFilename()`, which ESLint 10 removed. When either lands upstream, delete the matching entry in `.github/dependabot.yml`.

CI does not check that `api.d.ts` matches the backend — that would need Spring Boot and MySQL inside the workflow — so regenerate it by hand after backend DTO changes.

## Layout

```
src/
  app/
    api/            BFF route handlers — server-only, hold the API key
    page.tsx        analyze
    history/        analysis history
    phrases/        phrase dictionary
  components/       AnalyzeForm, ResultView, ProgressIndicator, HistoryList,
                    PhraseDictionary, PhraseForm, SiteNav, DemoBanner
  lib/backend.ts    every backend call lives here — server-only
  lib/demo-data.ts  demo-mode fixtures
  lib/limits.ts     input limits, checked against the backend spec
  lib/request-params.ts  query and path parsing shared by the handlers
  lib/situations.ts situation labels, safe to import from client components
  types/api.d.ts    generated — do not edit
e2e/                Playwright browser tests
openapi/            checked-in copy of the backend spec
```

## Related

- [kotona-analyzer](https://github.com/2daKaizen-gun/kotona-analyzer) — Spring Boot backend, analysis engine, Gemini integration
- Tracking issue: [kotona-analyzer#27](https://github.com/2daKaizen-gun/kotona-analyzer/issues/27)
