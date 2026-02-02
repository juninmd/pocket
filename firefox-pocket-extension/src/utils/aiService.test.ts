import { callGemini, callGeminiChat, callGeminiWithTools } from './aiService';

// Mock fetch
global.fetch = jest.fn();

describe('aiService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    const mockApiKey = 'test-key';
    const mockResponse = {
        candidates: [{
            content: {
                parts: [{ text: 'Response' }]
            }
        }]
    };

    describe('callGemini', () => {
        it('should call API correctly', async () => {
            (global.fetch as jest.Mock).mockResolvedValue({
                json: jest.fn().mockResolvedValue(mockResponse)
            });

            const result = await callGemini(mockApiKey, 'Prompt');
            expect(result).toBe('Response');
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent'),
                expect.objectContaining({
                    method: 'POST',
                    body: expect.stringContaining('"text":"Prompt"')
                })
            );
        });

        it('should handle config options', async () => {
            (global.fetch as jest.Mock).mockResolvedValue({
                json: jest.fn().mockResolvedValue(mockResponse)
            });

            await callGemini(mockApiKey, 'Prompt', 'gemini-1.5-pro', { temperature: 0.5, maxOutputTokens: 100, jsonMode: true });
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('gemini-1.5-pro'),
                expect.objectContaining({
                    body: expect.stringContaining('"temperature":0.5')
                })
            );
        });

        it('should throw on API error', async () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            (global.fetch as jest.Mock).mockResolvedValue({
                json: jest.fn().mockResolvedValue({ error: { message: 'API Error' } })
            });

            await expect(callGemini(mockApiKey, 'Prompt')).rejects.toThrow('API Error');
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });

        it('should use default error message if missing', async () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            (global.fetch as jest.Mock).mockResolvedValue({
                json: jest.fn().mockResolvedValue({ error: {} })
            });

            await expect(callGemini(mockApiKey, 'Prompt')).rejects.toThrow('Erro na API do Gemini');
            consoleSpy.mockRestore();
        });

        it('should use default error message if missing', async () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            (global.fetch as jest.Mock).mockResolvedValue({
               json: jest.fn().mockResolvedValue({ error: {} })
           });
           await expect(callGeminiChat(mockApiKey, [])).rejects.toThrow('Erro na API do Gemini');
           consoleSpy.mockRestore();
       });

        it('should throw if no text returned', async () => {
            (global.fetch as jest.Mock).mockResolvedValue({
                json: jest.fn().mockResolvedValue({})
            });

            await expect(callGemini(mockApiKey, 'Prompt')).rejects.toThrow('Nenhuma resposta gerada pelo Gemini.');
        });
    });

    describe('callGeminiChat', () => {
        it('should call API with history', async () => {
            (global.fetch as jest.Mock).mockResolvedValue({
                json: jest.fn().mockResolvedValue(mockResponse)
            });

            const history = [{ role: 'user', parts: [{ text: 'Hi' }] }];
            const result = await callGeminiChat(mockApiKey, history as any);
            expect(result).toBe('Response');
            expect(global.fetch).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({
                    body: expect.stringContaining('"role":"user"')
                })
            );
        });

        it('should handle config', async () => {
             (global.fetch as jest.Mock).mockResolvedValue({
                json: jest.fn().mockResolvedValue(mockResponse)
            });
            await callGeminiChat(mockApiKey, [], 'gemini-1.5-flash', { temperature: 0.7 });
             expect(global.fetch).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({
                    body: expect.stringContaining('"temperature":0.7')
                })
            );
        });

        it('should handle errors', async () => {
             const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
             (global.fetch as jest.Mock).mockResolvedValue({
                json: jest.fn().mockResolvedValue({ error: { message: 'Chat Error' } })
            });
            await expect(callGeminiChat(mockApiKey, [])).rejects.toThrow('Chat Error');
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });

        it('should throw if no text returned', async () => {
            (global.fetch as jest.Mock).mockResolvedValue({
                json: jest.fn().mockResolvedValue({})
            });

            await expect(callGeminiChat(mockApiKey, [])).rejects.toThrow('Nenhuma resposta gerada pelo Gemini.');
        });
    });

    describe('callGeminiWithTools', () => {
        const toolResponse = {
            candidates: [{
                content: {
                    parts: [{ functionCall: { name: 'tool', args: {} }, text: 'text' }]
                }
            }]
        };

        it('should call API with tools', async () => {
            (global.fetch as jest.Mock).mockResolvedValue({
                json: jest.fn().mockResolvedValue(toolResponse)
            });

            const tools = [{ function_declarations: [] }];
            const result = await callGeminiWithTools(mockApiKey, 'Prompt', 'gemini-1.5-flash', { tools });
            expect(result.functionCall).toBeDefined();
            expect(global.fetch).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({
                    body: expect.stringContaining('"tools":')
                })
            );
        });

        it('should throw on error', async () => {
             const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
             (global.fetch as jest.Mock).mockResolvedValue({
                json: jest.fn().mockResolvedValue({ error: { message: 'Tool Error' } })
            });
            await expect(callGeminiWithTools(mockApiKey, 'Prompt')).rejects.toThrow('Tool Error');
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });

        it('should use default error message if missing', async () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            (global.fetch as jest.Mock).mockResolvedValue({
               json: jest.fn().mockResolvedValue({ error: {} })
           });
           await expect(callGeminiWithTools(mockApiKey, 'Prompt')).rejects.toThrow('Erro na API do Gemini');
           consoleSpy.mockRestore();
       });

        it('should throw if no part returned', async () => {
             (global.fetch as jest.Mock).mockResolvedValue({
                json: jest.fn().mockResolvedValue({})
            });
            await expect(callGeminiWithTools(mockApiKey, 'Prompt')).rejects.toThrow('Nenhuma resposta gerada pelo Gemini.');
        });

        it('should pass toolConfig', async () => {
             (global.fetch as jest.Mock).mockResolvedValue({
                json: jest.fn().mockResolvedValue(toolResponse)
            });
            const toolConfig = { function_calling_config: { mode: 'AUTO' } };
            await callGeminiWithTools(mockApiKey, 'Prompt', 'gemini-1.5-flash', { toolConfig: toolConfig as any });
             expect(global.fetch).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({
                    body: expect.stringContaining('"tool_config":')
                })
            );
        });

        it('should pass config params', async () => {
             (global.fetch as jest.Mock).mockResolvedValue({
                json: jest.fn().mockResolvedValue(toolResponse)
            });
            await callGeminiWithTools(mockApiKey, 'Prompt', 'gemini-1.5-flash', { temperature: 0.9 });
             expect(global.fetch).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({
                    body: expect.stringContaining('"temperature":0.9')
                })
            );
        });
    });
});
