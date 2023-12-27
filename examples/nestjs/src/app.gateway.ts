import { Injectable, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class AppGateway {
  async getHello(args: Record<'id', string>) {
    throw new UnauthorizedException(args);
  }
}
