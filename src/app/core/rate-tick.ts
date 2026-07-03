import { RateRecord } from './rate-registry';

/** A single live tick pushed by rate-streamer over its /ws broadcast. */
export interface RateTickMessage {
    type: string;
    broker: string;
    symbol: string;
    data: RateRecord;
}
