import { RedisService } from "@infra/redis/redis.service";
import { BadRequestException, Injectable } from "@nestjs/common";
import { FiatWalletRepository } from "../repositories/sbp.repository";
import { IdngoService } from "./idngo.service";
import { UserRepository } from "src/user/repositoryes/user.repository";
import { RegisterClientDTO } from "../interfaces/create-client.inteface";
import { FiatTransactionRepository } from "../repositories/transaction.repository";

@Injectable()
export class SbpService {
    constructor(
        private readonly redisService: RedisService,
        private readonly fiatWalletRepository: FiatWalletRepository,
        private readonly idngoService: IdngoService,
        private readonly userRepository: UserRepository,
        private readonly fiatTransactionRepository: FiatTransactionRepository,
    ) {

    }

    async registerClient(userId:number) {

       const walletUser = await this.getWallet(userId);

       if(walletUser) {
        throw new BadRequestException('User is already registered in SBP wallet');
       }

       const user = await this.userRepository.getUserWithPrivate(userId);

       if(!user) {
        throw new BadRequestException('User not found');
       }

       const result = await this.idngoService.getResults(user.privateData[0].email);

       if (!result.info.idDocs || result.info.idDocs.length === 0) {
        throw new BadRequestException('User ID documents not found');
       }

       const idDoc = result.info.idDocs[0];
       const address = result.info.addresses && result.info.addresses.length > 0 
        ? result.info.addresses[0].formattedAddress 
        : '';

       const registerClientDTO: RegisterClientDTO = {
        clientCode: user.client_code,
        firstName: result.info.firstName || user.privateData[0].first_name,
        patronymic: user.privateData[0].second_name || '',
        lastName: result.info.lastName || user.privateData[0].surname,
        birthDate: result.info.dob,
        persondocNumber: idDoc.number,
        persondocIssdate: idDoc.issuedDate,
        persondocIssby: idDoc.issueAuthorityCode || '',
        address: address,
        email: result.email || user.privateData[0].email,
       }
    }

    async createOrder(userId:number) {
        const wallet = await this.getWallet(userId);
        
        if(!Boolean(wallet)) {
            throw new BadRequestException('not wallet of user')
        }
    }

    async getUserOrders(userId:number, amount:number) {
        const wallet = await this.getWallet(userId);

        if(!Boolean(wallet)) {
            throw new BadRequestException('not wallet of user')
        }

        const order = await this.fiatTransactionRepository.createOrder(userId, amount);

        return order;
    }

    private async getWallet(userId:number) {
        const walletUserCache = await this.redisService.get(`fiat-wallet-${userId}`);

        if(walletUserCache) {
            return walletUserCache
        }

        const walletUser = await this.fiatWalletRepository.findOneByUserId(userId);

        await this.redisService.set(`fiat-wallet-${userId}`, walletUser, 60 * 10); //10 minuts

        return walletUser;
    }
}