import { Injectable } from "@nestjs/common";
import { RedisService } from "src/core/redis/redis.service";
import { ProccesorService } from "../proccesor/services/proccesor.service";
import { MessageDTO } from "./dto/message.dto";

@Injectable()
export class MailingService {
    private readonly userList = [
        '79152424504',
        '79276857939',
        '79217902821',
        '79208655761',
        '79261868842',
        '79653181016',
        '79208788263',
        '79233363494',
        '79281795287',
        '79240196247',
        '79295599296',
        '79255401904',
        '79245007221',
        '79217560082',
        '79361052262',
        '79284940124',
        '79265328222',
    ]
    private readonly mainMessage = 'Добрый день! Вы еще ищете инвестиции для своего стартапа?'
    private readonly seconeMessage = `
                                        1. На какой стадии проект? (подойдет любая)
                                        2. Есть ли презентация (любой ответ подойдет)
                                        3. Интересно ли податься на грант от ФСИ (нужен ответ "Да")
                                        4. Готов ли созвониться с менеджером? (ответ да нужен)
                                    `
    private telegramHost = process.env.TELEGRAM_HOST || 'http://host.docker.internal:6801';
    private whatsapHost = process.env.WHATSAPP_HOST || 'http://host.docker.internal:6800';
    private adminNumber = '+79853959864';

    constructor(
        private readonly redisService: RedisService,
        private readonly proccesorService: ProccesorService
    ) {
       
    }

    private getDelay() {
        const oneMinute = 60 * 1000;
        const fifteenMinutes = 15 * 60 * 1000;
        return Math.floor(Math.random() * (fifteenMinutes - oneMinute)) + oneMinute;
    }
    async startMailing() { 
        const messages = await this.proccesorService.sendMessage(this.mainMessage);

        for(const number of this.userList) {

           
            const randomMessage = messages[Math.floor(Math.random() * messages.length)]
            await this.redisService.set(number, JSON.stringify({
                messageQuestion: randomMessage,
                step: 1,
            }), 60 * 20);

            try {
                await fetch(`${this.telegramHost}/send-message`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        phone: number,
                        message: randomMessage
                    })
                });
            } catch (error) {
                console.error(`Ошибка при отправке в Telegram для ${number}:`, error);
            }

            try {
                await fetch(`${this.whatsapHost}/send-message`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        phone: number,
                        message: randomMessage
                    })
                });
            } catch (error) {
                console.error(`Ошибка при отправке в WhatsApp для ${number}:`, error);
            }

            console.log(`Waiting for ${this.getDelay()}ms for ${number}`);
            await new Promise(resolve => setTimeout(resolve, this.getDelay()));
        }
    }

    async handleMessage(msg:MessageDTO) {
        const userJSON = await this.redisService.get(msg.number);

        if(!userJSON) return;

        const user = JSON.parse(userJSON);
        switch(user.step) {
            case 1:
                const firstAgree = await this.checkFirstAgree(user.messageQuestion, msg.message);
                if(!firstAgree) {
                    await this.redisService.del(msg.number);
                    return;
                }
                await this.sendMessage(this.seconeMessage, msg.number, msg.platform);
                await this.redisService.set(msg.number, JSON.stringify({
                    step:2,
                    messageQuestion: this.seconeMessage,
                }), 60 * 20);
                break;
            case 2:
                const secondAgree = await this.checkSecondAgree(this.seconeMessage, msg.message);
                if(!secondAgree) {
                    await this.redisService.del(msg.number);
                    return;
                }
                await this.sendMessage(`Новый лид: ${msg.number}`, this.adminNumber, msg.platform);
                await this.redisService.del(msg.number);
                break;
            
            default:
                return;
        }
    }

    private async checkFirstAgree(message: string, answer: string): Promise<boolean> {
        if(!message || !answer) return false;

        return await this.proccesorService.firstAgree(message, answer);
    }

    private async checkSecondAgree(message: string, answer: string): Promise<boolean> {
        if(!message || !answer) return false;

        return await this.proccesorService.secondAgree(message, answer);
    }

    private async sendMessage(message: string, number: string, platform: 'telegram' | 'whatsapp') {
        await fetch(`${platform === 'telegram' ? this.telegramHost : this.whatsapHost}/send-message`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                phone: number,
                message: message
            })
        });
    }
}

/*

 */