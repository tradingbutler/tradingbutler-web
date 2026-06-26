import { DecimalPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { BROKERS } from '../core/brokers';
import { PriceQuote } from '../core/price-quote';
import { MarketData } from '../core/market-data';
import { digitsFor } from '../core/symbols';

@Component({
    selector: 'app-markets',
    imports: [DecimalPipe],
    templateUrl: './markets.html',
    styleUrl: './markets.scss',
})
export class Markets {
    protected readonly marketData = inject(MarketData);
    protected readonly brokers = BROKERS;
    protected readonly digitsFor = digitsFor;

    protected mid(quote: PriceQuote): number {
        return (quote.bid + quote.ask) / 2;
    }

    protected onBrokerChange(event: Event): void {
        this.marketData.selectedBroker.set((event.target as HTMLSelectElement).value);
    }
}
