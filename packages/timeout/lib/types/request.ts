import type { IncomingHttpHeaders } from 'http';

export type AbortableRequest = {
  signal: AbortSignal;
};

export type HttpRequest = {
  headers: IncomingHttpHeaders;
  method?: string;
  url?: string;
} & Partial<AbortableRequest>;
