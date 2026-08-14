import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { BrokerPage } from './broker-page';
import { INITIAL_BROKERS, INITIAL_RATES } from '../core/initial-data';
import { RATES_ENDPOINT } from '../core/rates-endpoint';
import { TEST_BROKERS, TEST_RATES } from '../core/test-fixtures';

describe('BrokerPage', () => {
    let fixture: ComponentFixture<BrokerPage>;

    async function renderFor(slug: string): Promise<HTMLElement> {
        await TestBed.configureTestingModule({
            imports: [BrokerPage],
            providers: [
                provideRouter([]),
                provideHttpClient(),
                { provide: INITIAL_BROKERS, useValue: TEST_BROKERS },
                { provide: INITIAL_RATES, useValue: TEST_RATES },
                // MarketData.start() opens a real WebSocket; jsdom rejects a
                // relative URL, so point it at an absolute one.
                { provide: RATES_ENDPOINT, useValue: 'ws://localhost:1/ws' },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(BrokerPage);
        fixture.componentRef.setInput('broker', slug);
        await fixture.whenStable();
        fixture.detectChanges();
        return fixture.nativeElement as HTMLElement;
    }

    it('renders a row for every symbol the broker streams', async () => {
        const el = await renderFor('exness');
        const symbols = Array.from(el.querySelectorAll('.btable__symtext')).map((a) =>
            a.textContent?.trim(),
        );
        expect(symbols).toContain('EUR/USD');
        expect(symbols).toContain('GBP/USD');
        expect(symbols.length).toBe(3);
    });

    it('includes broker-native symbols missing from SYMBOL_LIST, under "Other"', async () => {
        const el = await renderFor('exness');
        expect(el.textContent).toContain('BTCAUDm');

        const groups = Array.from(el.querySelectorAll('.btable__group')).map((h) =>
            h.textContent?.trim(),
        );
        expect(groups).toEqual(['Majors', 'Other']);
    });

    it('shows only this broker’s quotes', async () => {
        const el = await renderFor('fxpro');
        expect(el.querySelectorAll('.btable__symlink').length).toBe(1);
        expect(el.textContent).not.toContain('BTCAUDm');
    });

    it('does not render the scrolling ticker', async () => {
        const el = await renderFor('exness');
        expect(el.querySelector('app-ticker')).toBeNull();
    });

    it('links each row to its per-symbol page in lowercase', async () => {
        const el = await renderFor('exness');
        const hrefs = Array.from(el.querySelectorAll<HTMLAnchorElement>('.btable__symlink')).map(
            (a) => a.getAttribute('href'),
        );
        expect(hrefs).toContain('/exness/eurusd');
        expect(hrefs).toContain('/exness/btcaudm');
    });

    it('resolves the broker slug case-insensitively', async () => {
        const el = await renderFor('ExNeSs');
        expect(el.querySelector('.bstage__title')?.textContent?.trim()).toBe('Exness');
    });

    it('shows the broker’s own tightest spread', async () => {
        const el = await renderFor('exness');
        const stats = el.querySelector('.bstats')?.textContent ?? '';
        expect(stats).toContain('0.00009');
        expect(stats).toContain('EUR/USD');
    });

    it('renders the not-found panel for an unknown broker', async () => {
        const el = await renderFor('nosuchbroker');
        expect(el.querySelector('app-not-found-panel')).not.toBeNull();
        expect(el.querySelector('.btable__table')).toBeNull();
        // …and offers the brokers that do exist.
        const links = Array.from(el.querySelectorAll<HTMLAnchorElement>('.nf__links a')).map((a) =>
            a.getAttribute('href'),
        );
        expect(links).toEqual(['/exness', '/fxpro']);
    });
});
