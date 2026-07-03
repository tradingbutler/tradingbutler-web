import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MarketData } from '../core/market-data';
import { SymbolSelect } from './symbol-select';

describe('SymbolSelect', () => {
    let fixture: ComponentFixture<SymbolSelect>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [SymbolSelect],
        }).compileComponents();
        // The dropdown only lists symbols with a live tick in `ratesSnapshot`
        // (see MarketData.availableSymbols) — seed one so the menu isn't empty.
        TestBed.inject(MarketData).ratesSnapshot.set({
            exness: {
                EURUSD: {
                    d: [],
                    i: [],
                    s: 'EURUSD',
                    t: 'h1',
                    x: { tick: { a: 1.0855, b: 1.0854, f: 5, l: 0, m: 0, r: 0, t: 0, v: 0 } },
                },
            },
        });
        fixture = TestBed.createComponent(SymbolSelect);
        await fixture.whenStable();
    });

    it('renders the selected symbol in the trigger', () => {
        const label = fixture.nativeElement.querySelector('.ssel__label');
        expect(label?.textContent?.trim()).toBe('EUR/USD');
    });

    it('opens the menu and lists symbols on click', async () => {
        const trigger: HTMLButtonElement = fixture.nativeElement.querySelector('.ssel__trigger');
        trigger.click();
        await fixture.whenStable();
        fixture.detectChanges();
        const opts = fixture.nativeElement.querySelectorAll('.ssel__opt');
        expect(opts.length).toBeGreaterThan(0);
    });
});
