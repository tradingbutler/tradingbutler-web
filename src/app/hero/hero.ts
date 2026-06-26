import { DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject } from '@angular/core';
import { MarketData } from '../core/market-data';
import { Mascot } from '../mascot/mascot';
import { PriceQuote } from '../core/price-quote';
import { SYMBOL_LIST, digitsFor } from '../core/symbols';

@Component({
    selector: 'app-hero',
    imports: [Mascot, DecimalPipe],
    templateUrl: './hero.html',
    styleUrl: './hero.scss',
})
export class Hero implements OnInit {
    protected readonly marketData = inject(MarketData);
    protected readonly symbols = SYMBOL_LIST;
    protected readonly digitsFor = digitsFor;

    /** Top three brokers for the selected instrument — the hero centrepiece. */
    protected readonly topBrokers = computed<PriceQuote[]>(() =>
        this.marketData.rankingForSelected().slice(0, 3),
    );

    protected onSymbolChange(event: Event): void {
        this.marketData.selectedSymbol.set((event.target as HTMLSelectElement).value);
    }

    ngOnInit(): void {
        this.marketData.start();
    }
}
