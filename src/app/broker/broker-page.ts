import {
    Component,
    OnInit,
    computed,
    effect,
    inject,
    input,
    ChangeDetectionStrategy,
} from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { BrokerStage } from './broker-stage';
import { MarketData } from '../core/market-data';
import { Mascot } from '../mascot/mascot';
import { NotFoundLink, NotFoundPanel } from '../shared/not-found-panel';
import { PriceQuote } from '../core/price-quote';
import { SITE_ORIGIN, Seo } from '../core/seo';
import { SpreadHistory } from '../broker-ranking/spread-history';
import { SymbolIcon } from '../shared/symbol-icon';
import { SYMBOL_GROUP_ORDER, SymbolGroup, digitsFor, groupFor, labelFor } from '../core/symbols';

interface SymbolGroupRows {
    group: SymbolGroup;
    rows: PriceQuote[];
}

/**
 * The per-broker landing page at `/{broker}`.
 *
 * Deliberately *not* the home page with a filter applied: there is no
 * scrolling ticker here, and instead of a per-instrument broker ranking the
 * page leads with the full table of every symbol this one broker streams.
 */
@Component({
    selector: 'app-broker-page',
    imports: [
        DatePipe,
        DecimalPipe,
        RouterLink,
        BrokerStage,
        Mascot,
        NotFoundPanel,
        SpreadHistory,
        SymbolIcon,
    ],
    templateUrl: './broker-page.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './broker-page.scss',
})
export class BrokerPage implements OnInit {
    /** The `:broker` route segment, bound by `withComponentInputBinding()`. */
    readonly broker = input.required<string>();

    protected readonly marketData = inject(MarketData);
    private readonly seo = inject(Seo);
    protected readonly digitsFor = digitsFor;
    protected readonly labelFor = labelFor;

    /** The real broker id behind the URL slug, or `undefined` if we don't have
     *  that broker. Canonical URLs are lowercase but any casing resolves. */
    protected readonly brokerId = computed(() => this.marketData.resolveBrokerSlug(this.broker()));

    protected readonly record = computed(() => {
        const id = this.brokerId();
        return id ? this.marketData.brokerRegistry().get(id) : undefined;
    });

    protected readonly name = computed(() => this.record()?.name ?? this.brokerId() ?? '');

    /** Lowercase slug used to build every link out of this page, so the URLs
     *  we emit always match the canonical we advertise. */
    protected readonly slug = computed(() => (this.brokerId() ?? '').toLowerCase());

    protected readonly quotes = computed(() => {
        const id = this.brokerId();
        return id ? this.marketData.quotesForBroker(id) : [];
    });

    /** The broker's symbols bucketed by asset class, empty groups dropped.
     *  Broker-specific codes outside `SYMBOL_LIST` land in "Other". */
    protected readonly groups = computed<SymbolGroupRows[]>(() => {
        const byGroup = new Map<SymbolGroup, PriceQuote[]>();
        for (const quote of this.quotes()) {
            const group = groupFor(quote.symbol);
            const rows = byGroup.get(group);
            if (rows) {
                rows.push(quote);
            } else {
                byGroup.set(group, [quote]);
            }
        }
        return SYMBOL_GROUP_ORDER.filter((g) => byGroup.has(g)).map((group) => ({
            group,
            rows: byGroup.get(group) ?? [],
        }));
    });

    /** This broker's own tightest-spread instrument. */
    protected readonly tightest = computed<PriceQuote | undefined>(() => {
        let best: PriceQuote | undefined;
        for (const quote of this.quotes()) {
            if (!best || quote.spread < best.spread) {
                best = quote;
            }
        }
        return best;
    });

    /** Most recent tick timestamp across all of this broker's symbols. */
    protected readonly lastTick = computed(() => {
        let latest = 0;
        for (const quote of this.quotes()) {
            if (quote.ts > latest) {
                latest = quote.ts;
            }
        }
        return latest;
    });

    /** How many other brokers we could rank this one against. */
    protected readonly otherBrokers = computed(() =>
        Math.max(0, this.marketData.brokerRates().size - 1),
    );

    protected readonly notFoundLinks = computed<NotFoundLink[]>(() =>
        Array.from(this.marketData.brokerRates().values()).map((b) => ({
            label: b.broker?.name ?? b.id,
            path: `/${b.id.toLowerCase()}`,
        })),
    );

    constructor() {
        // An effect rather than ngOnInit: navigating straight from /exness to
        // another broker reuses this component and only swaps the input, so
        // one-shot lifecycle metadata would go stale.
        effect(() => this.applySeo());
    }

    ngOnInit(): void {
        // Nothing else on this page calls it — `Hero`/`Ticker` are home-only,
        // so without this the live socket never connects here.
        this.marketData.start();
    }

    protected rowLink(symbol: string): string[] {
        return ['/', this.slug(), symbol.toLowerCase()];
    }

    private applySeo(): void {
        const id = this.brokerId();
        if (!id) {
            this.seo.setPage({
                title: 'Broker not found | TradingButler',
                description: 'That broker is not one we currently track.',
                path: `/${this.broker().toLowerCase()}`,
            });
            this.seo.setNoIndex();
            this.seo.setJsonLd('ld-breadcrumb', null);
            return;
        }

        const name = this.name();
        const path = `/${this.slug()}`;
        const symbols = this.quotes()
            .slice(0, 3)
            .map((q) => labelFor(q.symbol))
            .join(', ');

        this.seo.setPage({
            title: symbols
                ? `${name} live spreads — ${symbols} | TradingButler`
                : `${name} live spreads | TradingButler`,
            description:
                `Live bid, ask and spread for every instrument ${name} streams, updated in real time. ` +
                `Compare ${name}'s spreads against other regulated brokers and open an account.`,
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
                { '@type': 'ListItem', position: 2, name, item: `${SITE_ORIGIN}${path}` },
            ],
        });
    }
}
