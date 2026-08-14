import { isPlatformBrowser } from '@angular/common';
import { Injectable, OnDestroy, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { Api } from './api';
import { BrokerRecord } from './broker-registry';
import { INITIAL_BROKERS, INITIAL_RATES } from './initial-data';
import { PriceQuote } from './price-quote';
import { RateRecord, RatesSnapshot } from './rate-registry';
import { RateTickMessage } from './rate-tick';
import { RatesWs } from './rates-ws';
import {
    ASSET_CLASS_ORDER,
    AssetClass,
    SYMBOL_GROUP_ORDER,
    SYMBOL_LIST,
    SymbolMeta,
    groupFor,
} from './symbols';

export interface MarketRow {
    symbol: SymbolMeta;
    quote?: PriceQuote;
}

export interface MarketGroup {
    assetClass: AssetClass;
    rows: MarketRow[];
}

/** A broker joined with its latest rates snapshot, correlated by broker id. */
export interface BrokerRates {
    id: string;
    broker?: BrokerRecord;
    rates: Record<string, RateRecord>;
}

@Injectable({ providedIn: 'root' })
export class MarketData implements OnDestroy {
    private readonly api = inject(Api);
    private readonly ratesWs = inject(RatesWs);
    private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

    readonly selectedSymbol = signal<string>(SYMBOL_LIST[0].code);
    /** Broker shown in the live-markets board: 'best' = tightest per instrument, or a broker id. */
    readonly selectedBroker = signal<string>('best');

    private readonly initialBrokers = inject(INITIAL_BROKERS);
    private readonly initialRates = inject(INITIAL_RATES);

    /** Real broker metadata (name, logo, affiliate link). Seeded from the
     *  SSR-preloaded `brokers.json` snapshot (see `initial-data.ts`) so
     *  server and first client render already have real data; `start()`
     *  refreshes it once the app is interactive. */
    readonly brokerRegistry = signal<ReadonlyMap<string, BrokerRecord>>(
        new Map(Object.entries(this.initialBrokers)),
    );

    /** Real broker_id -> symbol -> latest tick snapshot. Seeded from the
     *  SSR-preloaded `rates.json` snapshot, then kept live by
     *  rate-streamer's socket once `start()` connects. */
    readonly ratesSnapshot = signal<RatesSnapshot>(this.initialRates);

    /** `brokerRegistry` and `ratesSnapshot` joined by broker id. */
    readonly brokerRates = computed<ReadonlyMap<string, BrokerRates>>(() => {
        const brokers = this.brokerRegistry();
        const rates = this.ratesSnapshot();
        const ids = new Set<string>([...brokers.keys(), ...Object.keys(rates)]);
        const next = new Map<string, BrokerRates>();
        for (const id of ids) {
            next.set(id, { id, broker: brokers.get(id), rates: rates[id] ?? {} });
        }
        return next;
    });

    /** SYMBOL_LIST entries that have at least one broker's live tick in
     *  `ratesSnapshot` — drives the instrument dropdown once real data loads. */
    readonly availableSymbols = computed<SymbolMeta[]>(() => {
        const codes = new Set<string>();
        for (const bySymbol of Object.values(this.ratesSnapshot())) {
            for (const code of Object.keys(bySymbol)) {
                codes.add(code);
            }
        }
        return SYMBOL_LIST.filter((s) => codes.has(s.code));
    });

    private readonly assetClassBySymbol = new Map(SYMBOL_LIST.map((s) => [s.code, s.assetClass]));

    /** Rolling spread history per `symbol:broker`, used to draw the row sparklines. */
    private readonly history = new Map<string, number[]>();
    private static readonly HISTORY_LEN = 24;

    private ratesWsSub?: Subscription;
    private started = false;

    /** Bid the first time this browser session saw each `brokerId:symbol` —
     *  the reference point `change_pct` is measured against for the rest of
     *  the session (not the previous tick, and not a shared server-side
     *  daily open — the feed itself carries no such reference). */
    private readonly firstSeenBid = new Map<string, number>();
    /** Most recently derived `change_pct` per `brokerId:symbol`. Plain (non-signal)
     *  map mutated synchronously in `upsertRate`, before `ratesSnapshot` is set —
     *  so by the time `realQuotes` recomputes off that signal, values here are
     *  already current. */
    private readonly changePct = new Map<string, number>();

    /** Recent spread history for a broker+symbol, oldest first. Returns a fresh
     *  copy each call so consumers see a new reference when the chart updates. */
    spreadHistory(symbol: string, brokerId: string): number[] {
        return (this.history.get(`${symbol}:${brokerId}`) ?? []).slice();
    }

    /** Starts live updates on the browser. No-ops during SSR/prerender. */
    start(): void {
        if (this.started || !this.isBrowser) {
            return;
        }
        this.started = true;

        this.api.getBrokers().subscribe({
            next: (registry) => this.brokerRegistry.set(new Map(Object.entries(registry))),
            error: (err) => console.error('[MarketData] getBrokers failed', err),
        });
        this.api.getRates().subscribe({
            next: (snapshot) => this.ratesSnapshot.set(snapshot),
            error: (err) => console.error('[MarketData] getRates failed', err),
        });
        // Snapshot above seeds the initial view; rate-streamer then pushes
        // per-symbol ticks continuously over the one live socket so spreads
        // keep updating in real time.
        this.ratesWsSub = this.ratesWs.connect().subscribe((msg) => this.upsertRate(msg));
    }

    /** Merges one live tick from rate-streamer into `ratesSnapshot`, leaving
     *  every other broker/symbol untouched. */
    private upsertRate(msg: RateTickMessage): void {
        const key = `${msg.broker}:${msg.symbol}`;
        const bid = msg.data.x.tick.b;
        let firstBid = this.firstSeenBid.get(key);
        if (firstBid === undefined) {
            firstBid = bid;
            this.firstSeenBid.set(key, bid);
        }
        this.changePct.set(key, ((bid - firstBid) / firstBid) * 100);

        // Roll the spread into this pair's sparkline history. Keyed
        // `symbol:brokerId` to match `spreadHistory()`'s lookup — note that is
        // the opposite order to `key` above, which is `brokerId:symbol`.
        const historyKey = `${msg.symbol}:${msg.broker}`;
        const spread = Math.max(0, msg.data.x.tick.a - bid);
        const digits = msg.data.i?.[1];
        const series = this.history.get(historyKey) ?? [];
        series.push(digits === undefined ? spread : Number(spread.toFixed(digits)));
        if (series.length > MarketData.HISTORY_LEN) {
            series.splice(0, series.length - MarketData.HISTORY_LEN);
        }
        this.history.set(historyKey, series);

        const snapshot = this.ratesSnapshot();
        const next: RatesSnapshot = { ...snapshot };
        next[msg.broker] = { ...snapshot[msg.broker], [msg.symbol]: msg.data };
        this.ratesSnapshot.set(next);
    }

    /** Builds a `PriceQuote` from one broker's real live tick record. */
    private toRealQuote(
        id: string,
        broker: BrokerRecord | undefined,
        symbol: string,
        record: RateRecord,
    ): PriceQuote {
        const { a: rawAsk, b: rawBid, m: ts } = record.x.tick;
        const digits = record.i?.[1];
        // Real ticks can arrive crossed (bid > ask) on a glitch; clamp so a bad
        // tick can't sort to the top of a "tightest spread" ranking.
        const rawSpread = Math.max(0, rawAsk - rawBid);
        // Force fixed-point notation at the broker-reported precision so raw
        // float noise (e.g. 12.000000000000002) never leaks into sorting,
        // averages, or the sparkline history — not just display formatting.
        const fixed = (n: number) => (digits === undefined ? n : Number(n.toFixed(digits)));
        const bid = fixed(rawBid);
        const ask = fixed(rawAsk);
        const spread = fixed(rawSpread);
        return {
            broker_id: id,
            broker_name: broker?.name ?? id,
            affiliate_url: broker?.open_account_url ?? '#',
            symbol,
            asset_class: this.assetClassBySymbol.get(symbol) ?? '',
            bid,
            ask,
            spread,
            digits,
            change_pct: this.changePct.get(`${id}:${symbol}`) ?? 0,
            ts,
        };
    }

    /** Every broker+symbol tick, keyed `symbol:brokerId`. Seeded server-side
     *  (see `brokerRegistry`/`ratesSnapshot`), then kept current by live ticks. */
    private readonly realQuotes = computed<ReadonlyMap<string, PriceQuote>>(() => {
        const next = new Map<string, PriceQuote>();
        for (const { id, broker, rates } of this.brokerRates().values()) {
            for (const [symbol, record] of Object.entries(rates)) {
                next.set(`${symbol}:${id}`, this.toRealQuote(id, broker, symbol, record));
            }
        }
        return next;
    });

    /** All brokers for the selected symbol, tightest spread first. */
    readonly rankingForSelected = computed<PriceQuote[]>(() => {
        const symbol = this.selectedSymbol();
        return this.rankingFor(symbol);
    });

    /** All brokers quoting `symbol`, tightest spread first. The id-parameterised
     *  form of `rankingForSelected` — the per-broker pages need a ranking for
     *  their own symbol without touching the app-wide `selectedSymbol` signal,
     *  which every `SymbolSelect` on the home page is bound to. */
    rankingFor(symbol: string): PriceQuote[] {
        const rows = Array.from(this.realQuotes().values()).filter((q) => q.symbol === symbol);
        return rows.sort((a, b) => a.spread - b.spread);
    }

    /**
     * Every quote for one broker, ordered by asset-class group and then by
     * symbol, so the per-broker table has a stable order across ticks.
     *
     * Reads the `realQuotes` signal, so calling this inside a `computed()`
     * keeps the caller reactive to live ticks.
     */
    quotesForBroker(brokerId: string): PriceQuote[] {
        return Array.from(this.realQuotes().values())
            .filter((q) => q.broker_id === brokerId)
            .sort((a, b) => {
                const order =
                    SYMBOL_GROUP_ORDER.indexOf(groupFor(a.symbol)) -
                    SYMBOL_GROUP_ORDER.indexOf(groupFor(b.symbol));
                return order !== 0 ? order : a.symbol.localeCompare(b.symbol);
            });
    }

    /** One broker's quote for one symbol, or `undefined` if it doesn't quote it. */
    quoteFor(brokerId: string, symbol: string): PriceQuote | undefined {
        return this.realQuotes().get(`${symbol}:${brokerId}`);
    }

    /** Where a broker places on a symbol, e.g. `{ rank: 2, total: 5 }` for the
     *  second-tightest spread of five brokers quoting it. */
    rankFor(brokerId: string, symbol: string): { rank: number; total: number } | undefined {
        const ranking = this.rankingFor(symbol);
        const index = ranking.findIndex((q) => q.broker_id === brokerId);
        return index === -1 ? undefined : { rank: index + 1, total: ranking.length };
    }

    /**
     * Resolves a URL slug to a real broker id, case-insensitively — canonical
     * URLs are lowercase (`/exness`) but a hand-typed `/Exness` should still
     * land. Matches brokers that are registered *or* streaming, mirroring
     * `brokerRates()`.
     */
    resolveBrokerSlug(slug: string): string | undefined {
        const wanted = slug.toLowerCase();
        for (const id of this.brokerRates().keys()) {
            if (id.toLowerCase() === wanted) {
                return id;
            }
        }
        return undefined;
    }

    /** Resolves a URL slug to one of a broker's real symbol codes, e.g.
     *  `'btcaudm'` -> `'BTCAUDm'`. Broker-native codes carry arbitrary casing,
     *  so the URL form is always lowercase and matched case-insensitively. */
    resolveSymbolSlug(brokerId: string, slug: string): string | undefined {
        const wanted = slug.toLowerCase();
        const rates = this.ratesSnapshot()[brokerId];
        if (!rates) {
            return undefined;
        }
        for (const code of Object.keys(rates)) {
            if (code.toLowerCase() === wanted) {
                return code;
            }
        }
        return undefined;
    }

    /** Every quote — one per broker+symbol. */
    readonly allQuotes = computed<PriceQuote[]>(() => Array.from(this.realQuotes().values()));

    readonly bestPerSymbol = computed<ReadonlyMap<string, PriceQuote>>(() => {
        const best = new Map<string, PriceQuote>();
        for (const quote of this.realQuotes().values()) {
            const current = best.get(quote.symbol);
            if (!current || quote.spread < current.spread) {
                best.set(quote.symbol, quote);
            }
        }
        return best;
    });

    readonly marketsByClass = computed<MarketGroup[]>(() => {
        const brokerId = this.selectedBroker();
        const best = this.bestPerSymbol();
        const quotes = this.realQuotes();
        const pick = (code: string) =>
            brokerId === 'best' ? best.get(code) : quotes.get(`${code}:${brokerId}`);
        return ASSET_CLASS_ORDER.map((assetClass) => ({
            assetClass,
            rows: SYMBOL_LIST.filter((s) => s.assetClass === assetClass).map((symbol) => ({
                symbol,
                quote: pick(symbol.code),
            })),
        }));
    });

    ngOnDestroy(): void {
        this.ratesWsSub?.unsubscribe();
    }
}
