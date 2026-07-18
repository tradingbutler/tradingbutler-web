import { Component, signal, ChangeDetectionStrategy } from '@angular/core';

interface MascotState {
    image: string;
    tip: string;
}

@Component({
    selector: 'app-mascot',
    imports: [],
    templateUrl: './mascot.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './mascot.scss',
})
export class Mascot {
    protected readonly state = signal<MascotState>({
        image: 'mascot/butler-hero-ext.png',
        tip: 'Good evening. I have gathered the latest spreads for you.',
    });
}
