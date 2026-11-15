# Deployment

The frontend is deployed on Vercel. The backend is not hosted yet: it needs about 320 MB of memory, real MySQL 8, and requests of up to 100 s. Some free tiers can hold that; options are in [kotona-analyzer `docs/HOSTING.md`](https://github.com/2daKaizen-gun/kotona-analyzer/blob/main/docs/HOSTING.md) ([#27](https://github.com/2daKaizen-gun/kotona-analyzer/issues/27)).

Until then the site runs in demo mode: recorded samples, a banner on every page, and writes refused.

## Vercel

Import `2daKaizen-gun/kotona-web` in the Vercel dashboard. The detected defaults work as is.

Set one environment variable for all environments:

| Name | Value |
|---|---|
| `KOTONA_DEMO` | `true` |

`KOTONA_API_URL` and `KOTONA_API_KEY` stay unset.

### `KOTONA_DEMO` is read at build time

`/`, `/history` and `/phrases` are prerendered, so the banner is baked into the HTML at build time, while `/api/*` reads the variable per request. If the variable is set after a build, the API serves samples but the pages have no banner. Set it before the first deploy, and redeploy whenever it changes.

## Switching to a real backend

Only environment variables change:

1. `KOTONA_API_URL`: the backend's public URL
2. `KOTONA_API_KEY`: same as the backend's `API_KEY`
3. `KOTONA_SITE_PASSWORD`: required, because the route handlers forward the key for any caller. Visitors get the browser's sign-in prompt; the user name is ignored
4. Remove `KOTONA_DEMO`
5. On the backend, set `CORS_ALLOWED_ORIGINS` to the Vercel domain
6. Redeploy (build-time read above)
