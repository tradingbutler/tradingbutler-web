export interface BrokerInfo {
  id: string;
  name: string;
  rating: number;
  regulator: string;
  /** Half-spread as a fraction of mid price — lower means a tighter, more competitive broker. */
  spreadFrac: number;
  affiliateUrl: string;
}

/**
 * Front-end broker roster used to drive the UI while there is no backend feed.
 * These are placeholders — names, ratings and affiliate links will be replaced
 * with real partners. Ordered roughly best-to-worst by spread.
 */
export const BROKERS: BrokerInfo[] = [
  { id: 'broker1', name: 'AlphaFX', rating: 4.8, regulator: 'FCA', spreadFrac: 0.00005, affiliateUrl: 'https://example.com/open-account/alphafx' },
  { id: 'broker2', name: 'Vertex Markets', rating: 4.7, regulator: 'ASIC', spreadFrac: 0.00006, affiliateUrl: 'https://example.com/open-account/vertex' },
  { id: 'broker3', name: 'Titan Trade', rating: 4.6, regulator: 'CySEC', spreadFrac: 0.00008, affiliateUrl: 'https://example.com/open-account/titan' },
  { id: 'broker4', name: 'Meridian FX', rating: 4.5, regulator: 'FCA', spreadFrac: 0.0001, affiliateUrl: 'https://example.com/open-account/meridian' },
  { id: 'broker5', name: 'NovaTrade', rating: 4.3, regulator: 'FSCA', spreadFrac: 0.00012, affiliateUrl: 'https://example.com/open-account/novatrade' },
];
