import { DecimalPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MarketData } from '../core/market-data';
import { SYMBOL_LIST, digitsFor } from '../core/symbols';
import { SpreadHistory } from './spread-history';

@Component({
  selector: 'app-broker-ranking',
  imports: [DecimalPipe, SpreadHistory],
  templateUrl: './broker-ranking.html',
  styleUrl: './broker-ranking.scss',
})
export class BrokerRanking {
  protected readonly marketData = inject(MarketData);
  protected readonly symbols = SYMBOL_LIST;
  protected readonly digitsFor = digitsFor;

  protected onSymbolChange(event: Event): void {
    this.marketData.selectedSymbol.set((event.target as HTMLSelectElement).value);
  }

  protected stars(rating: number): { filled: number[]; empty: number[] } {
    const filled = Math.round(rating);
    return {
      filled: Array.from({ length: filled }),
      empty: Array.from({ length: 5 - filled }),
    };
  }
}
