import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';

export interface NotFoundLink {
    label: string;
    path: string;
}

/**
 * Shown when a `/{broker}` or `/{broker}/{symbol}` URL doesn't resolve.
 * Rather than a dead end, it names what does exist so a mistyped or stale
 * link still lands somewhere useful.
 */
@Component({
    selector: 'app-not-found-panel',
    imports: [RouterLink],
    template: `
        <section class="nf" aria-labelledby="nf-title">
            <img
                class="nf__figure"
                src="mascot/butler-hero-ext.png"
                alt="The Trading Butler"
                width="180"
                height="286"
            />
            <div class="nf__body">
                <span class="tb-eyebrow">Not found</span>
                <h1 class="nf__title" id="nf-title">{{ title() }}</h1>
                <p class="nf__sub">{{ sub() }}</p>

                @if (links().length > 0) {
                    <ul class="nf__links">
                        @for (link of links(); track link.path) {
                            <li>
                                <a [routerLink]="link.path">{{ link.label }}</a>
                            </li>
                        }
                    </ul>
                }

                <a class="nf__home" routerLink="/" fragment="compare">
                    Back to the broker comparison
                </a>
            </div>
        </section>
    `,
    changeDetection: ChangeDetectionStrategy.Eager,
    styles: [
        `
            .nf {
                display: grid;
                grid-template-columns: auto minmax(0, 1fr);
                align-items: center;
                gap: 2rem;
                margin-top: 3rem;
                padding: 2.5rem;
                border: 1px solid var(--tb-border-strong);
                border-radius: var(--tb-radius);
                background:
                    radial-gradient(120% 140% at 80% -20%, var(--tb-accent-soft), transparent 60%),
                    var(--tb-surface);
                box-shadow: var(--tb-shadow);
            }
            .nf__figure {
                width: auto;
                height: 200px;
                object-fit: contain;
                filter: drop-shadow(0 18px 40px rgba(0, 0, 0, 0.55));
            }
            .nf__title {
                margin: 0.35rem 0 0;
                font-size: clamp(1.4rem, 3vw, 1.9rem);
                font-weight: 800;
            }
            .nf__sub {
                margin: 0.6rem 0 0;
                color: var(--tb-text-muted);
            }
            .nf__links {
                display: flex;
                flex-wrap: wrap;
                gap: 0.5rem;
                margin: 1.1rem 0 0;
                padding: 0;
                list-style: none;

                a {
                    display: inline-block;
                    padding: 0.4rem 0.8rem;
                    border: 1px solid var(--tb-border-strong);
                    border-radius: 999px;
                    background: var(--tb-surface-2);
                    color: var(--tb-text);
                    font-size: 0.88rem;
                    font-weight: 600;
                    text-decoration: none;

                    &:hover {
                        border-color: var(--tb-accent);
                        color: var(--tb-accent);
                    }
                }
            }
            .nf__home {
                display: inline-block;
                margin-top: 1.4rem;
                padding: 0.7rem 1.4rem;
                border-radius: 999px;
                background: var(--tb-accent);
                color: var(--tb-accent-contrast);
                font-weight: 700;
                text-decoration: none;

                &:hover {
                    background: var(--tb-accent-hover);
                }
            }
            @media (max-width: 640px) {
                .nf {
                    grid-template-columns: 1fr;
                    justify-items: center;
                    padding: 2rem 1.25rem;
                    text-align: center;
                }
                .nf__figure {
                    height: 150px;
                }
                .nf__links {
                    justify-content: center;
                }
            }
        `,
    ],
})
export class NotFoundPanel {
    readonly title = input('I’m afraid I don’t serve that page.');
    readonly sub = input('The address doesn’t match anything I have on the floor right now.');
    /** What does exist — rendered as pills so the visitor has somewhere to go. */
    readonly links = input<NotFoundLink[]>([]);
}
