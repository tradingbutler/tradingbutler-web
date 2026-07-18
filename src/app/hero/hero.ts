import { DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { MarketData } from '../core/market-data';
import { Mascot } from '../mascot/mascot';
import { PriceQuote } from '../core/price-quote';
import { digitsFor } from '../core/symbols';
import { SymbolSelect } from '../shared/symbol-select';

@Component({
    selector: 'app-hero',
    imports: [Mascot, DecimalPipe, SymbolSelect],
    templateUrl: './hero.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './hero.scss',
})
export class Hero implements OnInit {
    protected readonly marketData = inject(MarketData);
    protected readonly digitsFor = digitsFor;

    protected readonly topBrokers = computed<PriceQuote[]>(() =>
        this.marketData.rankingForSelected().slice(0, 3),
    );

    ngOnInit(): void {
        this.marketData.start();
    }
}
