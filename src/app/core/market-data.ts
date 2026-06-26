import { isPlatformBrowser } from '@angular/common';
import { Injectable, OnDestroy, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { Api } from './api';
import { BROKERS } from './brokers';
import { PriceQuote } from './price-quote';
import { PricesWs } from './prices-ws';
import { ASSET_CLASS_ORDER, AssetClass, SYMBOL_LIST, SymbolMeta } from './symbols';

export interface MarketRow {
  symbol: SymbolMeta;
  quote?: PriceQuote;
}

export interface MarketGroup {
  assetClass: AssetClass;
  rows: MarketRow[];
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
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly selectedSymbol = signal<string>(SYMBOL_LIST[0].code);
  /** Broker shown in the live-markets board: 'best' = tightest per instrument, or a broker id. */
  readonly selectedBroker = signal<string>('best');

  private readonly quotes = signal<ReadonlyMap<string, PriceQuote>>(new Map());

  /** Current mid price per symbol, and the baseline captured at seed for % change. */
  private readonly mids = new Map<string, number>();
  private readonly baselines = new Map<string, number>();

  /** Rolling spread history per `symbol:broker`, used to draw the row sparklines. */
  private readonly history = new Map<string, number[]>();
  private static readonly HISTORY_LEN = 24;

  private wsSub?: Subscription;
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

    if (SIMULATE) {
      this.simTimer = setInterval(() => this.tick(), TICK_MS);
      return;
    }

    // Real backend wiring (enabled in the backend phase):
    this.api.getPrices().subscribe((initial) => {
      for (const quote of initial) {
        this.upsert(quote);
      }
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

  readonly rankingForSelected = computed<PriceQuote[]>(() => {
    const symbol = this.selectedSymbol();
    return Array.from(this.quotes().values())
      .filter((q) => q.symbol === symbol)
      .sort((a, b) => a.spread - b.spread)
      .slice(0, 5);
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
    if (this.simTimer) {
      clearInterval(this.simTimer);
    }
  }
}
