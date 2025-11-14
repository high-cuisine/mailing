import { Module } from '@nestjs/common';
import { RedisModuleCustom as RedisModuleCore } from './core/redis/redis.module';
import { ExelModule } from './modules/Exel-Module/exelModule.module';
import { TelegramModule } from './modules/telegram/telegram.module';
import { UserBotsModule } from './modules/userbots/UserBots.module';
import { MailingModule } from './modules/mailing/Mailing.module';
import { ProccesorModule } from './modules/proccesor/proccesor.module';


@Module({
  imports: [RedisModuleCore, ExelModule, TelegramModule, UserBotsModule, MailingModule, ProccesorModule ],
  controllers: [],
  providers: [],
})
export class AppModule {}
