import { isPlatformBrowser } from '@angular/common';
import { Injectable, OnDestroy, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { Api } from './api';
import { BrokerRecord } from './broker-registry';
import { BROKERS } from './brokers';
import { PriceQuote } from './price-quote';
import { RateRecord, RatesSnapshot } from './rate-registry';
import { RateTickMessage } from './rate-tick';
import { PricesWs } from './prices-ws';
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

/**
 * Website phase: prices are simulated entirely in the browser so the tables,
 * ticker and spreads look alive without a backend. Flip SIMULATE to false (and
 * wire start() to Api/PricesWs) once the real streaming backend is connected.
 */
const SIMULATE = true;
const TICK_MS = 1500;

@Injectable({ providedIn: 'root' })
export class MarketData implements OnDestroy {
    private readonly api = inject(Api);
    private readonly pricesWs = inject(PricesWs);
    private readonly ratesWs = inject(RatesWs);
    private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

    readonly selectedSymbol = signal<string>(SYMBOL_LIST[0].code);
    /** Broker shown in the live-markets board: 'best' = tightest per instrument, or a broker id. */
    readonly selectedBroker = signal<string>('best');

    private readonly quotes = signal<ReadonlyMap<string, PriceQuote>>(new Map());

    /** Real broker metadata (name, logo, affiliate link) downloaded from
     *  `brokers.json` on page load. Empty until that request resolves. */
    readonly brokerRegistry = signal<ReadonlyMap<string, BrokerRecord>>(new Map());

    /** Real broker_id -> symbol -> latest tick snapshot downloaded from
     *  `rates.json` on page load. Empty until that request resolves. */
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

    /** Current mid price per symbol, and the baseline captured at seed for % change. */
    private readonly mids = new Map<string, number>();
    private readonly baselines = new Map<string, number>();

    /** Rolling spread history per `symbol:broker`, used to draw the row sparklines. */
    private readonly history = new Map<string, number[]>();
    private static readonly HISTORY_LEN = 24;

    private wsSub?: Subscription;
    private ratesWsSub?: Subscription;
    private simTimer?: ReturnType<typeof setInterval>;
    private started = false;

    constructor() {
        // Seed a deterministic snapshot synchronously so SSR/prerender (and the
        // first client render) show populated tables with matching markup.
        if (SIMULATE) {
            for (const symbol of SYMBOL_LIST) {
                this.mids.set(symbol.code, symbol.basePrice);
                this.baselines.set(symbol.code, symbol.basePrice);
            }
            this.seedHistory();
            this.rebuildAll(false);
        }
    }

    /** Deterministically fills the spread history so the sparklines render
     *  populated on SSR/first paint without causing a hydration mismatch. */
    private seedHistory(): void {
        for (const symbol of SYMBOL_LIST) {
            const mid = symbol.basePrice;
            for (const broker of BROKERS) {
                const key = `${symbol.code}:${broker.id}`;
                const base = mid * broker.spreadFrac * 2;
                const phase = this.phaseFor(key);
                const points: number[] = [];
                for (let i = 0; i < MarketData.HISTORY_LEN; i++) {
                    const wobble =
                        1 + 0.16 * Math.sin(i * 0.6 + phase) + 0.06 * Math.sin(i * 1.7 + phase * 2);
                    points.push(base * wobble);
                }
                this.history.set(key, points);
            }
        }
    }

    /** Stable per-key phase in [0, 2π) so each broker's seeded curve differs. */
    private phaseFor(key: string): number {
        let h = 0;
        for (let i = 0; i < key.length; i++) {
            h = (h * 31 + key.charCodeAt(i)) % 1000;
        }
        return (h / 1000) * Math.PI * 2;
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
        // per-symbol ticks continuously so spreads keep updating live.
        this.ratesWsSub = this.ratesWs.connect().subscribe((msg) => this.upsertRate(msg));

        if (SIMULATE) {
            this.simTimer = setInterval(() => this.tick(), TICK_MS);
            return;
        }

        // Real backend wiring (enabled in the backend phase):
        this.api.getPrices().subscribe({
            next: (initial) => {
                for (const quote of initial) {
                    this.upsert(quote);
                }
            },
            error: (err) => console.error('[MarketData] getPrices failed', err),
        });
        this.wsSub = this.pricesWs.connect().subscribe((quote) => this.upsert(quote));
    }

    private tick(): void {
        for (const symbol of SYMBOL_LIST) {
            const mid = this.mids.get(symbol.code) ?? symbol.basePrice;
            const drift = (Math.random() * 2 - 1) * mid * 0.0004;
            this.mids.set(symbol.code, Math.max(mid + drift, symbol.basePrice * 0.5));
        }
        this.rebuildAll(true);
    }

    /** Rebuilds the full quote map from current mids. `jitter` adds per-broker
     *  spread variation (browser only) so the board feels live. */
    private rebuildAll(jitter: boolean): void {
        const next = new Map<string, PriceQuote>();
        for (const symbol of SYMBOL_LIST) {
            const mid = this.mids.get(symbol.code) ?? symbol.basePrice;
            const baseline = this.baselines.get(symbol.code) ?? symbol.basePrice;
            const changePct = baseline ? ((mid - baseline) / baseline) * 100 : 0;
            for (const broker of BROKERS) {
                const frac = Math.max(
                    broker.spreadFrac + (jitter ? (Math.random() * 2 - 1) * 0.000015 : 0),
                    0.00001,
                );
                const half = mid * frac;
                const bid = mid - half;
                const ask = mid + half;
                const spread = ask - bid;
                const hist = this.history.get(`${symbol.code}:${broker.id}`);
                if (hist) {
                    hist.push(spread);
                    if (hist.length > MarketData.HISTORY_LEN) {
                        hist.shift();
                    }
                }
                next.set(`${symbol.code}:${broker.id}`, {
                    broker_id: broker.id,
                    broker_name: broker.name,
                    broker_rating: broker.rating,
                    regulator: broker.regulator,
                    affiliate_url: broker.affiliateUrl,
                    symbol: symbol.code,
                    asset_class: symbol.assetClass,
                    bid,
                    ask,
                    spread,
                    change_pct: changePct,
                    ts: Date.now(),
                });
            }
        }
        this.quotes.set(next);
    }

    private upsert(quote: PriceQuote): void {
        const next = new Map(this.quotes());
        next.set(`${quote.symbol}:${quote.broker_id}`, quote);
        this.quotes.set(next);
    }

    /** Merges one live tick from rate-streamer into `ratesSnapshot`, leaving
     *  every other broker/symbol untouched. */
    private upsertRate(msg: RateTickMessage): void {
        const snapshot = this.ratesSnapshot();
        const next: RatesSnapshot = { ...snapshot };
        next[msg.broker] = { ...snapshot[msg.broker], [msg.symbol]: msg.data };
        this.ratesSnapshot.set(next);
    }

    /** Top 3 brokers for the selected symbol, built from the real downloaded
     *  broker + rates data (`brokerRates`) rather than the simulation. */
    readonly rankingForSelected = computed<PriceQuote[]>(() => {
        const symbol = this.selectedSymbol();
        const assetClass = SYMBOL_LIST.find((s) => s.code === symbol)?.assetClass ?? '';
        const rows: PriceQuote[] = [];
        for (const { id, broker, rates } of this.brokerRates().values()) {
            const record = rates[symbol];
            if (!record) {
                continue;
            }
            const { a: ask, b: bid, m: ts } = record.x.tick;
            // Real ticks can arrive crossed (bid > ask) on a glitch; clamp so a bad
            // tick can't sort to the top of a "tightest spread" ranking.
            const spread = Math.max(0, ask - bid);
            rows.push({
                broker_id: id,
                broker_name: broker?.name ?? id,
                affiliate_url: broker?.open_account_url ?? '#',
                symbol,
                asset_class: assetClass,
                bid,
                ask,
                spread,
                change_pct: 0,
                ts,
            });
        }
        return rows.sort((a, b) => a.spread - b.spread).slice(0, 3);
    });

    /** Every live quote (one per broker+symbol that has reported). */
    readonly allQuotes = computed<PriceQuote[]>(() => Array.from(this.quotes().values()));

    readonly bestPerSymbol = computed<ReadonlyMap<string, PriceQuote>>(() => {
        const best = new Map<string, PriceQuote>();
        for (const quote of this.quotes().values()) {
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
        const quotes = this.quotes();
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
        this.wsSub?.unsubscribe();
        this.ratesWsSub?.unsubscribe();
        if (this.simTimer) {
            clearInterval(this.simTimer);
        }
    }
}
