import { Component } from '@angular/core';

interface Feature {
    icon: 'bolt' | 'shield' | 'chart' | 'award' | 'monitor' | 'support';
    title: string;
    description: string;
}

const FEATURES: Feature[] = [
    {
        icon: 'bolt',
        title: 'Real-time data',
        description: 'Prices stream straight from trusted broker sources, refreshed continuously.',
    },
    {
        icon: 'shield',
        title: 'Regulated only',
        description: 'Every broker listed is vetted for regulation before it appears here.',
    },
    {
        icon: 'chart',
        title: 'Deep analytics',
        description: 'Spread history and broker performance, tracked over time.',
    },
    {
        icon: 'award',
        title: 'Top broker picks',
        description: 'Always see the tightest spread for your pair, ranked automatically.',
    },
    {
        icon: 'monitor',
        title: 'Market monitor',
        description: 'Majors, metals, crypto, energy, and indices, all in one view.',
    },
    {
        icon: 'support',
        title: 'Live support',
        description: 'The butler is on call whenever you need a second opinion.',
    },
];

@Component({
    selector: 'app-features',
    imports: [],
    templateUrl: './features.html',
    styleUrl: './features.scss',
})
export class Features {
    protected readonly features = FEATURES;
}
