import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../../user/entities/user.entity';
import { Repository, UpdateResult } from 'typeorm';
import { AuditLogRepository } from '../../user/repositoryes/auditLog.repository';
import { PrivateRepository } from '../../user/repositoryes/private.repository';
import { Private } from '../../user/entities/private.entity';
import { UserWithKycStatusAndEmail } from '../../user/interfaces/user-with-kyc.interface';
import { KycStatusRepository } from '../../user/repositoryes/kycStatus.repository';
import { DataSource } from 'typeorm';

@Injectable()
export class UserRepository {
	createQueryBuilder(arg0: string) {
		throw new Error('Method not implemented.');
	}
	constructor(
		@InjectRepository(User) private readonly userRepository: Repository<User>,
		private readonly auditLogRepository: AuditLogRepository,
		private readonly privateRepository: PrivateRepository,
		private readonly kycCheckingRepository: KycStatusRepository,
		private readonly dataSource: DataSource,
	) {}

	async findAll(): Promise<User[]> {
		return await this.userRepository.find();
	}

	async findOneByField<K extends keyof User>(field: K, value: User[K]): Promise<User | null> {
		return await this.userRepository.findOne({
			where: { [field]: value },
		});
	}

	async findByField<K extends keyof User>(field: K, value: User[K]): Promise<User[]> {
		return await this.userRepository.find({
			where: { [field]: value },
		});
	}

	async create(login: string, password_hash: string, email_hash: string, phone_hash: string): Promise<User> {
		const result = await this.dataSource.query<User[]>(
			`
				WITH next_id AS (
				  SELECT nextval('users_user_id_seq') AS id
				)
				INSERT INTO "users" (
				  user_id,
				  client_code,
				  username,
				  password_hash,
				  email_hash,
				  phone_hash,
				  status
				)
				SELECT
				  id,
				  'CLIENT_' || id,
				  $1,
				  $2,
				  $3,
				  $4,
				  $5
				FROM next_id
				RETURNING *;
			  `,
			[login, password_hash, email_hash, phone_hash, 'disabled'],
		);

		const user = result[0];

		return await this.userRepository.save(user);
	}

	async update(user_id: number, data: Partial<User>): Promise<UpdateResult> {
		return await this.userRepository.update(user_id, data);
	}

	async updateField(user_id: number, field: string, value: string): Promise<UpdateResult> {
		return await this.userRepository.update({ user_id: user_id }, { [field]: value });
	}

	async checkUserExists(email_hash: string, phone_hash: string, username: string): Promise<{ exists: boolean; field?: string }> {
		const existingUser = await this.userRepository.findOne({
			where: [{ email_hash: email_hash }, { phone_hash: phone_hash }, { username: username }],
		});

		if (!existingUser) {
			return { exists: false };
		}

		// Определяем, какое именно поле уже существует
		if (existingUser.email_hash === email_hash) {
			return { exists: true, field: 'email' };
		}
		if (existingUser.phone_hash === phone_hash) {
			return { exists: true, field: 'phone' };
		}
		if (existingUser.username === username) {
			return { exists: true, field: 'login' };
		}

		return { exists: true };
	}

	async delete(userId: number) {
		await this.auditLogRepository.delete(userId);
		await this.privateRepository.delete(userId);
		await this.kycCheckingRepository.delete(userId);
		return await this.userRepository.delete(userId);
	}

	async getUserWithPrivate(user_id: number) {
		return await this.userRepository
			.createQueryBuilder('user')
			.select(['user.user_id', 'user.kyc_status'])
			.leftJoinAndSelect('user.privateData', 'private')
			.addSelect(['private.email'])
			.where('user.user_id = :user_id', { user_id })
			.getOne();
	}

	async getPrivateUserData(userId: number) {
		return await this.privateRepository.findOneByField('user_id', userId);
	}

	/**
	 * SELECT u.user_id, u.kyc_status, p.email FROM user as u WHERE user_id = $1 JOIN private as p ON user.user_id = private.user_id
	 */
	async getUserWithKycStatusAndEmail(user_id: number): Promise<UserWithKycStatusAndEmail | null> {
		const result = await this.userRepository
			.createQueryBuilder('user')
			.select(['user.user_id', 'user.kyc_status', 'private.email', 'private.phone'])
			.leftJoinAndSelect('user.privateData', 'private')
			.where('user.user_id = :user_id', { user_id })
			.getOne();

		if (!result) {
			return null;
		}

		return {
			user_id: result.user_id,
			kyc_status: result.kyc_status,
			email: result.privateData?.[0]?.email || '',
			phone: result.privateData?.[0]?.phone || '',
		};
	}

	async getUserWithPrivateByUserId(user_id: number) {
		return await this.userRepository
			.createQueryBuilder('user')
			.select(['user.user_id', 'private.email'])
			.leftJoinAndSelect('user.privateData', 'private')
			.where('user.user_id = :user_id', { user_id })
			.andWhere('user.kyc_status = :kyc_status', { kyc_status: 'pending' })
			.getOne();
	}

	async findOneByFieldCaseInsensitive(field: keyof User, value: string): Promise<User | null> {
		return await this.userRepository
			.createQueryBuilder('user')
			.where(`LOWER(user.${field}) = LOWER(:value)`, { value })
			.getOne();
	}
}
