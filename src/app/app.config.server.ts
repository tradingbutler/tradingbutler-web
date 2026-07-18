import {
    inject,
    makeStateKey,
    mergeApplicationConfig,
    ApplicationConfig,
    REQUEST_CONTEXT,
    TransferState,
} from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';
import { BrokerRecord } from './core/broker-registry';
import { INITIAL_BROKERS, INITIAL_RATES, SSRRequestContext } from './core/initial-data';
import { RatesSnapshot } from './core/rate-registry';
import { RATES_ENDPOINT, RATES_ENDPOINT_DEFAULT } from './core/rates-endpoint';

const RATES_ENDPOINT_KEY = makeStateKey<string>('RATES_ENDPOINT');
const INITIAL_BROKERS_KEY = makeStateKey<Record<string, BrokerRecord>>('INITIAL_BROKERS');
const INITIAL_RATES_KEY = makeStateKey<RatesSnapshot>('INITIAL_RATES');

const serverConfig: ApplicationConfig = {
    providers: [
        provideServerRendering(withRoutes(serverRoutes)),
        {
            provide: RATES_ENDPOINT,
            useFactory: () => {
                const ts = inject(TransferState);
                const value = process.env['RATES_ENDPOINT'] ?? RATES_ENDPOINT_DEFAULT;
                ts.set(RATES_ENDPOINT_KEY, value);
                return value;
            },
        },
        {
            provide: INITIAL_BROKERS,
            useFactory: () => {
                const ts = inject(TransferState);
                const ctx = inject(REQUEST_CONTEXT) as SSRRequestContext | undefined;
                const value = ctx?.brokers ?? {};
                ts.set(INITIAL_BROKERS_KEY, value);
                return value;
            },
        },
        {
            provide: INITIAL_RATES,
            useFactory: () => {
                const ts = inject(TransferState);
                const ctx = inject(REQUEST_CONTEXT) as SSRRequestContext | undefined;
                const value = ctx?.rates ?? {};
                ts.set(INITIAL_RATES_KEY, value);
                return value;
            },
        },
    ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
