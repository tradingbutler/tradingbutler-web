/** Latest tick for a symbol, as written into the json-writer rates snapshot. */
export interface RateTick {
    /** Ask price. */
    a: number;
    /** Bid price. */
    b: number;
    /** Tick flags (not decimal precision — see `RateRecord.i` for that). */
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
    /** `i[1]` is this instrument's decimal precision — the number of digits
     *  bid/ask/spread should be fixed to (e.g. `toFixed(i[1])`). */
    i: number[];
    /** Symbol code. */
    s: string;
    /** Timeframe (e.g. "h1"). */
    t: string;
    x: { tick: RateTick };
}

/** broker_id -> symbol -> latest tick. */
export type RatesSnapshot = Record<string, Record<string, RateRecord>>;
