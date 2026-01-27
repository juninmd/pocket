export type GeminiModel = 'gemini-1.5-flash' | 'gemini-2.5-pro' | 'gemini-1.5-pro';

export interface GeminiMessage {
    role: 'user' | 'model';
    parts: { text: string }[];
}

interface GeminiConfig {
    temperature?: number;
    maxOutputTokens?: number;
    jsonMode?: boolean;
}

export const callGemini = async (
    apiKey: string,
    prompt: string,
    model: GeminiModel = 'gemini-1.5-flash',
    config: GeminiConfig = {}
): Promise<string> => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const body: any = {
        contents: [{ parts: [{ text: prompt }] }]
    };

    if (config.temperature !== undefined || config.maxOutputTokens !== undefined || config.jsonMode) {
        body.generationConfig = {};
        if (config.temperature !== undefined) body.generationConfig.temperature = config.temperature;
        if (config.maxOutputTokens !== undefined) body.generationConfig.maxOutputTokens = config.maxOutputTokens;
        if (config.jsonMode) body.generationConfig.responseMimeType = "application/json";
    }

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });

    const data = await response.json();

    if (data.error) {
        throw new Error(data.error.message || "Erro na API do Gemini");
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
        throw new Error("Nenhuma resposta gerada pelo Gemini.");
    }

    return text;
};

export const callGeminiChat = async (
    apiKey: string,
    history: GeminiMessage[],
    model: GeminiModel = 'gemini-1.5-flash',
    config: GeminiConfig = {}
): Promise<string> => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const body: any = {
        contents: history
    };

    if (config.temperature !== undefined || config.maxOutputTokens !== undefined || config.jsonMode) {
        body.generationConfig = {};
        if (config.temperature !== undefined) body.generationConfig.temperature = config.temperature;
        if (config.maxOutputTokens !== undefined) body.generationConfig.maxOutputTokens = config.maxOutputTokens;
        if (config.jsonMode) body.generationConfig.responseMimeType = "application/json";
    }

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });

    const data = await response.json();

    if (data.error) {
        throw new Error(data.error.message || "Erro na API do Gemini");
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
        throw new Error("Nenhuma resposta gerada pelo Gemini.");
    }

    return text;
};
