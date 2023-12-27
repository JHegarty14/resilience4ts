import type { HttpRequest } from './request';

export type ControllerMethod = (...[req, ...rest]: [HttpRequest, ...unknown[]]) => Promise<unknown>;
