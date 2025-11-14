export class MessageDTO {
    platform: 'telegram' | 'whatsapp';
    number: string;
    message: string
}