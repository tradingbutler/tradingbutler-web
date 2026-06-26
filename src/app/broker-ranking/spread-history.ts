import { Component, computed, input } from '@angular/core';

/**
 * Tiny line + area sparkline of a broker's recent spread. Drawn as inline SVG
 * from the history array, so it renders during SSR/prerender (deterministic,
 * hydration-safe) and needs no charting library.
 */
@Component({
  selector: 'app-spread-history',
  imports: [],
  template: `
    @if (linePath()) {
      <svg class="spark" viewBox="0 0 100 34" preserveAspectRatio="none" aria-hidden="true">
        <path class="spark__area" [attr.d]="areaPath()" />
        <path class="spark__line" [attr.d]="linePath()" />
      </svg>
    }
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        height: 34px;
      }
      .spark {
        display: block;
        width: 100%;
        height: 34px;
        overflow: visible;
      }
      .spark__line {
        fill: none;
        stroke: var(--tb-accent);
        stroke-width: 1.5;
        stroke-linejoin: round;
        stroke-linecap: round;
        vector-effect: non-scaling-stroke;
      }
      .spark__area {
        fill: var(--tb-accent-soft);
        stroke: none;
      }
    `,
  ],
})
export class SpreadHistory {
  readonly data = input<number[]>([]);

  /** Maps the series into [0,100] × [3,31] viewBox coordinates. */
  private readonly points = computed<Array<[number, number]>>(() => {
    const d = this.data();
    if (d.length < 2) return [];
    const min = Math.min(...d);
    const max = Math.max(...d);
    const range = max - min || 1;
    const padY = 3;
    const usable = 34 - padY * 2;
    const stepX = 100 / (d.length - 1);
    return d.map((v, i) => [i * stepX, padY + (1 - (v - min) / range) * usable]);
  });

  readonly linePath = computed(() => {
    const pts = this.points();
    if (!pts.length) return '';
    return 'M' + pts.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join(' L');
  });

  readonly areaPath = computed(() => {
    const pts = this.points();
    if (!pts.length) return '';
    const line = pts.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join(' L');
    return `M0 34 L${line} L100 34 Z`;
  });
}
