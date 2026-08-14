import { Component, ChangeDetectionStrategy } from '@angular/core';

/**
 * Decorative backdrop for the per-broker landing page — "the service counter".
 *
 * A gold spotlight falls from the upper right onto a counter the butler stands
 * behind, with concentric arcs and a faint floor grid receding behind him. The
 * butler PNG is layered in front of this by the page; nothing here touches his
 * artwork.
 *
 * Inline SVG, no randomness and no browser APIs, so it renders identically
 * during SSR and after hydration — the same approach as the `SpreadHistory`
 * sparkline and the `Features` icons.
 */
@Component({
    selector: 'app-broker-stage',
    imports: [],
    template: `
        <svg
            class="stage"
            viewBox="0 0 800 440"
            preserveAspectRatio="xMidYMax slice"
            aria-hidden="true"
            focusable="false"
        >
            <defs>
                <radialGradient id="stage-glow" cx="72%" cy="8%" r="70%">
                    <stop offset="0%" stop-color="var(--tb-accent)" stop-opacity="0.30" />
                    <stop offset="45%" stop-color="var(--tb-accent)" stop-opacity="0.08" />
                    <stop offset="100%" stop-color="var(--tb-accent)" stop-opacity="0" />
                </radialGradient>
                <linearGradient id="stage-cone" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="var(--tb-accent)" stop-opacity="0.22" />
                    <stop offset="100%" stop-color="var(--tb-accent)" stop-opacity="0" />
                </linearGradient>
                <linearGradient id="stage-counter" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="var(--tb-surface-3)" />
                    <stop offset="100%" stop-color="var(--tb-surface)" />
                </linearGradient>
                <linearGradient id="stage-floor" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stop-color="var(--tb-border)" stop-opacity="0" />
                    <stop offset="50%" stop-color="var(--tb-border-strong)" stop-opacity="0.9" />
                    <stop offset="100%" stop-color="var(--tb-border)" stop-opacity="0" />
                </linearGradient>
            </defs>

            <!-- Arcs receding behind the figure -->
            <g class="stage__arcs">
                <circle cx="560" cy="300" r="250" />
                <circle cx="560" cy="300" r="185" />
                <circle cx="560" cy="300" r="120" />
            </g>

            <!-- Floor grid: fixed positions, deliberately not generated -->
            <g class="stage__grid">
                <path d="M120 440 L330 322" />
                <path d="M260 440 L410 322" />
                <path d="M400 440 L490 322" />
                <path d="M540 440 L570 322" />
                <path d="M680 440 L650 322" />
                <path d="M0 380 H800" />
                <path d="M0 350 H800" />
            </g>

            <!-- Spotlight from the upper right -->
            <path class="stage__cone" d="M690 -40 L905 350 L300 350 Z" fill="url(#stage-cone)" />
            <rect width="800" height="440" fill="url(#stage-glow)" />

            <!-- Horizon and the counter he stands behind -->
            <rect
                class="stage__horizon"
                x="0"
                y="321"
                width="800"
                height="2"
                fill="url(#stage-floor)"
            />
            <ellipse
                class="stage__counter"
                cx="560"
                cy="392"
                rx="235"
                ry="34"
                fill="url(#stage-counter)"
            />
            <ellipse class="stage__counter-lip" cx="560" cy="386" rx="235" ry="34" />
        </svg>
    `,
    changeDetection: ChangeDetectionStrategy.Eager,
    styles: [
        `
            :host {
                position: absolute;
                inset: 0;
                overflow: hidden;
                border-radius: inherit;
                pointer-events: none;
            }
            .stage {
                width: 100%;
                height: 100%;
                display: block;
            }
            .stage__arcs circle {
                fill: none;
                stroke: var(--tb-border-strong);
                stroke-width: 1;
                opacity: 0.5;
            }
            .stage__grid path {
                fill: none;
                stroke: var(--tb-border);
                stroke-width: 1;
                opacity: 0.55;
            }
            .stage__counter-lip {
                fill: none;
                stroke: var(--tb-accent);
                stroke-width: 1.5;
                opacity: 0.35;
            }
        `,
    ],
})
export class BrokerStage {}
