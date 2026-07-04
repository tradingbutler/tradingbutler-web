export interface PriceQuote {
    broker_id: string;
    broker_name: string;
    /** Optional — present on placeholder quotes; the real backend has no ratings source yet. */
    broker_rating?: number;
    /** Regulatory body label (e.g. FCA). Optional — present on placeholder quotes, absent from the real backend feed. */
    regulator?: string;
    affiliate_url: string;
    symbol: string;
    asset_class: string;
    bid: number;
    ask: number;
    spread: number;
    /** Broker-reported decimal precision for this tick. Falls back to the
     *  symbol's static default (`digitsFor`) when absent, e.g. for placeholder
     *  quotes seeded before any real tick has arrived. */
    digits?: number;
    change_pct: number;
    ts: number;
}
