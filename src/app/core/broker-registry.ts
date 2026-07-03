/** A single broker entry from the json-writer broker snapshot (`brokers.json`). */
export interface BrokerRecord {
    id: string;
    name: string;
    open_account_url: string;
    /** Data-URI encoded logo image. */
    logo: string;
}
