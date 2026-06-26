import { DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject } from '@angular/core';
import { MarketData } from '../core/market-data';
import { SYMBOL_LIST, digitsFor } from '../core/symbols';

interface TickerItem {
    key: string;
    broker: string;
    symbol: string;
    code: string;
    spread: number;
    changePct: number;
}

const SYMBOL_LABEL = new Map(SYMBOL_LIST.map((s) => [s.code, s.label]));

@Component({
    selector: 'app-ticker',
    imports: [DecimalPipe],
    templateUrl: './ticker.html',
    styleUrl: './ticker.scss',
})
export class Ticker implements OnInit {
    private readonly marketData = inject(MarketData);

    /** Broker spreads in a stable, deterministic "random" order. Deterministic so
     *  the SSR markup and the first client render match (no hydration mismatch),
     *  and so the marquee doesn't reshuffle every time a price updates. */
    protected readonly items = computed<TickerItem[]>(() => {
        const quotes = this.marketData.allQuotes();
        const entries = quotes
            .map((q) => ({
                key: `${q.broker_id}:${q.symbol}`,
                broker: q.broker_name,
                symbol: SYMBOL_LABEL.get(q.symbol) ?? q.symbol,
                code: q.symbol,
                spread: q.spread,
                changePct: q.change_pct,
            }))
            .sort((a, b) => a.key.localeCompare(b.key));
        return seededShuffle(entries);
    });

    protected readonly digitsFor = digitsFor;

    ngOnInit(): void {
        this.marketData.start();
    }
}

/** Fisher–Yates with a fixed-seed LCG — same permutation every call. */
function seededShuffle<T>(input: T[]): T[] {
    const arr = [...input];
    let seed = 0x9e3779b9;
    const rnd = () => {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        return seed / 0xffffffff;
    };
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(rnd() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}
