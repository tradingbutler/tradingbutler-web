import { InjectionToken } from '@angular/core';

export const RATES_ENDPOINT_DEFAULT = 'ws://localhost:20002/ws';

export const RATES_ENDPOINT = new InjectionToken<string>('RATES_ENDPOINT', {
    factory: () => RATES_ENDPOINT_DEFAULT,
});
