import { DecimalPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MarketData } from '../core/market-data';
import { digitsFor } from '../core/symbols';
import { SpreadHistory } from './spread-history';
import { SymbolSelect } from '../shared/symbol-select';

@Component({
    selector: 'app-broker-ranking',
    imports: [DecimalPipe, SpreadHistory, SymbolSelect],
    templateUrl: './broker-ranking.html',
    styleUrl: './broker-ranking.scss',
})
export class BrokerRanking {
    protected readonly marketData = inject(MarketData);
    protected readonly digitsFor = digitsFor;

    protected stars(rating: number): { filled: number[]; empty: number[] } {
        const filled = Math.round(rating);
        return {
            filled: Array.from({ length: filled }),
            empty: Array.from({ length: 5 - filled }),
        };
    }
}
