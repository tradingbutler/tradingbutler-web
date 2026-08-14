import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

/** Public site origin, used to build absolute canonical/og URLs. Mirrors the
 *  hardcoded canonical that `index.html` ships for the home page. */
export const SITE_ORIGIN = 'https://tradingbuttler.com';

export interface PageSeo {
    title: string;
    description: string;
    /** Root-relative canonical path, e.g. `/exness/eurusd`. Always the
     *  lowercase form, even when the request arrived with other casing. */
    path: string;
    /** Root-relative social image. Defaults to the site-wide OG image. */
    image?: string;
}

/**
 * Per-route title/description/canonical handling.
 *
 * Before routing existed the whole site was one page, so `App.ngOnInit` set
 * these once and `index.html` could hardcode `<link rel="canonical">` at the
 * site root. With real sub-routes each page owns its own metadata, and the
 * canonical has to be rewritten on every navigation — otherwise every broker
 * page claims to be the home page.
 */
@Injectable({ providedIn: 'root' })
export class Seo {
    private readonly title = inject(Title);
    private readonly meta = inject(Meta);
    private readonly doc = inject(DOCUMENT);

    setPage(page: PageSeo): void {
        const url = `${SITE_ORIGIN}${page.path}`;
        const image = `${SITE_ORIGIN}${page.image ?? '/og-image.png'}`;

        this.title.setTitle(page.title);
        this.meta.updateTag({ name: 'description', content: page.description });
        this.meta.updateTag({ property: 'og:title', content: page.title });
        this.meta.updateTag({ property: 'og:description', content: page.description });
        this.meta.updateTag({ property: 'og:type', content: 'website' });
        this.meta.updateTag({ property: 'og:url', content: url });
        this.meta.updateTag({ property: 'og:image', content: image });
        this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
        this.meta.updateTag({ name: 'twitter:image', content: image });
        this.setCanonical(url);
    }

    /** Marks the current page as not-indexable — used for the not-found state,
     *  which would otherwise be indexed as a thin duplicate of every other
     *  mistyped URL. Cleared again by the next `setPage()` call. */
    setNoIndex(): void {
        this.meta.updateTag({ name: 'robots', content: 'noindex, follow' });
    }

    private setIndexable(): void {
        this.meta.updateTag({ name: 'robots', content: 'index, follow' });
    }

    /**
     * Adds or replaces a keyed JSON-LD block. Keyed by `id` so navigating
     * between broker pages replaces the previous breadcrumb rather than
     * stacking a second one into the document.
     */
    setJsonLd(id: string, data: unknown | null): void {
        const existing = this.doc.getElementById(id);
        if (data === null) {
            existing?.remove();
            return;
        }
        const script = existing ?? this.doc.createElement('script');
        script.id = id;
        script.setAttribute('type', 'application/ld+json');
        script.textContent = JSON.stringify(data);
        if (!existing) {
            this.doc.head.appendChild(script);
        }
    }

    private setCanonical(href: string): void {
        this.setIndexable();
        const head = this.doc.head;
        let link = head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
        if (!link) {
            link = this.doc.createElement('link');
            link.setAttribute('rel', 'canonical');
            head.appendChild(link);
        }
        link.setAttribute('href', href);
    }
}
