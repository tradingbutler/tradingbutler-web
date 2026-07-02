import { InjectionToken } from '@angular/core';

export const RATES_ENDPOINT_DEFAULT = '/ws';

export const RATES_ENDPOINT = new InjectionToken<string>('RATES_ENDPOINT', {
    factory: () => RATES_ENDPOINT_DEFAULT,
});
