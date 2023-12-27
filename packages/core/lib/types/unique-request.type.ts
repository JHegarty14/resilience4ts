export type UniqueRequest<T extends Record<string, any>> = T & { requestId: string };

export type UniqueId = string | number | symbol;
