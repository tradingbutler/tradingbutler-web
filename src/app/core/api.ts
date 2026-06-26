import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { PriceQuote } from './price-quote';

@Injectable({
    providedIn: 'root',
})
export class Api {
    constructor(private readonly http: HttpClient) {}

    getPrices(): Observable<PriceQuote[]> {
        return this.http.get<PriceQuote[]>('/api/prices');
    }
}
