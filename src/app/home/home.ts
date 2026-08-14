import { Component, OnInit, ChangeDetectionStrategy, inject } from '@angular/core';
import { BrokerRanking } from '../broker-ranking/broker-ranking';
import { Faq } from '../faq/faq';
import { FearGreed } from '../fear-greed/fear-greed';
import { Features } from '../features/features';
import { Hero } from '../hero/hero';
import { MarketClock } from '../market-clock/market-clock';
import { Seo } from '../core/seo';
import { Ticker } from '../ticker/ticker';
import { Trust } from '../trust/trust';

/**
 * The landing page — everything that used to live directly in `app.html`
 * before routing existed. The site shell (risk bar, header, footer) stays in
 * `App`; this is the `''` route's content.
 *
 * The scrolling `<app-ticker />` marquee lives here rather than in the shell
 * on purpose: it is a home-page device, and the per-broker landing pages
 * deliberately do without it.
 */
@Component({
    selector: 'app-home',
    imports: [Ticker, Hero, BrokerRanking, Trust, Features, MarketClock, FearGreed, Faq],
    templateUrl: './home.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './home.scss',
})
export class Home implements OnInit {
    private readonly seo = inject(Seo);

    ngOnInit(): void {
        this.seo.setPage({
            title: 'TradingButler — Compare Live Broker Spreads | Forex, Gold & Crypto',
            description:
                'Compare live forex, gold and crypto spreads across regulated brokers in real time. ' +
                'See the tightest spread for EUR/USD, XAU/USD, BTC/USD and more, then open an account in one click.',
            path: '/',
        });
    }
}
