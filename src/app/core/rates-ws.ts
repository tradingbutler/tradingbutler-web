import { Injectable, OnDestroy, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, Subject } from 'rxjs';
import { RateTickMessage } from './rate-tick';
import { RATES_ENDPOINT } from './rates-endpoint';

/** Live per-symbol ticks over rate-streamer's /ws socket, with basic auto-reconnect. */
@Injectable({
    providedIn: 'root',
})
export class RatesWs implements OnDestroy {
    private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
    private readonly endpoint = inject(RATES_ENDPOINT);
    private readonly ticks$ = new Subject<RateTickMessage>();
    private socket?: WebSocket;
    private reconnectTimer?: ReturnType<typeof setTimeout>;
    private destroyed = false;
    private started = false;

    /** Opens the socket on first subscription — nothing connects until a
     *  consumer actually calls `connect()`. */
    connect(): Observable<RateTickMessage> {
        if (this.isBrowser && !this.started) {
            this.started = true;
            this.open();
        }
        return this.ticks$.asObservable();
    }

    private open(): void {
        const socket = new WebSocket(this.endpoint);
        this.socket = socket;

        socket.onopen = () => console.log('[RatesWs] connected', this.endpoint);

        socket.onmessage = async (event) => {
            try {
                const text: string =
                    event.data instanceof Blob ? await event.data.text() : String(event.data);
                const msg = JSON.parse(text) as RateTickMessage;
                if (msg.type === 'tick' && msg.broker && msg.symbol && msg.data) {
                    this.ticks$.next(msg);
                }
            } catch {
                // ignore malformed payloads
            }
        };

        socket.onerror = (err) => console.error('[RatesWs] error', err);

        socket.onclose = (ev) => {
            console.warn('[RatesWs] closed', ev.code, ev.reason);
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
