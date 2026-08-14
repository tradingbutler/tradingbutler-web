import { BrokerRecord } from './broker-registry';
import { RateRecord, RatesSnapshot } from './rate-registry';

/**
 * Shared seed data for specs. Imported only by `.spec.ts` files, so it never
 * reaches an application bundle.
 *
 * Providing `INITIAL_BROKERS`/`INITIAL_RATES` with these gives a fully
 * populated `MarketData` without any HTTP or WebSocket activity, which is the
 * seam the per-broker pages are easiest to test through.
 */
export function rate(symbol: string, bid: number, ask: number, digits: number): RateRecord {
    return {
        d: [],
        i: [16385, digits],
        s: symbol,
        t: 'h1',
        x: {
            tick: { a: ask, b: bid, f: digits, l: 0, m: 1783109337062, r: 0, t: 1783109337, v: 0 },
        },
    };
}

export const TEST_BROKERS: Record<string, BrokerRecord> = {
    exness: {
        id: 'exness',
        name: 'Exness',
        open_account_url: 'https://example.test/exness',
        logo: 'data:image/png;base64,AAAA',
    },
    fxpro: {
        id: 'fxpro',
        name: 'FxPro',
        open_account_url: 'https://example.test/fxpro',
        logo: 'data:image/png;base64,BBBB',
    },
};

/**
 * Note `BTCAUDm`: a broker-native code that is deliberately absent from
 * `SYMBOL_LIST`, with the mixed casing real feeds use. The per-broker pages
 * have to render it and resolve `/exness/btcaudm` to it.
 */
export const TEST_RATES: RatesSnapshot = {
    exness: {
        EURUSD: rate('EURUSD', 1.14408, 1.14417, 5),
        GBPUSD: rate('GBPUSD', 1.33563, 1.33572, 5),
        BTCAUDm: rate('BTCAUDm', 33087.1, 33114.5, 1),
    },
    fxpro: {
        // A wider EUR/USD spread than Exness, so ranking order is unambiguous.
        EURUSD: rate('EURUSD', 1.14405, 1.1442, 5),
    },
};
