import { Component, ChangeDetectionStrategy } from '@angular/core';

/**
 * Decorative backdrop for the per-broker-symbol page — "the price plinth".
 *
 * Deliberately different geometry from `BrokerStage` so the two pages don't
 * read as the same template with different text: a tick-marked dial ring over
 * a pedestal, lit from directly above, with the instrument badge sitting on
 * top of it. Inline SVG, deterministic, SSR-safe.
 */
@Component({
    selector: 'app-symbol-plinth',
    imports: [],
    template: `
        <svg
            class="plinth"
            viewBox="0 0 360 300"
            preserveAspectRatio="xMidYMax meet"
            aria-hidden="true"
            focusable="false"
        >
            <defs>
                <radialGradient id="plinth-pool" cx="50%" cy="42%" r="52%">
                    <stop offset="0%" stop-color="var(--tb-accent)" stop-opacity="0.26" />
                    <stop offset="100%" stop-color="var(--tb-accent)" stop-opacity="0" />
                </radialGradient>
                <linearGradient id="plinth-body" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="var(--tb-surface-3)" />
                    <stop offset="100%" stop-color="var(--tb-bg)" />
                </linearGradient>
                <linearGradient id="plinth-beam" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="var(--tb-accent)" stop-opacity="0.18" />
                    <stop offset="100%" stop-color="var(--tb-accent)" stop-opacity="0" />
                </linearGradient>
            </defs>

            <!-- Light falling straight down onto the plinth -->
            <path
                class="plinth__beam"
                d="M150 0 L210 0 L268 196 L92 196 Z"
                fill="url(#plinth-beam)"
            />
            <ellipse cx="180" cy="196" rx="150" ry="52" fill="url(#plinth-pool)" />

            <!-- Dial ring with tick marks at the cardinal and half positions -->
            <g class="plinth__dial">
                <ellipse cx="180" cy="196" rx="112" ry="38" />
                <ellipse cx="180" cy="196" rx="88" ry="30" />
            </g>
            <g class="plinth__ticks">
                <path d="M68 196 h14" />
                <path d="M278 196 h-14" />
                <path d="M180 158 v10" />
                <path d="M180 234 v-10" />
                <path d="M101 170 l11 5" />
                <path d="M259 170 l-11 5" />
                <path d="M101 222 l11 -5" />
                <path d="M259 222 l-11 -5" />
            </g>

            <!-- Pedestal -->
            <path class="plinth__body" d="M124 200 h112 l-16 76 h-80 Z" fill="url(#plinth-body)" />
            <ellipse class="plinth__cap" cx="180" cy="200" rx="56" ry="18" />
            <ellipse class="plinth__base" cx="180" cy="276" rx="42" ry="13" />
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
            .plinth {
                width: 100%;
                height: 100%;
                display: block;
            }
            .plinth__dial ellipse {
                fill: none;
                stroke: var(--tb-border-strong);
                stroke-width: 1;
                opacity: 0.7;
            }
            .plinth__ticks path {
                stroke: var(--tb-accent);
                stroke-width: 1.5;
                opacity: 0.45;
            }
            .plinth__cap {
                fill: var(--tb-surface-3);
                stroke: var(--tb-accent);
                stroke-width: 1;
                stroke-opacity: 0.4;
            }
            .plinth__base {
                fill: var(--tb-bg);
                stroke: var(--tb-border-strong);
                stroke-width: 1;
            }
        `,
    ],
})
export class SymbolPlinth {}
