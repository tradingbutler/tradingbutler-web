import { isPlatformBrowser } from '@angular/common';
import { Component, PLATFORM_ID, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { Header } from './header/header';

/**
 * The site shell: risk bar, header, routed page, footer. Page content and its
 * title/description/canonical live in the routed components (`Home`,
 * `BrokerPage`, `BrokerSymbolPage`) — see `core/seo.ts`.
 */
@Component({
    selector: 'app-root',
    imports: [Header, RouterOutlet, RouterLink],
    templateUrl: './app.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './app.scss',
})
export class App {
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
}
