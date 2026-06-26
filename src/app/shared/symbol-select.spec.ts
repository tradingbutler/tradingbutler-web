import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SymbolSelect } from './symbol-select';

describe('SymbolSelect', () => {
    let fixture: ComponentFixture<SymbolSelect>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [SymbolSelect],
        }).compileComponents();
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
        // eslint-disable-next-line no-console
        console.log('OPTION COUNT =', opts.length);
        expect(opts.length).toBeGreaterThan(0);
    });
});
