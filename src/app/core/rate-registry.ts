/** Latest tick for a symbol, as written into the json-writer rates snapshot. */
export interface RateTick {
    /** Ask price. */
    a: number;
    /** Bid price. */
    b: number;
    /** Price digits. */
    f: number;
    l: number;
    /** Epoch milliseconds. */
    m: number;
    r: number;
    /** Epoch seconds. */
    t: number;
    /** Volume. */
    v: number;
}

/** A single symbol entry from the json-writer rates snapshot (`rates.json`). */
export interface RateRecord {
    d: number[];
    i: number[];
    /** Symbol code. */
    s: string;
    /** Timeframe (e.g. "h1"). */
    t: string;
    x: { tick: RateTick };
}

/** broker_id -> symbol -> latest tick. */
export type RatesSnapshot = Record<string, Record<string, RateRecord>>;
