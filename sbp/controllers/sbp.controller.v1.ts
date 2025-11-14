import { Body, Controller, Post, Req, UnauthorizedException } from '@nestjs/common';
import { IRequest } from '@shared/types';
import { SbpService } from '../services/sbp.service';
import { CreateOrderDto } from '../dto/create-order.dto';

@Controller({
	path: 'v1/sbp',
	version: '1',
})
export class SbpController {
    constructor(private readonly sbpService: SbpService) {}

    @Post('register')
    async registerClient(@Req() request: IRequest) {
        if (!request.user?.sub) {
            throw new UnauthorizedException('User not found');
        }
        return this.sbpService.registerClient(request.user.sub);
    }          
    
    @Post('create-order')
    async createOrder(
        @Req() request: IRequest,
        @Body() body: CreateOrderDto
    ) { 
        if (!request.user?.sub) {
            throw new UnauthorizedException('User not found');
        }
        return this.sbpService.createOrder(request.user.sub, body.amount);
    }
}
