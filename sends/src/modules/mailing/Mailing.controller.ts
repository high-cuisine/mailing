import { Body, Controller, Post } from "@nestjs/common";
import { MailingService } from "./Mailing.service";
import { MessageDTO } from "./dto/message.dto";

@Controller('mailing')
export class MailingController {
    constructor(private readonly mailingService: MailingService) {}
    
    @Post('message')
    async handleMessage(@Body() msg: MessageDTO) {
        return;
        return await this.mailingService.handleMessage(msg);
    }
    
    @Post('start')
    async startMailing() {
        await this.mailingService.startMailing();
        return { success: true, message: 'Mailing started' };
    }
    
}