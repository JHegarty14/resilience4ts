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
    const haeh: any = await this.appService.getHello({ id: 'asdf' });
    console.log('HAEH', haeh);
    return haeh;
  }

  @Post()
  async postHello(@Body() body: any) {
    return await this.appService.postHello(body);
  }
}
