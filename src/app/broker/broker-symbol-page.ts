import { DatePipe, DecimalPipe } from '@angular/common';
import {
    Component,
    OnInit,
    computed,
    effect,
    inject,
    input,
    ChangeDetectionStrategy,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { MarketData } from '../core/market-data';
import { Mascot } from '../mascot/mascot';
import { NotFoundLink, NotFoundPanel } from '../shared/not-found-panel';
import { SITE_ORIGIN, Seo } from '../core/seo';
import { SpreadHistory } from '../broker-ranking/spread-history';
import { SymbolIcon } from '../shared/symbol-icon';
import { SymbolPlinth } from './symbol-plinth';
import { digitsFor, labelFor } from '../core/symbols';

/**
 * The per-broker-symbol landing page at `/{broker}/{symbol}`.
 *
 * The tightest page on the site: one broker, one instrument, and nothing that
 * isn't about that pair's price. Its own scenery (`SymbolPlinth`) rather than
 * the broker page's, so the two don't read as one template twice.
 */
@Component({
    selector: 'app-broker-symbol-page',
    imports: [
        DatePipe,
        DecimalPipe,
        RouterLink,
        Mascot,
        NotFoundPanel,
        SpreadHistory,
        SymbolIcon,
        SymbolPlinth,
    ],
    templateUrl: './broker-symbol-page.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './broker-symbol-page.scss',
})
export class BrokerSymbolPage implements OnInit {
    readonly broker = input.required<string>();
    readonly symbol = input.required<string>();

    protected readonly marketData = inject(MarketData);
    private readonly seo = inject(Seo);
    protected readonly digitsFor = digitsFor;
    protected readonly labelFor = labelFor;

    protected readonly brokerId = computed(() => this.marketData.resolveBrokerSlug(this.broker()));

    /** The broker's real symbol code behind the lowercase URL slug — brokers
     *  quote their own names (`BTCAUDm`), so casing can't be assumed. */
    protected readonly symbolCode = computed(() => {
        const id = this.brokerId();
        return id ? this.marketData.resolveSymbolSlug(id, this.symbol()) : undefined;
    });

    protected readonly record = computed(() => {
        const id = this.brokerId();
        return id ? this.marketData.brokerRegistry().get(id) : undefined;
    });

    protected readonly name = computed(() => this.record()?.name ?? this.brokerId() ?? '');
    protected readonly slug = computed(() => (this.brokerId() ?? '').toLowerCase());
    protected readonly label = computed(() => labelFor(this.symbolCode() ?? ''));

    protected readonly quote = computed(() => {
        const id = this.brokerId();
        const code = this.symbolCode();
        return id && code ? this.marketData.quoteFor(id, code) : undefined;
    });

    /** Where this broker sits on this instrument against everyone else. */
    protected readonly standing = computed(() => {
        const id = this.brokerId();
        const code = this.symbolCode();
        return id && code ? this.marketData.rankFor(id, code) : undefined;
    });

    protected readonly history = computed(() => {
        const id = this.brokerId();
        const code = this.symbolCode();
        // Read the snapshot so this recomputes as ticks arrive; the history
        // map itself is deliberately not a signal.
        this.marketData.ratesSnapshot();
        return id && code ? this.marketData.spreadHistory(code, id) : [];
    });

    /** Sibling instruments from the same broker, for onward navigation. */
    protected readonly siblings = computed(() => {
        const id = this.brokerId();
        const code = this.symbolCode();
        if (!id) {
            return [];
        }
        return this.marketData
            .quotesForBroker(id)
            .filter((q) => q.symbol !== code)
            .slice(0, 6);
    });

    protected readonly notFoundLinks = computed<NotFoundLink[]>(() => {
        const id = this.brokerId();
        if (!id) {
            return Array.from(this.marketData.brokerRates().values()).map((b) => ({
                label: b.broker?.name ?? b.id,
                path: `/${b.id.toLowerCase()}`,
            }));
        }
        return this.marketData.quotesForBroker(id).map((q) => ({
            label: labelFor(q.symbol),
            path: `/${id.toLowerCase()}/${q.symbol.toLowerCase()}`,
        }));
    });

    constructor() {
        effect(() => this.applySeo());
    }

    ngOnInit(): void {
        this.marketData.start();
    }

    protected siblingLink(symbol: string): string[] {
        return ['/', this.slug(), symbol.toLowerCase()];
    }

    private applySeo(): void {
        const id = this.brokerId();
        const code = this.symbolCode();

        if (!id || !code) {
            this.seo.setPage({
                title: 'Instrument not found | TradingButler',
                description: 'That broker and instrument pair is not one we currently track.',
                path: `/${this.broker().toLowerCase()}/${this.symbol().toLowerCase()}`,
            });
            this.seo.setNoIndex();
            this.seo.setJsonLd('ld-breadcrumb', null);
            return;
        }

        const name = this.name();
        const label = this.label();
        const path = `/${this.slug()}/${code.toLowerCase()}`;

        this.seo.setPage({
            title: `${name} ${label} spread, live | TradingButler`,
            description:
                `Live ${label} bid, ask and spread from ${name}, updated in real time. ` +
                `See how ${name} ranks against other brokers on ${label}.`,
            path,
        });
        this.seo.setJsonLd('ld-breadcrumb', {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
                {
                    '@type': 'ListItem',
                    position: 1,
                    name: 'TradingButler',
                    item: `${SITE_ORIGIN}/`,
                },
                {
                    '@type': 'ListItem',
                    position: 2,
                    name,
                    item: `${SITE_ORIGIN}/${this.slug()}`,
                },
                { '@type': 'ListItem', position: 3, name: label, item: `${SITE_ORIGIN}${path}` },
            ],
        });
    }
}
