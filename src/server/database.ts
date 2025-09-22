import { Client } from "pg";
import * as database from "../../database.json";

let _client: Client | null = null;

export async function getClient(): Promise<Client> {
  if (_client == null) {
    _client = new Client({ ...database, host: process.env.DB_HOST });
    await _client.connect();
  }
  return _client;
}
