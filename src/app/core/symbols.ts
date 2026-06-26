export type AssetClass = 'Majors' | 'Metals' | 'Crypto' | 'Energy' | 'Indices';

export interface SymbolMeta {
    code: string;
    label: string;
    assetClass: AssetClass;
    /** Reference price used to seed the UI simulation. */
    basePrice: number;
    /** Decimal places used to display this instrument's price and spread. */
    decimals: number;
}

/**
 * Mirrors the hardcoded v1 roster in api/crates/core/src/lib.rs::SYMBOLS.
 * Keeps the dropdown and markets-table grouping populated even before any
 * live ticks have arrived for a given symbol. `basePrice` seeds the
 * client-side simulation (used while there is no backend feed).
 */
export const SYMBOL_LIST: SymbolMeta[] = [
    { code: 'EURUSD', label: 'EUR/USD', assetClass: 'Majors', basePrice: 1.085, decimals: 5 },
    { code: 'GBPUSD', label: 'GBP/USD', assetClass: 'Majors', basePrice: 1.27, decimals: 5 },
    { code: 'USDJPY', label: 'USD/JPY', assetClass: 'Majors', basePrice: 157.4, decimals: 3 },
    { code: 'AUDUSD', label: 'AUD/USD', assetClass: 'Majors', basePrice: 0.665, decimals: 5 },
    { code: 'USDCAD', label: 'USD/CAD', assetClass: 'Majors', basePrice: 1.37, decimals: 5 },
    { code: 'XAUUSD', label: 'XAU/USD', assetClass: 'Metals', basePrice: 2400, decimals: 2 },
    { code: 'XAGUSD', label: 'XAG/USD', assetClass: 'Metals', basePrice: 29.5, decimals: 3 },
    { code: 'BTCUSD', label: 'BTC/USD', assetClass: 'Crypto', basePrice: 67000, decimals: 1 },
    { code: 'ETHUSD', label: 'ETH/USD', assetClass: 'Crypto', basePrice: 3500, decimals: 2 },
    { code: 'WTIUSD', label: 'WTI/USD', assetClass: 'Energy', basePrice: 78.5, decimals: 2 },
    { code: 'SPX500', label: 'SPX500', assetClass: 'Indices', basePrice: 5430, decimals: 1 },
    { code: 'NAS100', label: 'NAS100', assetClass: 'Indices', basePrice: 19500, decimals: 1 },
];

export const ASSET_CLASS_ORDER: AssetClass[] = ['Majors', 'Metals', 'Crypto', 'Energy', 'Indices'];

const DECIMALS = new Map(SYMBOL_LIST.map((s) => [s.code, s.decimals]));

/** DecimalPipe digitsInfo string for a symbol, e.g. "1.5-5". Falls back to 2dp. */
export function digitsFor(code: string): string {
    const d = DECIMALS.get(code) ?? 2;
    return `1.${d}-${d}`;
}
