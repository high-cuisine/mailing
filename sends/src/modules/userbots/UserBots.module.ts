import { Module } from '@nestjs/common';
import { UserBotsService } from './UserBots.service';

@Module({
  providers: [UserBotsService]
})
export class UserBotsModule {}
