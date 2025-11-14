import { Module } from "@nestjs/common";
import { MailingService } from "./Mailing.service";
import { MailingController } from "./Mailing.controller";
import { ProccesorModule } from "../proccesor/proccesor.module";

@Module({
    imports: [ProccesorModule],
    controllers: [MailingController],
    providers: [MailingService],
    exports: [MailingService]
})
export class MailingModule {}