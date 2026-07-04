export type AssetClass = 'Majors' | 'Metals' | 'Crypto' | 'Energy' | 'Indices';

/** Small round badge shown next to a symbol (its "image"). */
export interface SymbolIcon {
    /** 1–3 character glyph/text drawn inside the badge. */
    short: string;
    /** CSS background (solid or gradient). */
    bg: string;
    /** Text colour. */
    fg: string;
}

export interface SymbolMeta {
    code: string;
    label: string;
    assetClass: AssetClass;
    /** Reference price used to seed placeholder quotes before real ticks arrive. */
    basePrice: number;
    /** Decimal places used to display this instrument's price and spread. */
    decimals: number;
    /** Per-symbol badge used in the rich dropdowns and the markets tables. */
    icon: SymbolIcon;
}

/**
 * Mirrors the hardcoded v1 roster in api/crates/core/src/lib.rs::SYMBOLS.
 * Keeps the dropdown and markets-table grouping populated even before any
 * live ticks have arrived for a given symbol. `basePrice` seeds the static
 * placeholder quotes shown until a real broker tick replaces them.
 */
export const SYMBOL_LIST: SymbolMeta[] = [
    { code: 'EURUSD', label: 'EUR/USD', assetClass: 'Majors', basePrice: 1.085, decimals: 5, icon: { short: '€', bg: 'linear-gradient(135deg, #4a73d4, #2b4f9e)', fg: '#fff' } },
    { code: 'GBPUSD', label: 'GBP/USD', assetClass: 'Majors', basePrice: 1.27, decimals: 5, icon: { short: '£', bg: 'linear-gradient(135deg, #6b5fc7, #3f3a8f)', fg: '#fff' } },
    { code: 'USDJPY', label: 'USD/JPY', assetClass: 'Majors', basePrice: 157.4, decimals: 3, icon: { short: '¥', bg: 'linear-gradient(135deg, #d65a5a, #a8322f)', fg: '#fff' } },
    { code: 'AUDUSD', label: 'AUD/USD', assetClass: 'Majors', basePrice: 0.665, decimals: 5, icon: { short: 'A$', bg: 'linear-gradient(135deg, #2faa6a, #1c7048)', fg: '#fff' } },
    { code: 'USDCAD', label: 'USD/CAD', assetClass: 'Majors', basePrice: 1.37, decimals: 5, icon: { short: 'C$', bg: 'linear-gradient(135deg, #e07a5a, #b34a2f)', fg: '#fff' } },
    { code: 'XAUUSD', label: 'XAU/USD', assetClass: 'Metals', basePrice: 2400, decimals: 2, icon: { short: 'Au', bg: 'linear-gradient(135deg, #f4d27c, #cf9a2c)', fg: '#2a1c02' } },
    { code: 'XAGUSD', label: 'XAG/USD', assetClass: 'Metals', basePrice: 29.5, decimals: 3, icon: { short: 'Ag', bg: 'linear-gradient(135deg, #e4e8f0, #b6bece)', fg: '#1a1d23' } },
    { code: 'BTCUSD', label: 'BTC/USD', assetClass: 'Crypto', basePrice: 67000, decimals: 1, icon: { short: '₿', bg: 'linear-gradient(135deg, #f9a83a, #e8830f)', fg: '#fff' } },
    { code: 'ETHUSD', label: 'ETH/USD', assetClass: 'Crypto', basePrice: 3500, decimals: 2, icon: { short: 'Ξ', bg: 'linear-gradient(135deg, #8aa0f0, #4a63c0)', fg: '#fff' } },
    { code: 'WTIUSD', label: 'WTI/USD', assetClass: 'Energy', basePrice: 78.5, decimals: 2, icon: { short: 'WTI', bg: 'linear-gradient(135deg, #2b2f36, #14171b)', fg: '#e0a93b' } },
    { code: 'SPX500', label: 'SPX500', assetClass: 'Indices', basePrice: 5430, decimals: 1, icon: { short: 'SPX', bg: 'linear-gradient(135deg, #3f7fb5, #2a5a86)', fg: '#fff' } },
    { code: 'NAS100', label: 'NAS100', assetClass: 'Indices', basePrice: 19500, decimals: 1, icon: { short: 'NDX', bg: 'linear-gradient(135deg, #5566c4, #343f8a)', fg: '#fff' } },
];

const ICON_BY_CODE = new Map(SYMBOL_LIST.map((s) => [s.code, s.icon]));

/** Badge metadata for a symbol code, for the shared symbol-icon component. */
export function iconFor(code: string): SymbolIcon | undefined {
    return ICON_BY_CODE.get(code);
}

export const ASSET_CLASS_ORDER: AssetClass[] = ['Majors', 'Metals', 'Crypto', 'Energy', 'Indices'];

const DECIMALS = new Map(SYMBOL_LIST.map((s) => [s.code, s.decimals]));

/** No symbol in `SYMBOL_LIST` needs more than this many decimals. Caps a
 *  broker's raw reported precision, which can otherwise run well past what's
 *  meaningful for the price (e.g. 6dp on a crypto pair) and overflow table
 *  columns sized for realistic values. */
const MAX_DIGITS = 5;

/** DecimalPipe digitsInfo string for a symbol, e.g. "1.5-5". Prefers the
 *  broker-reported live precision (`liveDigits`, from a tick's `f` field) over
 *  the static per-symbol guess, since real brokers don't all quote at the same
 *  precision — but caps it at `MAX_DIGITS`. Falls back to 2dp when neither is known. */
export function digitsFor(code: string, liveDigits?: number): string {
    const d = Math.min(liveDigits ?? DECIMALS.get(code) ?? 2, MAX_DIGITS);
    return `1.${d}-${d}`;
}
