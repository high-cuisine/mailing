import { Injectable } from '@nestjs/common';
import { client, TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { Api } from 'telegram/tl';
import { RedisService } from 'src/core/redis/redis.service';

interface UserBots {
    session: string;
    username: string;
}

@Injectable()
export class UserBotsService {

    constructor(
        private readonly redisService: RedisService,
    ) {
        this.apiId = 9704329;
        this.apiHash = "dc73fb86db4d2e1db3b4b23b29fed49d";
      

        // // Пример последовательности логина для тестового номера:
        // const sent = this.sendCode('16362877049', this.apiId, this.apiHash)
        // .then(() => {
        //     return this.confirmLogin('16362877049', sent.phoneCodeHash, '<код из Telegram>');
        // })
        // .then((sessionResult) => {
        //     return this.sendMessage(["high_cuisine"], "Бот запущен и готов к работе.");
        // });
    }

    private readonly apiId: number;
    private readonly apiHash: string;

    async login() {
        
        const userbot = await this.redisService.srandmember("telegram:userbots");

        if (!userbot) {
            return null;
        }

        return userbot;
    
    }


    async sendCode(phoneNumber: string, apiId: number, apiHash: string) {
        // Create a new string session
        const stringSession = new StringSession('');
        
        const client = new TelegramClient(stringSession, apiId, apiHash, {
            connectionRetries: 1,
        });

        try {
            await client.connect();
            const result = await client.invoke(new Api.auth.SendCode({
                phoneNumber,
                apiId,
                apiHash,
                settings: new Api.CodeSettings({
                    allowFlashcall: true,
                    currentNumber: true,
                    allowAppHash: true,
                }),
            }));

            if (!(result instanceof Api.auth.SentCode)) {
                throw new Error('Unexpected response type from SendCode');
            }
            
            console.log('Code sent successfully:', result);
            return result;
        } catch (error) {
            console.error('Error sending code:', error);
        } finally {
            await client.disconnect();
        }
    }

    async confirmLogin(phoneNumber: string, phoneCodeHash: string, code: string): Promise<string | null> {
        const stringSession = new StringSession('');
        const client = new TelegramClient(stringSession, this.apiId, this.apiHash, {
            connectionRetries: 1,
            useWSS: true,
        });

        try {
            await client.connect();

            await client.invoke(new Api.auth.SignIn({
                phoneNumber,
                phoneCodeHash,
                phoneCode: code,
            }));

            const sessionResult = client.session.save() as string | undefined;

            if (!sessionResult || sessionResult.length === 0) {
                throw new Error('Failed to generate a Telegram session string.');
            }

            await this.redisService.sadd('telegram:userbots', sessionResult);

            return sessionResult;
        } catch (error: any) {
            if (error?.errorMessage === 'SESSION_PASSWORD_NEEDED') {
                throw new Error('Two-factor authentication enabled. Please provide the password through a separate flow.');
            }

            console.error('Error confirming login:', error);
            return null;
        } finally {
            await client.disconnect();
        }
    }

    async sendMessage(usernames:string[], message:string) {
        let client: TelegramClient | null = null;

        try {
            const sessionString = await this.redisService.srandmember("telegram:userbots");
            if (!sessionString) {
                console.log("No session found in Redis");
                return null;
            }

            const stringSession = new StringSession(sessionString);
            client = new TelegramClient(stringSession, this.apiId, this.apiHash, {
                connectionRetries: 2,
            });

            await client.connect();
            for(const username of usernames) {
                try {
                    const user = await client.invoke(new Api.users.GetUsers({ id: [username] }));
                    if (user && user.length > 0) {
                        await client.sendMessage(user[0], { message });
                    }
                } catch (error) {
                    console.error(`Error sending message to ${username}:`, error);
                }
            }
        }
        catch(error) {
            console.error("Error in sendMessage:", error);
        }
        finally {
           
        }
    }



    async loginUserBot(userbot: UserBots) {
        const client = new TelegramClient(new StringSession(userbot.session), this.apiId, this.apiHash, {
            connectionRetries: 2,
            useWSS: true,
            autoReconnect: false
        });

        await client.connect();

        // Дополнительно отключаем обновления через API
        try {
            await client.invoke(new Api.updates.GetState());
            await client.invoke(new Api.updates.GetDifference({
                pts: 0,
                date: 0,
                qts: 0
            }));
        } catch (error) {
            console.log('Ошибка при сбросе обновлений:', error.message);
        }

        return client;
    }
    

    async logoutUserBot(client:any) {
        await client.disconnect();
    }

    async inviteLeadInGroup(username:string, group:any, client:any) {
        try {
            const user = await client.getEntity(username);
        
            console.log('Приглашаем пользователя...');
            if (group instanceof Api.Channel) {
            await client.invoke(new Api.channels.InviteToChannel({
                channel: group,
                users: [user]
            }));
            } else {
            await client.invoke(new Api.messages.AddChatUser({
                chatId: group.id,
                userId: user,
                fwdLimit: 100
            }));
            }
            console.log(`Пользователь @${username} успешно приглашен в ${group.title || 'группу'}`);
        }
        catch(e) {
            throw e;
        }
    }

    async inviteLead(username: string, groupName: string, client:any) {

        if(username === 'high_cuisine') {
            return;
        }
        
        const groupIdentifier = groupName;
        const userToInvite = '@' + username;

        console.log(groupIdentifier, userToInvite);

        try {
            console.log('Получаем информацию о группе...');
            const group = await client.getEntity(groupIdentifier);
            
            console.log('Получаем информацию о пользователе...');
            const user = await client.getEntity(userToInvite);

            console.log(group, user);
            
            console.log('Приглашаем пользователя...');
            if (group instanceof Api.Channel) {
              // Для каналов/супергрупп
              await client.invoke(new Api.channels.InviteToChannel({
                channel: group,
                users: [user]
              }));
            } else {
              // Для обычных групп
              await client.invoke(new Api.messages.AddChatUser({
                chatId: group.id,
                userId: user,
                fwdLimit: 100
              }));
            }
            
            console.log(`Пользователь @${userToInvite} успешно приглашен в ${group.title || groupIdentifier}`);
          } catch (error) {
            console.error('Ошибка при приглашении:', error);
          } finally {
            await client.disconnect();
          }
    }


    async createMailing(usernames: string[], message: string) {
        const usedSessions = new Set<string>();
        const remainingUsers = new Set(usernames);
        const attempts = new Map<string, number>();
      
        while (remainingUsers.size > 0) {
          let sessionString = await this.redisService.srandmember('telegram:userbots');
      
          if (!sessionString || usedSessions.has(sessionString)) {
            sessionString = await this.login();
            if (!sessionString) {
              console.log('Нет доступных аккаунтов');
              break;
            }
          }
      
          usedSessions.add(sessionString);
          const stringSession = new StringSession(sessionString);
          const client = new TelegramClient(stringSession, this.apiId, this.apiHash, {
            connectionRetries: 2,
            useWSS: true,
            autoReconnect: true
          });
      
          try {
            await client.connect();
            const state = await client.invoke(new Api.updates.GetState());
            await client.invoke(new Api.updates.GetDifference({
              pts: state.pts,
              date: state.date,
              qts: state.qts
            }));
      
            for (const username of Array.from(remainingUsers)) {
              const attempt = attempts.get(username) ?? 0;
              if (attempt >= 3) {
                remainingUsers.delete(username);
                continue;
              }
      
              try {
                const user = await client.getEntity(username);
                await client.sendMessage(user, { message });
                console.log(`✅ Успешно отправлено ${username}`);
                remainingUsers.delete(username);
              } catch {
                attempts.set(username, attempt + 1);
                console.warn(`⚠️ Ошибка при отправке ${username}, попытка ${attempt + 1}`);
              }
            }
          } catch (error) {
            console.error('❌ Ошибка при работе с аккаунтом:', error);
          } finally {
            await client.disconnect();
          }
        }
      
        console.log('📨 Рассылка завершена');
      }
      
    

}

