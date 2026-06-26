import { Injectable, OnDestroy, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, Subject } from 'rxjs';
import { PriceQuote } from './price-quote';
import { RATES_ENDPOINT } from './rates-endpoint';

/** Live price updates over the API's /ws/prices socket, with basic auto-reconnect. */
@Injectable({
    providedIn: 'root',
})
export class PricesWs implements OnDestroy {
    private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
    private readonly endpoint = inject(RATES_ENDPOINT);
    private readonly updates$ = new Subject<PriceQuote>();
    private socket?: WebSocket;
    private reconnectTimer?: ReturnType<typeof setTimeout>;
    private destroyed = false;

    constructor() {
        if (this.isBrowser) {
            this.open();
        }
    }

    connect(): Observable<PriceQuote> {
        return this.updates$.asObservable();
    }

    private open(): void {
        const socket = new WebSocket(this.endpoint);
        this.socket = socket;

        socket.onopen = () => console.log('[PricesWs] connected', this.endpoint);

        socket.onmessage = async (event) => {
            try {
                const text: string =
                    event.data instanceof Blob ? await event.data.text() : String(event.data);
                const msg = JSON.parse(text);
                console.log('[PricesWs]', msg);
                this.updates$.next(msg as PriceQuote);
            } catch {
                // ignore malformed payloads
            }
        };

        socket.onerror = (err) => console.error('[PricesWs] error', err);

        socket.onclose = (ev) => {
            console.warn('[PricesWs] closed', ev.code, ev.reason);
            this.socket = undefined;
            if (!this.destroyed) {
                this.reconnectTimer = setTimeout(() => this.open(), 3000);
            }
        };
    }

    ngOnDestroy(): void {
        this.destroyed = true;
        clearTimeout(this.reconnectTimer);
        this.socket?.close();
    }
}
