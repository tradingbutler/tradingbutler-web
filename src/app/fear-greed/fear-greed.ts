import { Component, afterNextRender, computed, input, signal } from '@angular/core';

type Status = 'loading' | 'ready' | 'error';
type Variant = 'crypto' | 'stocks';

interface SourceCfg {
  endpoint: string;
  /** Pulls a 0–100 value (and optional label) out of that source's payload. */
  parse: (json: unknown) => { value: number; classification?: string };
}

/**
 * Each source is fetched directly from the browser; both send permissive CORS.
 * Stocks uses a CNN-methodology mirror because CNN's own endpoint blocks bots.
 */
const SOURCES: Record<Variant, SourceCfg> = {
  crypto: {
    endpoint: 'https://api.alternative.me/fng/?limit=1',
    parse: (json) => {
      const point = (json as { data?: Array<{ value?: string; value_classification?: string }> })
        .data?.[0];
      return { value: Number(point?.value), classification: point?.value_classification };
    },
  },
  stocks: {
    endpoint: 'https://feargreedchart.com/api/?action=current',
    parse: (json) => ({ value: Number((json as { score?: { score?: number } }).score?.score) }),
  },
};

/** Standard Fear & Greed bands, used when a source gives no label of its own. */
function classify(v: number): string {
  if (v < 25) return 'Extreme Fear';
  if (v < 45) return 'Fear';
  if (v <= 55) return 'Neutral';
  if (v <= 74) return 'Greed';
  return 'Extreme Greed';
}

/**
 * Fear & Greed gauge — a single real 0–100 sentiment reading. Works for crypto
 * (alternative.me) or stocks (CNN-style mirror) via the `variant` input. Fetched
 * browser-only through afterNextRender so it never runs during SSR/prerender.
 */
@Component({
  selector: 'app-fear-greed',
  imports: [],
  templateUrl: './fear-greed.html',
  styleUrl: './fear-greed.scss',
})
export class FearGreed {
  readonly variant = input<Variant>('crypto');
  readonly eyebrow = input('Market sentiment');
  readonly title = input('Crypto Fear & Greed');
  readonly sub = input(
    'A live 0–100 read on how the crypto market is feeling right now. Extreme fear can signal ' +
      'a buying opportunity; extreme greed often precedes a pullback.',
  );
  readonly source = input('Aggregated from trusted market sources · updates daily');

  protected readonly status = signal<Status>('loading');
  protected readonly value = signal<number | null>(null);
  protected readonly classification = signal('');

  /** Accent colour by zone, mirroring the classic Fear & Greed palette. */
  protected readonly color = computed(() => {
    const v = this.value();
    if (v === null) return 'var(--tb-text-faint)';
    if (v < 25) return 'var(--tb-red)';
    if (v < 45) return '#e8893b';
    if (v < 55) return 'var(--tb-accent)';
    if (v < 75) return '#7bc86c';
    return 'var(--tb-green)';
  });

  constructor() {
    afterNextRender(() => this.load());
  }

  private async load(): Promise<void> {
    const cfg = SOURCES[this.variant()];
    try {
      const res = await fetch(cfg.endpoint, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { value, classification } = cfg.parse(await res.json());
      if (Number.isNaN(value)) throw new Error('malformed response');
      const v = Math.max(0, Math.min(100, Math.round(value)));
      this.value.set(v);
      this.classification.set(classification || classify(v));
      this.status.set('ready');
    } catch {
      this.status.set('error');
    }
  }
}
