import { Injectable, Logger } from "@nestjs/common";
import { AxiosService } from "@infra/axios/axios.service";
import * as crypto from 'crypto';
import { cfg } from "@infra/config";   
import { GetInfoDto } from "../dto/get-info.dto";
import { IDNGO_LEVELS } from '../contants/idngo/contants';
import { idngoApiEndPoints } from '../contants/idngo/api-end-points.config';
import { RedisService } from "@infra/redis/redis.service";

@Injectable()
export class IdngoService {

    private readonly logger = new Logger(IdngoService.name);
    constructor(
        private readonly axiosService: AxiosService,
        private readonly redisService: RedisService,
    ) {}

    private generateSignature(timestamp: string, method: string, uri: string, body: string): string {
		const signatureString = `${timestamp}${method}${uri}${body}`;
        console.log('signatureString', signatureString);
        if(body === '') {
            return crypto.createHmac('sha256', cfg.idngo.secretKey).update(signatureString).digest('hex');
        }
		return crypto.createHmac('sha256', cfg.idngo.secretKey).update(signatureString).digest('hex');
	}

	private getCurrentTimestamp(): string {
		return Math.floor(Date.now() / 1000).toString();
	}

	private getIdnGoHeaders(method: string, uri: string, body: string) {
		const timestamp = this.getCurrentTimestamp();
		const signature = this.generateSignature(timestamp, method, uri, body);
		return {
			'Content-Type': 'application/json',
			'X-App-Token': cfg.idngo.apiKey,
			'X-App-Access-Sig': signature,
			'X-App-Access-Ts': timestamp,
		};
	}


    async getIdngoAccessToken(userId: string, levelName: string = IDNGO_LEVELS.BASIC) {
        try {
            const ttlInSecs = 600 * 30;
            const query = `userId=${encodeURIComponent(userId)}&levelName=${levelName}&ttlInSecs=${ttlInSecs}`;
            const uri = `/resources/accessTokens?${query}`;

            const headers = this.getIdnGoHeaders('POST', uri, '');

            const resp = await this.axiosService.post<any>(
                cfg.idngo.baseUrl,
                uri,
                headers
            );

            return resp.data;
        }
        catch(e) {
            this.logger.error(`Error getting IDNGO access token: ${e.message}`, e.stack);
        }
    }

    async getResults(email: string) {
        
        const resp = await this.axiosService.get<GetInfoDto>(
            cfg.idngo.baseUrl,
            idngoApiEndPoints.getInfo.replace('{externalUserId}', email),
            this.getIdnGoHeaders('GET', idngoApiEndPoints.getInfo.replace('{externalUserId}', email), '')
        );

        return resp.data;
    }

    async getResultByApplicantId(applicantId: string) {
        const resp = await this.axiosService.get<GetInfoDto>(
            cfg.idngo.baseUrl,
            idngoApiEndPoints.getResults.replace('{applicantId}', applicantId),
            this.getIdnGoHeaders('GET', idngoApiEndPoints.getResults.replace('{applicantId}', applicantId), '')
        );

        return resp.data;
    }
}