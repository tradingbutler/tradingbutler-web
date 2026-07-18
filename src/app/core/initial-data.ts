import { InjectionToken } from '@angular/core';
import { BrokerRecord } from './broker-registry';
import { RatesSnapshot } from './rate-registry';

/** Shape of the `requestContext` `src/server.ts` passes into
 *  `AngularNodeAppEngine.handle()` — the brokers/rates snapshot it read off
 *  disk for this request, surfaced to the app via `REQUEST_CONTEXT`. */
export interface SSRRequestContext {
    brokers: Record<string, BrokerRecord>;
    rates: RatesSnapshot;
}

/** Broker registry snapshot the SSR server read off disk for this request,
 *  passed through `TransferState` so the client hydrates with it instead of
 *  refetching. Empty outside of SSR (e.g. plain `ng serve`). */
export const INITIAL_BROKERS = new InjectionToken<Record<string, BrokerRecord>>('INITIAL_BROKERS', {
    factory: () => ({}),
});

/** Rates snapshot the SSR server read off disk for this request, passed
 *  through `TransferState` so the client hydrates with it instead of
 *  refetching. Empty outside of SSR (e.g. plain `ng serve`). */
export const INITIAL_RATES = new InjectionToken<RatesSnapshot>('INITIAL_RATES', {
    factory: () => ({}),
});
