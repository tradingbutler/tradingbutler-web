import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideHttpClient } from '@angular/common/http';

import { Hero } from './hero';
import { RATES_ENDPOINT } from '../core/rates-endpoint';

describe('Hero', () => {
    let component: Hero;
    let fixture: ComponentFixture<Hero>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [Hero],
            providers: [
                provideHttpClient(),
                // `Hero.ngOnInit` calls `MarketData.start()`, which opens a
                // WebSocket. `isPlatformBrowser` is true under jsdom, but jsdom
                // rejects the default relative `/ws` URL that a real browser
                // would resolve against the page origin — so point it at an
                // absolute one for the test.
                { provide: RATES_ENDPOINT, useValue: 'ws://localhost:1/ws' },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(Hero);
        component = fixture.componentInstance;
        await fixture.whenStable();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
