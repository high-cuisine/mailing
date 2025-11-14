import { Injectable } from "@nestjs/common";
import OpenAI from "openai";

@Injectable()
export class ProccesorService {

    private readonly openai: OpenAI;
    telegramService: any;
    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });

      
    }

    

    async sendMessage(message: string, count = 10): Promise<string[]> {
        if (!message || !message.trim()) {
            throw new Error('Message must be a non-empty string.');
        }

        if (!Number.isInteger(count) || count < 1) {
            throw new Error('Count must be a positive integer.');
        }

        const completion = await this.openai.chat.completions.create({
            model: "gpt-4o-mini",
            response_format: {
                type: "json_schema",
                json_schema: {
                    name: "message_variations",
                    schema: {
                        type: "object",
                        properties: {
                            variations: {
                                type: "array",
                                items: { type: "string" },
                                minItems: count,
                                maxItems: count
                            }
                        },
                        required: ["variations"],
                        additionalProperties: false
                    }
                }
            },
            messages: [
                {
                    role: "system",
                    content: "Ты помощник, который генерирует вариации входящего сообщения. Немного меняй стиль, но сохраняй смысл и тон."
                },
                {
                    role: "user",
                    content: `Исходное сообщение: "${message}". Количество вариаций: ${count}. Верни JSON с ключом "variations" и массивом текстовых сообщений.`
                }
            ]
        });

        const content = completion.choices[0].message.content;
        if (!content) {
            throw new Error("Model returned empty response.");
        }

        let parsed: { variations: unknown };

        try {
            parsed = JSON.parse(content);
        } catch {
            throw new Error("Failed to parse model response as JSON.");
        }

        if (!Array.isArray(parsed.variations)) {
            throw new Error("Model response does not contain a variations array.");
        }

        return parsed.variations.map((item) => String(item));
    }

    async firstAgree(message: string, answer: string): Promise<boolean> {
        if (!message || !message.trim()) {
            throw new Error('Message must be a non-empty string.');
        }

        if (!answer || !answer.trim()) {
            throw new Error('Answer must be a non-empty string.');
        }

        const completion = await this.openai.chat.completions.create({
            model: "gpt-4o-mini",
            response_format: {
                type: "json_schema",
                json_schema: {
                    name: "answer_classification",
                    schema: {
                        type: "object",
                        properties: {
                            is_positive: { type: "boolean" }
                        },
                        required: ["is_positive"],
                        additionalProperties: false
                    }
                }
            },
            messages: [
                {
                    role: "system",
                    content: "Ты помощник, который анализирует ответы пользователей. Определи, является ли ответ положительным (согласие, интерес, готовность) или отрицательным (отказ, отсутствие интереса, несогласие). Учитывай контекст исходного сообщения."
                },
                {
                    role: "user",
                    content: `Исходное сообщение: "${message}"\n\nОтвет пользователя: "${answer}"\n\nОпредели, является ли ответ положительным (true) или отрицательным (false).`
                }
            ]
        });

        const content = completion.choices[0].message.content;
        if (!content) {
            throw new Error("Model returned empty response.");
        }

        let parsed: { is_positive?: unknown };

        try {
            parsed = JSON.parse(content);
        } catch {
            throw new Error("Failed to parse model response as JSON.");
        }

        if (typeof parsed.is_positive !== "boolean") {
            throw new Error("Model response does not contain a boolean is_positive field.");
        }

        return parsed.is_positive;
    }

    async secondAgree(messageAnswers: string, asnwersMessage: string): Promise<boolean> {
        if (!messageAnswers || !messageAnswers.trim()) {
            throw new Error('MessageAnswers must be a non-empty string.');
        }

        if (!asnwersMessage || !asnwersMessage.trim()) {
            throw new Error('AsnwersMessage must be a non-empty string.');
        }

        const completion = await this.openai.chat.completions.create({
            model: "gpt-4o-mini",
            response_format: {
                type: "json_schema",
                json_schema: {
                    name: "answer_relevance",
                    schema: {
                        type: "object",
                        properties: {
                            is_relevant: { type: "boolean" }
                        },
                        required: ["is_relevant"],
                        additionalProperties: false
                    }
                }
            },
            messages: [
                {
                    role: "system",
                    content: "Ты помощник, который анализирует, является ли ответ пользователя ответом на заданные вопросы. Ответ должен быть релевантным и отвечать хотя бы на один из предложенных вопросов. Если ответ не относится к вопросам или является бессмысленным, верни false."
                },
                {
                    role: "user",
                    content: `Вопросы:\n${messageAnswers}\n\nОтвет пользователя: "${asnwersMessage}"\n\nОпредели, является ли ответ пользователя ответом на предложенные вопросы (true) или нет (false).`
                }
            ]
        });

        const content = completion.choices[0].message.content;
        if (!content) {
            throw new Error("Model returned empty response.");
        }

        let parsed: { is_relevant?: unknown };

        try {
            parsed = JSON.parse(content);
        } catch {
            throw new Error("Failed to parse model response as JSON.");
        }

        if (typeof parsed.is_relevant !== "boolean") {
            throw new Error("Model response does not contain a boolean is_relevant field.");
        }

        return parsed.is_relevant;
    }

}
