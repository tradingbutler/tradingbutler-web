import { Component } from '@angular/core';

interface Stat {
  value: string;
  label: string;
}

const STATS: Stat[] = [
  { value: '5', label: 'Regulated brokers compared' },
  { value: '12', label: 'Instruments tracked live' },
  { value: '<1s', label: 'Spread update latency' },
  { value: '0 fees', label: 'Always free to compare' },
];

@Component({
  selector: 'app-trust',
  imports: [],
  templateUrl: './trust.html',
  styleUrl: './trust.scss',
})
export class Trust {
  protected readonly stats = STATS;
}
