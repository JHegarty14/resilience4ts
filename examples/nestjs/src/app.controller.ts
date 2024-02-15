import { Body, Controller, Get, Inject, Post } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(
    @Inject('AppService')
    private readonly appService: AppService,
  ) {}

  @Get()
  async getHello() {
    return await this.appService.getHello({ id: 'asdf' });
  }

  @Post()
  async postHello(@Body() body: any) {
    return await this.appService.postHello(body);
  }
}
