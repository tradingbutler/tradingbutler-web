export interface PriceQuote {
    broker_id: string;
    broker_name: string;
    broker_rating: number;
    /** Regulatory body label (e.g. FCA). Optional — present in UI simulation, may be absent from the backend feed. */
    regulator?: string;
    affiliate_url: string;
    symbol: string;
    asset_class: string;
    bid: number;
    ask: number;
    spread: number;
    change_pct: number;
    ts: number;
}
