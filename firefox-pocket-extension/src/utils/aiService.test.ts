import { callGemini, callGeminiChat, callGeminiWithTools } from './aiService';

// Mock fetch globally
global.fetch = jest.fn();

describe('aiService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    const apiKey = 'test-api-key';
    const mockText = 'Response from Gemini';

    describe('callGemini', () => {
        it('should return text response on success', async () => {
            (global.fetch as jest.Mock).mockResolvedValue({
                json: jest.fn().mockResolvedValue({
                    candidates: [{ content: { parts: [{ text: mockText }] } }]
                })
            });

            const result = await callGemini(apiKey, 'prompt');
            expect(result).toBe(mockText);
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining(apiKey),
                expect.objectContaining({
                    method: 'POST',
                    body: expect.stringContaining('prompt')
                })
            );
        });

        it('should handle configuration options', async () => {
             (global.fetch as jest.Mock).mockResolvedValue({
                json: jest.fn().mockResolvedValue({
                    candidates: [{ content: { parts: [{ text: mockText }] } }]
                })
            });

            await callGemini(apiKey, 'prompt', 'gemini-1.5-flash', {
                temperature: 0.7,
                maxOutputTokens: 100,
                jsonMode: true
            });

            const callArgs = (global.fetch as jest.Mock).mock.calls[0];
            const body = JSON.parse(callArgs[1].body);
            expect(body.generationConfig).toEqual({
                temperature: 0.7,
                maxOutputTokens: 100,
                responseMimeType: "application/json"
            });
        });

        it('should throw error if API returns error', async () => {
            (global.fetch as jest.Mock).mockResolvedValue({
                json: jest.fn().mockResolvedValue({
                    error: { message: 'API Error' }
                })
            });

            await expect(callGemini(apiKey, 'prompt')).rejects.toThrow('API Error');
        });

        it('should throw error if no text in response', async () => {
            (global.fetch as jest.Mock).mockResolvedValue({
                json: jest.fn().mockResolvedValue({
                    candidates: []
                })
            });

            await expect(callGemini(apiKey, 'prompt')).rejects.toThrow('Nenhuma resposta gerada pelo Gemini.');
        });
    });

    describe('callGeminiChat', () => {
        it('should return text response for chat history', async () => {
             (global.fetch as jest.Mock).mockResolvedValue({
                json: jest.fn().mockResolvedValue({
                    candidates: [{ content: { parts: [{ text: mockText }] } }]
                })
            });

            const history = [{ role: 'user', parts: [{ text: 'Hello' }] }] as any;
            const result = await callGeminiChat(apiKey, history);
            expect(result).toBe(mockText);

            const callArgs = (global.fetch as jest.Mock).mock.calls[0];
            const body = JSON.parse(callArgs[1].body);
            expect(body.contents).toEqual(history);
        });

        it('should throw error if API returns error', async () => {
             (global.fetch as jest.Mock).mockResolvedValue({
                json: jest.fn().mockResolvedValue({
                    error: { message: 'Chat Error' }
                })
            });

            await expect(callGeminiChat(apiKey, [])).rejects.toThrow('Chat Error');
        });

         it('should throw error if no text', async () => {
             (global.fetch as jest.Mock).mockResolvedValue({
                json: jest.fn().mockResolvedValue({})
            });

            await expect(callGeminiChat(apiKey, [])).rejects.toThrow('Nenhuma resposta gerada');
        });
    });

    describe('callGeminiWithTools', () => {
        it('should return function call', async () => {
            const mockFunctionCall = { name: 'testFunc', args: { foo: 'bar' } };
            (global.fetch as jest.Mock).mockResolvedValue({
                json: jest.fn().mockResolvedValue({
                    candidates: [{ content: { parts: [{ functionCall: mockFunctionCall }] } }]
                })
            });

            const result = await callGeminiWithTools(apiKey, 'prompt', 'gemini-1.5-flash', {
                tools: [{ function_declarations: [] }] as any
            });

            expect(result.functionCall).toEqual(mockFunctionCall);
            expect(result.text).toBeUndefined();
        });

        it('should return text if no function call', async () => {
             (global.fetch as jest.Mock).mockResolvedValue({
                json: jest.fn().mockResolvedValue({
                    candidates: [{ content: { parts: [{ text: mockText }] } }]
                })
            });

            const result = await callGeminiWithTools(apiKey, 'prompt');
            expect(result.text).toBe(mockText);
            expect(result.functionCall).toBeUndefined();
        });

        it('should handle tool config', async () => {
             (global.fetch as jest.Mock).mockResolvedValue({
                json: jest.fn().mockResolvedValue({
                    candidates: [{ content: { parts: [{ text: 'ok' }] } }]
                })
            });

            const toolConfig = { function_calling_config: { mode: 'AUTO' } } as any;
            await callGeminiWithTools(apiKey, 'prompt', 'gemini-1.5-flash', {
                toolConfig
            });

             const callArgs = (global.fetch as jest.Mock).mock.calls[0];
            const body = JSON.parse(callArgs[1].body);
            expect(body.tool_config).toEqual(toolConfig);
        });

        it('should throw error on failure', async () => {
             (global.fetch as jest.Mock).mockResolvedValue({
                json: jest.fn().mockResolvedValue({ error: { message: 'Tool Error' } })
            });
            await expect(callGeminiWithTools(apiKey, 'prompt')).rejects.toThrow('Tool Error');
        });

         it('should throw error if no response part', async () => {
             (global.fetch as jest.Mock).mockResolvedValue({
                json: jest.fn().mockResolvedValue({ candidates: [] })
            });
            await expect(callGeminiWithTools(apiKey, 'prompt')).rejects.toThrow('Nenhuma resposta gerada');
        });
    });
});
