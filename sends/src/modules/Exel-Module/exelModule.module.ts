import { Module } from '@nestjs/common';
import { ExelService } from './exelModule.service';

@Module({
    imports:[],
    providers: [ExelService],
    controllers: [],
    exports:[ExelService]
})
export class ExelModule {}
 