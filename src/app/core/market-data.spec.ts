import { TestBed } from '@angular/core/testing';

import { INITIAL_BROKERS, INITIAL_RATES } from './initial-data';
import { MarketData } from './market-data';
import { TEST_BROKERS, TEST_RATES } from './test-fixtures';

describe('MarketData broker-scoped selectors', () => {
    let marketData: MarketData;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                { provide: INITIAL_BROKERS, useValue: TEST_BROKERS },
                { provide: INITIAL_RATES, useValue: TEST_RATES },
            ],
        });
        marketData = TestBed.inject(MarketData);
    });

    describe('quotesForBroker', () => {
        it('returns every symbol the broker streams and nothing else', () => {
            const symbols = marketData.quotesForBroker('exness').map((q) => q.symbol);
            expect(symbols).toContain('EURUSD');
            expect(symbols).toContain('GBPUSD');
            expect(symbols).toContain('BTCAUDm');
            expect(symbols.length).toBe(3);
        });

        it('does not leak another broker’s quotes', () => {
            const brokers = new Set(marketData.quotesForBroker('fxpro').map((q) => q.broker_id));
            expect([...brokers]).toEqual(['fxpro']);
        });

        it('orders by asset-class group, catch-all last', () => {
            const symbols = marketData.quotesForBroker('exness').map((q) => q.symbol);
            expect(symbols).toEqual(['EURUSD', 'GBPUSD', 'BTCAUDm']);
        });

        it('returns nothing for an unknown broker', () => {
            expect(marketData.quotesForBroker('nope')).toEqual([]);
        });
    });

    describe('quoteFor', () => {
        it('returns the broker’s own quote with its spread', () => {
            const quote = marketData.quoteFor('exness', 'EURUSD');
            expect(quote?.broker_name).toBe('Exness');
            expect(quote?.bid).toBe(1.14408);
            expect(quote?.ask).toBe(1.14417);
            expect(quote?.spread).toBe(0.00009);
        });

        it('returns undefined for a symbol the broker does not quote', () => {
            expect(marketData.quoteFor('fxpro', 'BTCAUDm')).toBeUndefined();
        });
    });

    describe('rankFor', () => {
        it('ranks the tightest spread first', () => {
            // Exness quotes EUR/USD at 0.00009, FxPro at 0.00015.
            expect(marketData.rankFor('exness', 'EURUSD')).toEqual({ rank: 1, total: 2 });
            expect(marketData.rankFor('fxpro', 'EURUSD')).toEqual({ rank: 2, total: 2 });
        });

        it('reports a sole quoting broker as first of one', () => {
            expect(marketData.rankFor('exness', 'BTCAUDm')).toEqual({ rank: 1, total: 1 });
        });

        it('returns undefined when the broker does not quote the symbol', () => {
            expect(marketData.rankFor('fxpro', 'GBPUSD')).toBeUndefined();
        });
    });

    describe('slug resolution', () => {
        it('resolves broker slugs case-insensitively', () => {
            expect(marketData.resolveBrokerSlug('exness')).toBe('exness');
            expect(marketData.resolveBrokerSlug('Exness')).toBe('exness');
            expect(marketData.resolveBrokerSlug('EXNESS')).toBe('exness');
        });

        it('returns undefined for an unknown broker slug', () => {
            expect(marketData.resolveBrokerSlug('nosuchbroker')).toBeUndefined();
        });

        it('resolves a lowercase slug back to the broker’s own casing', () => {
            expect(marketData.resolveSymbolSlug('exness', 'btcaudm')).toBe('BTCAUDm');
            expect(marketData.resolveSymbolSlug('exness', 'eurusd')).toBe('EURUSD');
            expect(marketData.resolveSymbolSlug('exness', 'EURUSD')).toBe('EURUSD');
        });

        it('returns undefined for symbols the broker does not stream', () => {
            expect(marketData.resolveSymbolSlug('exness', 'xauusd')).toBeUndefined();
            expect(marketData.resolveSymbolSlug('nosuchbroker', 'eurusd')).toBeUndefined();
        });
    });

    describe('spreadHistory', () => {
        it('accumulates a bounded series from live ticks', () => {
            expect(marketData.spreadHistory('EURUSD', 'exness')).toEqual([]);

            for (let i = 0; i < 30; i++) {
                marketData['upsertRate']({
                    type: 'tick',
                    broker: 'exness',
                    symbol: 'EURUSD',
                    data: TEST_RATES['exness']['EURUSD'],
                });
            }

            const history = marketData.spreadHistory('EURUSD', 'exness');
            expect(history.length).toBe(24);
            expect(history[0]).toBe(0.00009);
        });
    });
});
