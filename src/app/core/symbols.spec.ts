import { SYMBOL_GROUP_ORDER, groupFor, iconOrFallback, labelFor } from './symbols';

describe('symbol metadata fallbacks', () => {
    it('uses the pretty label and asset class for known symbols', () => {
        expect(labelFor('EURUSD')).toBe('EUR/USD');
        expect(groupFor('EURUSD')).toBe('Majors');
    });

    it('falls back to the raw code for broker-specific symbols', () => {
        // Brokers stream their own instrument names; never invent a separator.
        expect(labelFor('BTCAUDm')).toBe('BTCAUDm');
        expect(groupFor('BTCAUDm')).toBe('Other');
    });

    it('orders the catch-all group last', () => {
        expect(SYMBOL_GROUP_ORDER[0]).toBe('Majors');
        expect(SYMBOL_GROUP_ORDER.at(-1)).toBe('Other');
    });

    it('returns the curated badge for known symbols', () => {
        expect(iconOrFallback('EURUSD').short).toBe('€');
    });

    it('generates a badge for unknown symbols', () => {
        const icon = iconOrFallback('BTCAUDm');
        expect(icon.short).toBe('BTC');
        expect(icon.bg).toContain('gradient');
    });

    it('generates the same badge every time for the same code', () => {
        // A random or time-dependent fallback would render differently on the
        // server and in the browser, producing a hydration mismatch.
        expect(iconOrFallback('BTCAUDm')).toEqual(iconOrFallback('BTCAUDm'));
        expect(iconOrFallback('BTCAUDm').bg).not.toEqual(iconOrFallback('XYZABC').bg);
    });
});
