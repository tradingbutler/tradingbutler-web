import { inject, makeStateKey, ApplicationConfig, TransferState } from '@angular/core';
import { provideBrowserGlobalErrorListeners } from '@angular/core';
import {
    provideClientHydration,
    withEventReplay,
    withNoIncrementalHydration,
} from '@angular/platform-browser';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { routes } from './app.routes';
import { BrokerRecord } from './core/broker-registry';
import { INITIAL_BROKERS, INITIAL_RATES } from './core/initial-data';
import { RatesSnapshot } from './core/rate-registry';
import { RATES_ENDPOINT, RATES_ENDPOINT_DEFAULT } from './core/rates-endpoint';

const RATES_ENDPOINT_KEY = makeStateKey<string>('RATES_ENDPOINT');
const INITIAL_BROKERS_KEY = makeStateKey<Record<string, BrokerRecord>>('INITIAL_BROKERS');
const INITIAL_RATES_KEY = makeStateKey<RatesSnapshot>('INITIAL_RATES');

export const appConfig: ApplicationConfig = {
    providers: [
        provideBrowserGlobalErrorListeners(),
        provideClientHydration(withEventReplay(), withNoIncrementalHydration()),
        provideHttpClient(withFetch()),
        // `withComponentInputBinding()` binds :broker/:symbol straight to the
        // page components' `input()`s; `anchorScrolling` keeps the header's
        // "/#compare" links working when they're followed from a broker page.
        provideRouter(
            routes,
            withComponentInputBinding(),
            withInMemoryScrolling({
                anchorScrolling: 'enabled',
                scrollPositionRestoration: 'enabled',
            }),
        ),
        {
            provide: RATES_ENDPOINT,
            useFactory: () => {
                const ts = inject(TransferState);
                return ts.get(RATES_ENDPOINT_KEY, RATES_ENDPOINT_DEFAULT);
            },
        },
        {
            provide: INITIAL_BROKERS,
            useFactory: () => {
                const ts = inject(TransferState);
                return ts.get(INITIAL_BROKERS_KEY, {});
            },
        },
        {
            provide: INITIAL_RATES,
            useFactory: () => {
                const ts = inject(TransferState);
                return ts.get(INITIAL_RATES_KEY, {});
            },
        },
    ],
};
