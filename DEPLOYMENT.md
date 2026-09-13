# Deployment

The frontend is deployed on its own. The backend is not hosted — it is a JVM
service with a MySQL database and requests that run up to 79 seconds, which is a
paid hosting shape. See [kotona-analyzer#27](https://github.com/2daKaizen-gun/kotona-analyzer/issues/27).

So the deployed site runs in **demo mode**: prepared samples, an amber banner on
every page saying so, and writes refused rather than faked.

## Vercel

Import `2daKaizen-gun/kotona-web` in the Vercel dashboard. Framework detection,
build command and output directory all need no changes.

Set one environment variable, for **all** environments:

| Name | Value |
|---|---|
| `KOTONA_DEMO` | `true` |

That is the whole configuration. `KOTONA_API_URL` and `KOTONA_API_KEY` stay unset
— in demo mode nothing reaches out.

### `KOTONA_DEMO` is read at build time

`/`, `/history` and `/phrases` are statically prerendered, so the banner is baked
into the HTML when the site is built. Route handlers under `/api/*` read the
variable at request time instead.

Setting the variable *after* a build therefore produces the worst possible state:
the API serves samples while the pages carry no banner — invented data with
nothing saying it is invented. Vercel exposes project environment variables
during the build, so setting it before the first deploy is enough; if it is ever
added or changed later, redeploy.

## Going live for real

When a backend exists, the same deployment becomes real by changing environment
variables only:

1. Set `KOTONA_API_URL` to the backend's public URL.
2. Set `KOTONA_API_KEY` to match the backend's `API_KEY`.
3. Remove `KOTONA_DEMO` (or set it to anything other than `true`).
4. Set `CORS_ALLOWED_ORIGINS` on the backend to the Vercel domain.
5. Redeploy — required, because of the build-time read above.

No code changes. Demo mode is an explicit flag rather than an automatic fallback
precisely so this switch is deliberate: a backend that goes down in production
returns an honest error instead of quietly serving samples as if they were real.
