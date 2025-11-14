import { Injectable } from "@nestjs/common";
import OpenAI from "openai";
import { systemPrompt } from "../constants/system.prompt";
import { leadClassificationPrompt } from "../constants/lead-classification.prompt";

@Injectable()
export class ModelService {
    private readonly openai: OpenAI;

    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
    }

    async generateVariations(message: string, count: number): Promise<string[]> {
        if (!message || !message.trim()) {
            throw new Error("Message must be a non-empty string.");
        }

        if (!Number.isInteger(count) || count < 1) {
            throw new Error("Count must be a positive integer.");
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
                { role: "system", content: systemPrompt },
                {
                    role: "user",
                    content: `Исходное сообщение: "${message}". Количество вариаций: ${count}. Сформируй указанное число уникальных сообщений и верни их в JSON с ключом "variations".`
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
        } catch (err) {
            throw new Error("Failed to parse model response as JSON.");
        }

        if (!Array.isArray(parsed.variations)) {
            throw new Error("Model response does not contain a variations array.");
        }

        return parsed.variations.map((item) => String(item));
    }

    async classifyLead(params: {
        initialMessage: string;
        clientMessage: string;
        platform: string;
        platformIdentifier: string;
    }): Promise<boolean> {
        const { initialMessage, clientMessage, platform, platformIdentifier } = params;

        if (!initialMessage?.trim()) {
            throw new Error("initialMessage must be a non-empty string.");
        }

        if (!clientMessage?.trim()) {
            throw new Error("clientMessage must be a non-empty string.");
        }

        if (!platform?.trim()) {
            throw new Error("platform must be a non-empty string.");
        }

        if (!platformIdentifier?.trim()) {
            throw new Error("platformIdentifier must be a non-empty string.");
        }

        const completion = await this.openai.chat.completions.create({
            model: "gpt-4o-mini",
            response_format: {
                type: "json_schema",
                json_schema: {
                    name: "lead_interest",
                    schema: {
                        type: "object",
                        properties: {
                            is_interested: { type: "boolean" }
                        },
                        required: ["is_interested"],
                        additionalProperties: false
                    }
                }
            },
            messages: [
                { role: "system", content: leadClassificationPrompt },
                {
                    role: "user",
                    content: JSON.stringify({
                        initialMessage,
                        clientMessage,
                        platform,
                        platformIdentifier
                    })
                }
            ]
        });

        const content = completion.choices[0].message.content;
        if (!content) {
            throw new Error("Model returned empty response.");
        }

        let parsed: { is_interested?: unknown };

        try {
            parsed = JSON.parse(content);
        } catch {
            throw new Error("Failed to parse model response as JSON.");
        }

        if (typeof parsed.is_interested !== "boolean") {
            throw new Error("Model response does not contain a boolean is_interested field.");
        }

        return parsed.is_interested;
    }
}