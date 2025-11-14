import { ApiProperty } from "@nestjs/swagger";
import { IsNumber, IsNotEmpty } from "class-validator";

export class CreateOrderDto {
    @ApiProperty({
        description: 'Сумма для создания ордера сбп',
        example: 1000
    })
    @IsNumber()
    @IsNotEmpty()
    amount: number;

}