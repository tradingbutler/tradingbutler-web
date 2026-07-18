import {
    AngularNodeAppEngine,
    createNodeRequestHandler,
    isMainModule,
    writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { SSRRequestContext } from './app/core/initial-data';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

/**
 * Proxy /api and /ws to the Rust API service so the browser only ever
 * talks to this one origin (API_ORIGIN points at the api container in
 * docker-compose, e.g. http://api:8080).
 */
const apiOrigin = process.env['API_ORIGIN'] || 'http://localhost:8080';
const apiProxy = createProxyMiddleware({
    pathFilter: ['/api', '/ws'],
    target: apiOrigin,
    changeOrigin: true,
    ws: true,
});
app.use(apiProxy);

/**
 * json-writer writes these two files (atomically) on its own cadence, outside
 * this process — paths default to the `public/*` sample copies when no env
 * vars are set, and point at the shared `rates-data` volume in production.
 * Two candidate roots because `import.meta.dirname` isn't stable across
 * entry points: under `ng serve`'s Vite dev SSR it resolves to a transient
 * `.angular/vite-root/...` path (no files there), so prefer `public/` next
 * to the working directory (true for `ng serve` and `serve:ssr:web`, both
 * run from `web/`) and fall back to the build output next to this file
 * (true for the Docker image, which has no top-level `public/`).
 */
function defaultJsonPath(name: string): string {
    const fromCwd = join(process.cwd(), 'public', name);
    return existsSync(fromCwd) ? fromCwd : join(browserDistFolder, name);
}
const ratesJsonPath = process.env['RATES_JSON_PATH'] || defaultJsonPath('rates.json');
const brokersJsonPath = process.env['BROKERS_JSON_PATH'] || defaultJsonPath('brokers.json');

async function readJsonSnapshot<T>(path: string, fallback: T): Promise<T> {
    try {
        return JSON.parse(await readFile(path, 'utf-8')) as T;
    } catch (err) {
        console.error(`[server] failed to read ${path}`, err);
        return fallback;
    }
}

async function readSSRContext(): Promise<SSRRequestContext> {
    const [brokers, rates] = await Promise.all([
        readJsonSnapshot(brokersJsonPath, {}),
        readJsonSnapshot(ratesJsonPath, {}),
    ]);
    return { brokers, rates };
}

/**
 * Serve the live brokers/rates snapshots the browser polls for and that SSR
 * below preloads into the initial render. Registered ahead of the static
 * middleware so these always reflect the current file, not the 1y-cached
 * build-time copies under /browser; `no-store` for the same reason.
 */
app.get('/brokers.json', (_req, res, next) => {
    readJsonSnapshot(brokersJsonPath, undefined)
        .then((data) =>
            data === undefined ? next() : res.set('Cache-Control', 'no-store').json(data),
        )
        .catch(next);
});
app.get('/rates.json', (_req, res, next) => {
    readJsonSnapshot(ratesJsonPath, undefined)
        .then((data) =>
            data === undefined ? next() : res.set('Cache-Control', 'no-store').json(data),
        )
        .catch(next);
});

/**
 * Serve static files from /browser
 */
app.use(
    express.static(browserDistFolder, {
        maxAge: '1y',
        index: false,
        redirect: false,
    }),
);

/**
 * Handle all other requests by rendering the Angular application, preloaded
 * with the current brokers/rates snapshot so the first response already has
 * real data (see app.config.server.ts, which reads this via REQUEST_CONTEXT).
 */
app.use((req, res, next) => {
    readSSRContext()
        .then((requestContext) => angularApp.handle(req, requestContext))
        .then((response) => (response ? writeResponseToNodeResponse(response, res) : next()))
        .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
    const port = process.env['PORT'] || 4000;
    const server = app.listen(port, (error) => {
        if (error) {
            throw error;
        }

        console.log(`Node Express server listening on http://localhost:${port}`);
    });
    server.on('upgrade', apiProxy.upgrade);
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
