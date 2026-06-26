import { inject, makeStateKey, mergeApplicationConfig, ApplicationConfig, TransferState } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';
import { RATES_ENDPOINT, RATES_ENDPOINT_DEFAULT } from './core/rates-endpoint';

const RATES_ENDPOINT_KEY = makeStateKey<string>('RATES_ENDPOINT');

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
    ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
