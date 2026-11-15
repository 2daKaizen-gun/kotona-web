# KOTONA Web

Frontend for [kotona-analyzer](https://github.com/2daKaizen-gun/kotona-analyzer), a Japanese business message analyzer that reads the 本音 (true intent) behind the 建前 (public face).

Next.js 16 (App Router) · TypeScript 6 · Tailwind CSS 4

Live: https://kotona-web.vercel.app/ — runs in [demo mode](#demo-mode) because the backend is not hosted. Results there are recorded samples, and every page says so.

## Getting started

Start the backend first.

```bash
# 1) Backend (kotona-analyzer repo)
docker compose up -d --build          # app on :8081, MySQL on :3307

# 2) Frontend
cp .env.local.example .env.local
npm install
npm run dev                            # http://localhost:3000
```

Node 24 is pinned in `.nvmrc`.

| Variable | Default | Notes |
|---|---|---|
| `KOTONA_API_URL` | `http://localhost:8081` | Backend URL |
| `KOTONA_API_KEY` | *(empty)* | Only if the backend sets `API_KEY` |
| `KOTONA_DEMO` | *(empty)* | `true` serves recorded samples instead of calling the backend |
| `KOTONA_SITE_PASSWORD` | *(empty)* | HTTP Basic password for every page and `/api/*` (any user name). Set it on any public deployment that has `KOTONA_API_KEY`, because the route handlers add the key for whoever calls them |

## Pages

| Path | What it does |
|---|---|
| `/` | Analyze a sentence: score, risk, 本音 / 建前, smart replies |
| `/history` | Past analyses, newest first, 20 at a time. Expanding a row fetches its stored result. Delete needs a second click |
| `/phrases` | Business phrase dictionary with a situation filter. Add, edit, delete |

Deleting a phrase is permanent, including the default ones.

## Architecture

The browser never calls the backend directly.

```
Browser  ──▶  Next.js route handler  ──▶  Spring Boot  ──▶  Gemini
              (/api/*, server-only,        (:8081)
               holds the API key)
```

The backend requires `X-API-KEY` on `/analyze`, `/api/history` and dictionary writes. If the browser sent it, the key would be in the JS bundle. So `src/app/api/*` handlers read `KOTONA_API_KEY` on the server (no `NEXT_PUBLIC_` prefix), and all backend calls go through `src/lib/backend.ts`.

## Types come from the backend

`src/types/api.d.ts` is generated from the backend's OpenAPI spec. Don't edit it.

```bash
curl http://localhost:8081/v3/api-docs -o openapi/kotona-api.json
npm run gen:types
```

The generator runs through `npx` at a pinned version instead of being a dependency, because it declares `typescript: ^5.x`.

## Demo mode

With `KOTONA_DEMO=true`, reads return fixtures from `src/lib/demo-data.ts` (real analyzer output) and writes return 403 with a reason. An amber banner sits above the navigation on every page, and the result card has a "샘플" chip so a screenshot still shows it is a sample.

It is an explicit flag, not an automatic fallback. Falling back when the backend is down would show sample data as if it were real. A configured backend that doesn't answer returns an error.

`KOTONA_DEMO` is read at build time for the prerendered pages. See [DEPLOYMENT.md](DEPLOYMENT.md).

The fixtures were recorded before `scoreAdjustments` existed, so the live demo doesn't show that section.

## About the score

The score is a model's judgement with a rule layer on top. **이 점수가 나온 과정** on the result card lists every rule adjustment (metric, before, after, reason).

The risk grade is the more severe of the rules and the model. The rules raise no false alarm on the 27 safe sentences in the labelled set, but the model can, and its warning is what the card shows. On the 41 labelled sentences the shown grade matches the label 37 times; the 4 misses are all more severe, none less. Details: [kotona-analyzer `docs/EVALUATION.md`](https://github.com/2daKaizen-gun/kotona-analyzer/blob/main/docs/EVALUATION.md), [`docs/SCORE_PATH.md`](https://github.com/2daKaizen-gun/kotona-analyzer/blob/main/docs/SCORE_PATH.md).

## The wait

Analysis usually takes 20–30 s, 79 s at worst. Most of it is generating three replies and two alternatives in Japanese and Korean, plus model thinking at `thinking-level: high`. At `low`, two of every three replies were discarded for mixing in Korean or English (see the backend's `PROMPT_DESIGN.md`), so it stays at `high`.

`ProgressIndicator` shows the backend's stages on measured timings (the server doesn't stream progress). The analyze route sets `maxDuration = 120`, and `backend.ts` aborts at 110 s so our message arrives before the platform cuts the request.

## Tests

| What | Result | Command |
|---|---|---|
| Unit tests | 175 | `npm test` |
| Browser tests | 12 (Chromium) | `npm run test:e2e` (production build in demo mode on :3100) |
| Coverage | 94% lines, 85% branches | `npm run test:coverage` (floors in `vitest.config.mts`) |
| Type errors | 0 | `npm run typecheck` (`next typegen && tsc --noEmit`) |
| Lint | 0 | `npm run lint` |
| Vulnerabilities in shipped deps | 0 | `npm audit --omit=dev` |

CI (`.github/workflows/ci.yml`) runs all of these on every push to `main` and every PR.

- Route handlers are tested against a stubbed backend (`src/app/api/__tests__/routes.test.ts`). Demo mode never takes that path, so nothing else covers it.
- `limits.test.ts` compares `src/lib/limits.ts` with the `maxLength` values in `openapi/kotona-api.json`.
- CI does not check that the checked-in spec matches the current backend (that needs Spring Boot and MySQL in the workflow). Regenerate it after backend DTO changes.
- Run `npx playwright install chromium` once before the browser tests.

On Windows, if the user profile path has non-ASCII characters, Playwright can crash silently (`0xC0000409`) compiling specs with Korean or Japanese text. Move its cache:

```bash
PWTEST_CACHE_DIR=C:/pw-cache npm run test:e2e
```

TypeScript stays on 6 and ESLint on 9 (Dependabot ignores their next majors): `typescript-eslint` doesn't load on TypeScript 7 yet, and `eslint-plugin-react` uses `context.getFilename()`, removed in ESLint 10. Remove the entries in `.github/dependabot.yml` when upstream catches up.

## Layout

```
src/
  app/
    api/            route handlers (server-only, hold the API key)
    page.tsx        analyze
    history/        history
    phrases/        dictionary
  components/       AnalyzeForm, ResultView, ProgressIndicator, HistoryList,
                    PhraseDictionary, PhraseForm, SiteNav, DemoBanner
  lib/backend.ts    all backend calls (server-only)
  lib/demo-data.ts  demo fixtures
  lib/limits.ts     input limits
  lib/request-params.ts  query/path parsing for handlers
  lib/situations.ts situation labels (client-safe)
  types/api.d.ts    generated
e2e/                Playwright tests
openapi/            checked-in backend spec
```

## Related

- [kotona-analyzer](https://github.com/2daKaizen-gun/kotona-analyzer): backend
- Hosting options for the backend: [`docs/HOSTING.md`](https://github.com/2daKaizen-gun/kotona-analyzer/blob/main/docs/HOSTING.md)
- Tracking issue: [kotona-analyzer#27](https://github.com/2daKaizen-gun/kotona-analyzer/issues/27)

## License

MIT, see [`LICENSE`](LICENSE).
