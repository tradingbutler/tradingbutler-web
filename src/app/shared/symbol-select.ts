import { Component, ElementRef, computed, inject, signal } from '@angular/core';
import { MarketData } from '../core/market-data';
import { SYMBOL_LIST } from '../core/symbols';
import { SymbolIcon } from './symbol-icon';

/**
 * Rich instrument dropdown: a custom listbox (native <select> can't show images)
 * with a per-symbol icon. Reads/writes the shared MarketData.selectedSymbol, so
 * every instance stays in sync. Closes on outside click or Escape.
 */
@Component({
    selector: 'app-symbol-select',
    imports: [SymbolIcon],
    templateUrl: './symbol-select.html',
    styleUrl: './symbol-select.scss',
    host: {
        '(document:click)': 'onDocumentClick($event)',
        '(document:keydown.escape)': 'close()',
    },
})
export class SymbolSelect {
    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
    protected readonly marketData = inject(MarketData);
    protected readonly symbols = this.marketData.availableSymbols;
    protected readonly open = signal(false);

    protected readonly selected = this.marketData.selectedSymbol;
    protected readonly current = computed(() =>
        SYMBOL_LIST.find((s) => s.code === this.selected()),
    );

    protected toggle(event?: MouseEvent): void {
        // Stop the opening click from reaching the document outside-click
        // handler, which would otherwise immediately close the menu.
        event?.stopPropagation();
        this.open.update((v) => !v);
    }

    protected close(): void {
        this.open.set(false);
    }

    protected pick(code: string): void {
        this.marketData.selectedSymbol.set(code);
        this.close();
    }

    protected onDocumentClick(event: MouseEvent): void {
        if (this.open() && !this.host.nativeElement.contains(event.target as Node)) {
            this.close();
        }
    }
}
