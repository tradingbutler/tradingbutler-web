import { DecimalPipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { BROKERS } from '../core/brokers';
import { PriceQuote } from '../core/price-quote';
import { MarketData } from '../core/market-data';
import { digitsFor } from '../core/symbols';
import { SymbolIcon } from '../shared/symbol-icon';

@Component({
    selector: 'app-markets',
    imports: [DecimalPipe, SymbolIcon],
    templateUrl: './markets.html',
    styleUrl: './markets.scss',
})
export class Markets {
    protected readonly marketData = inject(MarketData);
    /** Real, self-registered brokers once loaded; the stub roster (`BROKERS`)
     *  only fills the selector before that data has arrived. */
    protected readonly brokers = computed(() => {
        const registry = this.marketData.brokerRegistry();
        return registry.size > 0 ? Array.from(registry.values()) : BROKERS;
    });
    protected readonly digitsFor = digitsFor;

    protected mid(quote: PriceQuote): number {
        return (quote.bid + quote.ask) / 2;
    }

    protected onBrokerChange(event: Event): void {
        this.marketData.selectedBroker.set((event.target as HTMLSelectElement).value);
    }
}
