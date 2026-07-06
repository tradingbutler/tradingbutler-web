import { isPlatformBrowser } from '@angular/common';
import { Injectable, OnDestroy, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { Api } from './api';
import { BrokerRecord } from './broker-registry';
import { PriceQuote } from './price-quote';
import { RateRecord, RatesSnapshot } from './rate-registry';
import { RateTickMessage } from './rate-tick';
import { RatesWs } from './rates-ws';
import { ASSET_CLASS_ORDER, AssetClass, SYMBOL_LIST, SymbolMeta } from './symbols';

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

    /** Deterministic placeholder quotes so SSR/first paint render populated
     *  tables before `brokers.json`/`rates.json`/the live socket resolve.
     *  `effectiveQuotes` overrides these per broker+symbol with real ticks. */
    private readonly seedQuotes = signal<ReadonlyMap<string, PriceQuote>>(new Map());

    /** Real broker metadata (name, logo, affiliate link) downloaded from
     *  `brokers.json` on page load. Empty until that request resolves. */
    readonly brokerRegistry = signal<ReadonlyMap<string, BrokerRecord>>(new Map());

    /** Real broker_id -> symbol -> latest tick snapshot downloaded from
     *  `rates.json` on page load, then kept live by rate-streamer's socket. */
    readonly ratesSnapshot = signal<RatesSnapshot>({});

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

    /** Previous bid per `brokerId:symbol`, used to derive `change_pct` on each
     *  new tick — the feed itself carries no change/last-close reference. */
    private readonly lastBid = new Map<string, number>();
    /** Most recently derived `change_pct` per `brokerId:symbol`. Plain (non-signal)
     *  map mutated synchronously in `upsertRate`, before `ratesSnapshot` is set —
     *  so by the time `realQuotes` recomputes off that signal, values here are
     *  already current. */
    private readonly changePct = new Map<string, number>();

    constructor() {
        // Seed deterministic placeholder quotes synchronously so SSR/prerender
        // (and the first client render) show populated tables with matching
        // markup — real ticks take over per broker+symbol once they arrive.
        this.seedHistory();
        this.seedPlaceholderQuotes();
    }

    /** Deterministically fills the spread history so the sparklines render
     *  populated on SSR/first paint without causing a hydration mismatch. */
    private seedHistory(): void {
        //
    }

    /** Stable per-key phase in [0, 2π) so each broker's seeded curve differs. */
    private phaseFor(key: string): number {
        let h = 0;
        for (let i = 0; i < key.length; i++) {
            h = (h * 31 + key.charCodeAt(i)) % 1000;
        }
        return (h / 1000) * Math.PI * 2;
    }

    /** Builds the static placeholder quote for every symbol/stub-broker pair
     *  from each symbol's reference `basePrice`. Computed once — real ticks
     *  override these in `effectiveQuotes` as they arrive. */
    private seedPlaceholderQuotes(): void {
        const next = new Map<string, PriceQuote>();
        for (const symbol of SYMBOL_LIST) {
            //
        }
        this.seedQuotes.set(next);
    }

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
        const prevBid = this.lastBid.get(key);
        if (prevBid) {
            this.changePct.set(key, ((bid - prevBid) / prevBid) * 100);
        }
        this.lastBid.set(key, bid);

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

    /** Every real broker+symbol tick, keyed like `seedQuotes` (`symbol:brokerId`). */
    private readonly realQuotes = computed<ReadonlyMap<string, PriceQuote>>(() => {
        const next = new Map<string, PriceQuote>();
        for (const { id, broker, rates } of this.brokerRates().values()) {
            for (const [symbol, record] of Object.entries(rates)) {
                next.set(`${symbol}:${id}`, this.toRealQuote(id, broker, symbol, record));
            }
        }
        return next;
    });

    /** Placeholder quotes, overridden per broker+symbol by real ticks once
     *  they arrive. Backs every live-looking table/ticker in the app. */
    readonly effectiveQuotes = computed<ReadonlyMap<string, PriceQuote>>(() => {
        const merged = new Map(this.seedQuotes());
        for (const [key, quote] of this.realQuotes()) {
            merged.set(key, quote);
        }
        return merged;
    });

    /** All brokers for the selected symbol, tightest spread first, from real data only
     *  (no placeholders). Consumers that only want a teaser (e.g. the hero widget)
     *  slice this down themselves. */
    readonly rankingForSelected = computed<PriceQuote[]>(() => {
        const symbol = this.selectedSymbol();
        const rows = Array.from(this.realQuotes().values()).filter((q) => q.symbol === symbol);
        return rows.sort((a, b) => a.spread - b.spread);
    });

    /** Every quote (placeholder or real) — one per broker+symbol. */
    readonly allQuotes = computed<PriceQuote[]>(() => Array.from(this.effectiveQuotes().values()));

    readonly bestPerSymbol = computed<ReadonlyMap<string, PriceQuote>>(() => {
        const best = new Map<string, PriceQuote>();
        for (const quote of this.effectiveQuotes().values()) {
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
        const quotes = this.effectiveQuotes();
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
