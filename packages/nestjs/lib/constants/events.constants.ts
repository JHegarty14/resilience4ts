export const CONNECT_EVENT = 'connect';
export const DISCONNECT_EVENT = 'disconnect';
export const CONNECT_FAILED_EVENT = 'connectFailed';
export const MESSAGE_EVENT = 'message';
export const DATA_EVENT = 'data';
export const ERROR_EVENT = 'error';
export const CLOSE_EVENT = 'close';
export const SUBSCRIBE = 'subscribe';
export const CANCEL_EVENT = 'cancelled';

export const TCP_DEFAULT_PORT = 3000;
export const TCP_DEFAULT_HOST = 'localhost';

export const ECONNREFUSED = 'ECONNREFUSED';
export const CONN_ERR = 'CONN_ERR';
export const EADDRINUSE = 'EADDRINUSE';

export const CONNECTION_FAILED_MESSAGE = 'Connection to transport failed. Trying to reconnect...';

export const NO_EVENT_HANDLER = (text: TemplateStringsArray, pattern: string) =>
  `There is no matching event handler defined in the remote service. Event pattern: ${pattern}`;
export const NO_MESSAGE_HANDLER = `There is no matching message handler defined in the remote service.`;
