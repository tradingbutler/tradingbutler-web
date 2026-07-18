import { DecimalPipe, isPlatformBrowser } from '@angular/common';
import {
    Component,
    OnInit,
    PLATFORM_ID,
    computed,
    effect,
    inject,
    signal,
    ChangeDetectionStrategy,
} from '@angular/core';
import { MarketData } from '../core/market-data';
import { SYMBOL_LIST, digitsFor } from '../core/symbols';

const TICKER_SIZE = 16;

interface TickerItem {
    key: string;
    broker: string;
    symbol: string;
    code: string;
    price: number;
    digits?: number;
    changePct: number;
}

const SYMBOL_LABEL = new Map(SYMBOL_LIST.map((s) => [s.code, s.label]));

@Component({
    selector: 'app-ticker',
    imports: [DecimalPipe],
    templateUrl: './ticker.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './ticker.scss',
})
export class Ticker implements OnInit {
    private readonly marketData = inject(MarketData);
    private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

    /** Randomly chosen broker:symbol keys (client-only), topped up as new
     *  broker/symbol pairs come online and pruned as they drop off — capped at
     *  `TICKER_SIZE`. Stays null on the server so SSR renders nothing, matching
     *  first client paint before any picks happen. */
    private readonly selectedKeys = signal<Set<string> | null>(null);

    /** The selected broker/symbol pairs, with values kept live via the websocket
     *  feed — only which pairs are shown is random, not their current price. */
    protected readonly items = computed<TickerItem[]>(() => {
        const keys = this.selectedKeys();
        if (!keys) return [];
        const quotes = this.marketData.allQuotes();
        return quotes
            .filter((q) => keys.has(`${q.broker_id}:${q.symbol}`))
            .map((q) => ({
                key: `${q.broker_id}:${q.symbol}`,
                broker: q.broker_name,
                symbol: SYMBOL_LABEL.get(q.symbol) ?? q.symbol,
                code: q.symbol,
                price: q.bid,
                digits: q.digits,
                changePct: q.change_pct,
            }))
            .sort((a, b) => a.key.localeCompare(b.key));
    });

    protected readonly digitsFor = digitsFor;

    constructor() {
        effect(() => {
            if (!this.isBrowser) return;
            const quotes = this.marketData.allQuotes();
            const available = new Set(quotes.map((q) => `${q.broker_id}:${q.symbol}`));
            const current = this.selectedKeys();
            const kept = new Set(current ? [...current].filter((k) => available.has(k)) : []);
            if (kept.size < TICKER_SIZE) {
                const candidates = [...available].filter((k) => !kept.has(k));
                for (const key of randomSample(candidates, TICKER_SIZE - kept.size)) {
                    kept.add(key);
                }
            }
            if (!current || !sameKeys(kept, current)) {
                this.selectedKeys.set(kept);
            }
        });
    }

    ngOnInit(): void {
        this.marketData.start();
    }
}

function sameKeys(a: ReadonlySet<string>, b: ReadonlySet<string>): boolean {
    if (a.size !== b.size) return false;
    for (const key of a) {
        if (!b.has(key)) return false;
    }
    return true;
}

/** Picks up to `size` random, distinct entries via a partial Fisher–Yates shuffle. */
function randomSample<T>(input: T[], size: number): T[] {
    const arr = [...input];
    const n = Math.min(size, arr.length);
    for (let i = 0; i < n; i++) {
        const j = i + Math.floor(Math.random() * (arr.length - i));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr.slice(0, n);
}
