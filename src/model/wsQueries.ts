export interface WebSocketQuery extends Record<string, any> {}

export interface GameWebSocketQuery extends WebSocketQuery {
  id: string;
  password?: string;
}
