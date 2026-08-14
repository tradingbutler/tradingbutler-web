import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';

describe('App', () => {
    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [App],
            providers: [provideRouter([])],
        }).compileComponents();
    });

    it('should create the app', () => {
        const fixture = TestBed.createComponent(App);
        const app = fixture.componentInstance;
        expect(app).toBeTruthy();
    });

    it('renders the shell: risk bar, header, routed outlet and footer', async () => {
        // `App` is the shell only — page content comes from the router, so it
        // deliberately renders no heading of its own.
        const fixture = TestBed.createComponent(App);
        await fixture.whenStable();
        const compiled = fixture.nativeElement as HTMLElement;

        expect(compiled.querySelector('.risk-bar')).not.toBeNull();
        expect(compiled.querySelector('app-header')).not.toBeNull();
        expect(compiled.querySelector('router-outlet')).not.toBeNull();
        expect(compiled.querySelector('.page-footer')).not.toBeNull();
    });
});
