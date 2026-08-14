import { Component, input, ChangeDetectionStrategy } from '@angular/core';

/**
 * The Trading Butler himself.
 *
 * He exists only as flat PNG art, and only `butler-hero.png` (800×800) and
 * `butler-hero-ext.png` (464×738) have clean transparent alpha — the other
 * poses in `public/mascot/` have a background baked in. So the images are used
 * exactly as shipped and never edited; pages differentiate themselves with the
 * scenery composed *around* him (see `broker/broker-stage.ts` and
 * `broker/symbol-plinth.ts`).
 */
@Component({
    selector: 'app-mascot',
    imports: [],
    templateUrl: './mascot.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './mascot.scss',
})
export class Mascot {
    /** One of the two transparent cut-outs. Don't point this at the other
     *  poses without cleaning their backgrounds first. */
    readonly image = input('mascot/butler-hero-ext.png');
    /** Optional line in the butler's voice, rendered in a speech bubble
     *  beneath him. Empty hides the bubble. */
    readonly tip = input('');
    /** Rendered height. `hero` is the full landing-page figure; `compact` is
     *  the smaller framing the per-symbol page uses. */
    readonly size = input<'hero' | 'compact'>('hero');
}
