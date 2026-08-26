# KOTONA Web

Frontend for [**kotona-analyzer**](https://github.com/2daKaizen-gun/kotona-analyzer) — a Japanese business communication analyzer that reads the 本音 (true intent) behind the 建前 (public face).

Next.js 16 (App Router) · TypeScript · Tailwind CSS 4

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

`.env.local` defaults work out of the box for local development:

| Variable | Default | Notes |
|---|---|---|
| `KOTONA_API_URL` | `http://localhost:8081` | Backend base URL |
| `KOTONA_API_KEY` | *(empty)* | Only needed if the backend sets `API_KEY` |

## Architecture: why a BFF

The browser never calls the backend directly.

```
Browser  ──▶  Next.js route handler  ──▶  Spring Boot  ──▶  Gemini
              (/api/analyze)              (:8081)
              server-only — holds the API key
```

The backend protects `/analyze` and `/api/history` with an `X-API-KEY` header. If the browser sent that header itself, the key would sit in the JavaScript bundle for anyone to read — security in appearance only.

Instead, `src/app/api/*` route handlers run server-side and read `KOTONA_API_KEY`. The absence of a `NEXT_PUBLIC_` prefix is what keeps it out of the client bundle. All backend calls are funnelled through `src/lib/backend.ts`, which is imported only by those handlers.

## Types come from the backend

`src/types/api.d.ts` is generated from the backend's OpenAPI spec — never edit it by hand.

```bash
curl http://localhost:8081/v3/api-docs -o openapi/kotona-api.json
npx openapi-typescript openapi/kotona-api.json -o src/types/api.d.ts
```

The backend derives that spec from its `NuanceResponseDTO` record tree, so a field added in Java propagates to the frontend types by rerunning the two commands above. Nothing is typed twice.

## The 25-second wait

Analysis takes roughly 15–25 seconds. The cost is output token generation — three smart replies plus two alternatives, written in Japanese and Korean — not model thinking, so it cannot be tuned away without cutting the feature.

A bare spinner reads as a hang at that length, so `ProgressIndicator` walks through the stages the backend actually performs. The timings are measured estimates; the server does not stream progress.

Two consequences worth knowing:

- `maxDuration = 120` is set on the analyze route handler. The framework default would cut the request off first.
- `src/lib/backend.ts` uses a 90-second `AbortController` timeout, well above the observed worst case.

## Layout

```
src/
  app/
    api/            BFF route handlers — server-only, hold the API key
    page.tsx
  components/       AnalyzeForm, ResultView, ProgressIndicator
  lib/backend.ts    every backend call lives here
  types/api.d.ts    generated — do not edit
openapi/            checked-in copy of the backend spec
```

## Related

- [kotona-analyzer](https://github.com/2daKaizen-gun/kotona-analyzer) — Spring Boot backend, analysis engine, Gemini integration
- Tracking issue: [kotona-analyzer#27](https://github.com/2daKaizen-gun/kotona-analyzer/issues/27)
