import { Type } from '@nestjs/common';
import { ConnectionOptions } from 'node:tls';
import { Transport } from '../constants';

export type TcpOptions = {
  transport?: Transport.Tcp;
  options?: {
    host?: string;
    port?: number;
    retryAttempts?: number;
    retryDelay?: number;
    // serializer?: Serializer;
    tlsOptions?: ConnectionOptions;
    // deserializer?: Deserializer;
    // socketClass?: Type<TcpSocket>;
  };
};
