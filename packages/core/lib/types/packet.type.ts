export type PacketId = {
  id: string;
};

export type PacketIn<T = any> = {
  data: T;
  pattern: string;
};

export type PacketOut<T = any> = {
  err?: any;
  res?: T;
  disposed?: boolean;
  status?: string;
};

export type OutgoingRequest = PacketIn & PacketId;
export type IncomingRequest = PacketIn & PacketId;
export type OutgoingEvent = PacketIn;
export type IncomingEvent = PacketIn;
export type IncomingResponse = PacketOut & PacketId;
export type OutgoingResponse = PacketOut & PacketId;
