import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { BrokerSymbolPage } from './broker-symbol-page';
import { INITIAL_BROKERS, INITIAL_RATES } from '../core/initial-data';
import { RATES_ENDPOINT } from '../core/rates-endpoint';
import { TEST_BROKERS, TEST_RATES } from '../core/test-fixtures';

describe('BrokerSymbolPage', () => {
    let fixture: ComponentFixture<BrokerSymbolPage>;

    async function renderFor(broker: string, symbol: string): Promise<HTMLElement> {
        await TestBed.configureTestingModule({
            imports: [BrokerSymbolPage],
            providers: [
                provideRouter([]),
                provideHttpClient(),
                { provide: INITIAL_BROKERS, useValue: TEST_BROKERS },
                { provide: INITIAL_RATES, useValue: TEST_RATES },
                { provide: RATES_ENDPOINT, useValue: 'ws://localhost:1/ws' },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(BrokerSymbolPage);
        fixture.componentRef.setInput('broker', broker);
        fixture.componentRef.setInput('symbol', symbol);
        await fixture.whenStable();
        fixture.detectChanges();
        return fixture.nativeElement as HTMLElement;
    }

    it('renders the pair’s live prices', async () => {
        const el = await renderFor('exness', 'eurusd');
        const prices = el.querySelector('.sstage__prices')?.textContent ?? '';
        expect(prices).toContain('1.14417'); // ask
        expect(prices).toContain('1.14408'); // bid
        expect(prices).toContain('0.00009'); // spread
    });

    it('resolves a lowercase slug to the broker’s own symbol casing', async () => {
        const el = await renderFor('exness', 'btcaudm');
        expect(el.querySelector('.sstage__title')?.textContent).toContain('BTCAUDm');
    });

    it('accepts any casing in the URL', async () => {
        const el = await renderFor('ExNeSs', 'EURUSD');
        expect(el.querySelector('.sstage__title')?.textContent).toContain('EUR/USD');
    });

    it('formats prices at the broker-reported precision', async () => {
        // BTCAUDm reports 1 decimal, EUR/USD reports 5.
        const el = await renderFor('exness', 'btcaudm');
        const prices = el.querySelector('.sstage__prices')?.textContent ?? '';
        expect(prices).toContain('33,114.5');
        expect(prices).not.toContain('33,114.50');
    });

    it('shows where the broker ranks against others on the pair', async () => {
        const el = await renderFor('fxpro', 'eurusd');
        const rank = el.querySelector('.sdetail__rank')?.textContent ?? '';
        expect(rank).toContain('#2');
        expect(rank).toContain('of 2 brokers');
    });

    it('says so when the broker is the only one quoting the pair', async () => {
        const el = await renderFor('exness', 'btcaudm');
        expect(el.querySelector('.sdetail__rank')).toBeNull();
        expect(el.textContent).toContain('only broker currently streaming');
    });

    it('links on to the broker’s other instruments', async () => {
        const el = await renderFor('exness', 'eurusd');
        const hrefs = Array.from(el.querySelectorAll<HTMLAnchorElement>('.siblings__list a')).map(
            (a) => a.getAttribute('href'),
        );
        expect(hrefs).toEqual(['/exness/gbpusd', '/exness/btcaudm']);
    });

    it('renders the not-found panel for a symbol the broker does not quote', async () => {
        const el = await renderFor('exness', 'xauusd');
        expect(el.querySelector('app-not-found-panel')).not.toBeNull();
        expect(el.querySelector('.sstage__prices')).toBeNull();
        // Offers the instruments this broker does quote.
        const links = Array.from(el.querySelectorAll<HTMLAnchorElement>('.nf__links a')).map((a) =>
            a.getAttribute('href'),
        );
        expect(links).toContain('/exness/eurusd');
    });

    it('renders the not-found panel for an unknown broker', async () => {
        const el = await renderFor('nosuchbroker', 'eurusd');
        expect(el.querySelector('app-not-found-panel')).not.toBeNull();
    });
});
