import { ResilienceModule } from '@forts/resilience4ts-nestjs';
import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppGateway } from './app.gateway';
import { AppService } from './app.service';
import { AllExceptionsFilter } from './exception.filter';

@Module({
  imports: [ResilienceModule.forRoot()],
  controllers: [AppController],
  providers: [
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: 'AppService',
      useClass: AppService,
    },
    {
      provide: 'AppGateway',
      useClass: AppGateway,
    },
  ],
})
export class AppModule {}
