import { inject, makeStateKey, ApplicationConfig, TransferState } from '@angular/core';
import { provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { RATES_ENDPOINT, RATES_ENDPOINT_DEFAULT } from './core/rates-endpoint';

const RATES_ENDPOINT_KEY = makeStateKey<string>('RATES_ENDPOINT');

export const appConfig: ApplicationConfig = {
    providers: [
        provideBrowserGlobalErrorListeners(),
        provideClientHydration(withEventReplay()),
        provideHttpClient(withFetch()),
        {
            provide: RATES_ENDPOINT,
            useFactory: () => {
                const ts = inject(TransferState);
                return ts.get(RATES_ENDPOINT_KEY, RATES_ENDPOINT_DEFAULT);
            },
        },
    ],
};
