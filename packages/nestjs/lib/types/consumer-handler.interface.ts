import { Observable } from 'rxjs';

export interface ConsumerHandler<TIn = any, TCtx = any, TOut = any> {
  (data: TIn, ctx?: TCtx): Promise<Observable<TOut>> | Promise<TOut>;
  next?: (data: TIn, ctx?: TCtx) => Promise<Observable<TOut>> | Promise<TOut>;
  extras?: Record<string, any>;
}
