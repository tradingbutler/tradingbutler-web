import { Routes } from '@angular/router';
import { Home } from './home/home';

/**
 * Site routes.
 *
 * `/{broker}` and `/{broker}/{symbol}` sit directly at the root — they are
 * landing pages meant to be typed and shared, so they get the shortest URL we
 * can give them. Both slugs are canonically lowercase and resolved
 * case-insensitively against the live feed (see `MarketData.resolveBrokerSlug`
 * / `resolveSymbolSlug`); anything that doesn't resolve renders the not-found
 * panel rather than redirecting.
 *
 * The broker pages are lazily loaded so the home page — by far the most
 * requested route — doesn't carry their code.
 */
export const routes: Routes = [
    { path: '', component: Home, pathMatch: 'full' },
    {
        path: ':broker',
        loadComponent: () => import('./broker/broker-page').then((m) => m.BrokerPage),
    },
    {
        path: ':broker/:symbol',
        loadComponent: () => import('./broker/broker-symbol-page').then((m) => m.BrokerSymbolPage),
    },
];
