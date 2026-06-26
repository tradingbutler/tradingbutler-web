import { Meta, Title } from '@angular/platform-browser';
import { isPlatformBrowser } from '@angular/common';
import { Component, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { BrokerRanking } from './broker-ranking/broker-ranking';
import { Faq } from './faq/faq';
import { FearGreed } from './fear-greed/fear-greed';
import { Features } from './features/features';
import { Header } from './header/header';
import { Hero } from './hero/hero';
import { MarketClock } from './market-clock/market-clock';
import { Markets } from './markets/markets';
import { Ticker } from './ticker/ticker';
import { Trust } from './trust/trust';

@Component({
  selector: 'app-root',
  imports: [Header, Ticker, Hero, BrokerRanking, Trust, Features, Markets, MarketClock, FearGreed, Faq],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly platformId = inject(PLATFORM_ID);

  /**
   * Support address shown in the footer. It is assembled from parts in the
   * browser only — it is never present in the server-rendered HTML or as a
   * plain string in the markup, so email-harvesting crawlers can't scrape it.
   */
  protected readonly contactEmail = signal('');

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      const user = ['s', 'upp', 'ort'].join('');
      const domain = ['tradingbuttler', 'com'].join('.');
      this.contactEmail.set(`${user}@${domain}`);
    }
  }

  protected mailtoSupport(event: MouseEvent): void {
    const address = this.contactEmail();
    if (!address) {
      return;
    }
    event.preventDefault();
    window.location.href = `mailto:${address}`;
  }

  ngOnInit(): void {
    this.title.setTitle('TradingButler — Compare Live Broker Spreads | Forex, Gold & Crypto');
    this.meta.updateTag({
      name: 'description',
      content:
        'Compare live forex, gold and crypto spreads across regulated brokers in real time. ' +
        'See the tightest spread for EUR/USD, XAU/USD, BTC/USD and more, then open an account in one click.',
    });
    this.meta.updateTag({ property: 'og:title', content: 'TradingButler — Compare Live Broker Spreads' });
    this.meta.updateTag({
      property: 'og:description',
      content: 'Live broker spread comparison for forex, gold, crypto, energy and indices.',
    });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ property: 'og:image', content: '/og-image.png' });
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:image', content: '/og-image.png' });
  }
}
