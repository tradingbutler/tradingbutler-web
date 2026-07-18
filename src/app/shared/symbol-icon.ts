import { Component, computed, input, ChangeDetectionStrategy } from '@angular/core';
import { iconFor } from '../core/symbols';

/** Small round badge representing a symbol (its "image"), reused in the rich
 *  dropdowns and the markets tables. Pure presentational, hydration-safe. */
@Component({
    selector: 'app-symbol-icon',
    imports: [],
    template: `
        @if (icon(); as ic) {
            <span
                class="sym-icon"
                [class.sym-icon--long]="ic.short.length > 1"
                [style.background]="ic.bg"
                [style.color]="ic.fg"
                aria-hidden="true"
                >{{ ic.short }}</span
            >
        }
    `,
    changeDetection: ChangeDetectionStrategy.Eager,
    styles: [
        `
            :host {
                display: inline-flex;
                flex-shrink: 0;
            }
            .sym-icon {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 1.5rem;
                height: 1.5rem;
                border-radius: 50%;
                font-weight: 800;
                font-size: 0.82rem;
                line-height: 1;
                box-shadow:
                    inset 0 1px 0 rgba(255, 255, 255, 0.25),
                    0 1px 2px rgba(0, 0, 0, 0.35);
            }
            .sym-icon--long {
                font-size: 0.56rem;
                letter-spacing: 0.01em;
            }
        `,
    ],
})
export class SymbolIcon {
    readonly code = input.required<string>();
    protected readonly icon = computed(() => iconFor(this.code()));
}
