import { Injectable, OnDestroy, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, Subject } from 'rxjs';
import { PriceQuote } from './price-quote';

/** Live price updates over the API's /ws/prices socket, with basic auto-reconnect. */
@Injectable({
    providedIn: 'root',
})
export class PricesWs implements OnDestroy {
    private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
    private readonly updates$ = new Subject<PriceQuote>();
    private socket?: WebSocket;
    private reconnectTimer?: ReturnType<typeof setTimeout>;
    private destroyed = false;

    connect(): Observable<PriceQuote> {
        if (this.isBrowser && !this.socket) {
            this.open();
        }
        return this.updates$.asObservable();
    }

    private open(): void {
        const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
        const socket = new WebSocket(`${protocol}://${location.host}/ws/prices`);
        this.socket = socket;

        socket.onmessage = (event) => {
            try {
                this.updates$.next(JSON.parse(event.data) as PriceQuote);
            } catch {
                // ignore malformed payloads
            }
        };

        socket.onclose = () => {
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
