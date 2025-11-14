import { Module } from '@nestjs/common';
import { SbpService } from './services/sbp.service'
import { SbpController } from './controllers/sbp.controller.v1';
import { IdngoService } from './services/idngo.service';
import { UserRepository } from './repositories/user.repository';


@Module({
    providers: [SbpService, IdngoService, UserRepository],
    controllers: [SbpController]
})
export class SbpModule {}
