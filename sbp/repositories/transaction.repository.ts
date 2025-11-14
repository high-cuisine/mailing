import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class FiatTransactionRepository {
    //constructor(@InjectRepository(KycStatus) private readonly kycStatusRepository: Repository<KycStatus>) {}

   async findOneByUserId(userId: number): Promise<any | null> {
    return {}
   }
}