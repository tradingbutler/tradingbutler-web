import { Component } from '@angular/core';

interface QA {
  q: string;
  a: string;
}

/** Keep in sync with the FAQPage JSON-LD in src/index.html. */
const FAQS: QA[] = [
  {
    q: 'What is a spread in forex and CFD trading?',
    a: 'The spread is the difference between the bid (sell) and ask (buy) price of an instrument. It is the main cost of opening a trade, so a tighter spread means you pay less every time you trade.',
  },
  {
    q: 'Which broker has the lowest spreads?',
    a: 'It changes constantly. TradingButler ranks brokers by their live spread for each instrument and highlights the tightest one, so the “best spread” broker you see is always based on current prices.',
  },
  {
    q: 'How does TradingButler get its spread data?',
    a: 'Prices stream directly from each broker through trusted data sources, are aggregated in real time, and shown side by side so you can compare like-for-like.',
  },
  {
    q: 'Are the brokers listed regulated?',
    a: 'Every broker we list is checked for regulation by a recognised authority such as the FCA, ASIC, CySEC or FSCA before it appears in the comparison.',
  },
  {
    q: 'Is TradingButler free to use?',
    a: 'Yes. Comparing spreads and opening an account through TradingButler is completely free. We may receive a commission from brokers when you open an account, which never affects the spreads you see.',
  },
  {
    q: 'How often do the spreads update?',
    a: 'Spreads update continuously — typically in under a second — so the comparison reflects current market conditions rather than stale averages.',
  },
];

@Component({
  selector: 'app-faq',
  imports: [],
  templateUrl: './faq.html',
  styleUrl: './faq.scss',
})
export class Faq {
  protected readonly faqs = FAQS;
}
