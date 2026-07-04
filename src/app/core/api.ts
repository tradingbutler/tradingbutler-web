import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BrokerRecord } from './broker-registry';
import { RatesSnapshot } from './rate-registry';

@Injectable({
    providedIn: 'root',
})
export class Api {
    constructor(private readonly http: HttpClient) {}

    /** Fetches the broker registry snapshot written by json-writer, served as a
     *  static asset at the site root (`web/public/brokers.json`). */
    getBrokers(): Observable<Record<string, BrokerRecord>> {
        return this.http.get<Record<string, BrokerRecord>>('/brokers.json');
    }

    /** Fetches the rates snapshot written by json-writer, served as a static
     *  asset at the site root (`web/public/rates.json`). */
    getRates(): Observable<RatesSnapshot> {
        return this.http.get<RatesSnapshot>('/rates.json');
    }
}
