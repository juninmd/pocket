import React from 'react';
import { Button, Card, Select, TextField, useToast } from '@juninmd/sonido';
import { useSettings } from './useSettings';
import { DataManagement } from './DataManagement';

type DataProps = Omit<React.ComponentProps<typeof DataManagement>, 'apiKey' | 'model'>;

const MODELS = [
    ['gemini-1.5-flash', 'Gemini 1.5 Flash (Grátis + Rápido)'],
    ['gemini-1.5-pro', 'Gemini 1.5 Pro (Grátis + Avançado)'],
    ['gemini-2.5-flash', 'Gemini 2.5 Flash (Pago + Rápido)'],
    ['gemini-2.5-pro', 'Gemini 2.5 Pro (Pago + Avançado)'],
];

type Settings = ReturnType<typeof useSettings>;

export const SettingsView = ({ settings, ...props }: DataProps & { settings: Settings }) => {
    const { apiKey, setApiKey, model, changeModel, saved, saveKey } = settings;
    const toast = useToast();

    const handleSave = async () => {
        await saveKey();
        toast({ title: 'API Key salva', description: 'Os resumos com IA já podem ser usados.', tone: 'success' });
    };

    return (
        <div className="settings">
            <Card surface="glass" className="card panel" padding="none">
                <h2>Configurações</h2>
                <section className="panel-section">
                    <h3>Inteligência Artificial (Gemini)</h3>
                    <p className="hint">Adicione sua chave de API do Gemini para habilitar resumos automáticos.</p>
                    <div className="btn-row nowrap">
                        <div className="grow">
                            <TextField
                                label="Chave da API Gemini"
                                hideLabel
                                type="password"
                                placeholder="Cole sua API Key aqui"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                            />
                        </div>
                        <Button className={`btn accent ${saved ? 'ok' : ''}`} onClick={handleSave}>
                            {saved ? 'Salvo!' : 'Salvar Key'}
                        </Button>
                    </div>
                    <p className="hint small">
                        <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer">Obter chave de API gratuita</a>
                    </p>
                    <div className="model-field">
                        <Select
                            label="Modelo de IA"
                            value={model}
                            onChange={changeModel}
                            options={MODELS.map(([value, label]) => ({ value, label }))}
                        />
                    </div>
                    <p className="hint small">ℹ️ Modelos 2.5 exigem plano pago. Use 1.5 Flash/Pro se estiver no tier gratuito.</p>
                </section>
                <section className="panel-section">
                    <DataManagement {...props} apiKey={apiKey} model={model} />
                </section>
                <section>
                    <h3>Sobre</h3>
                    <p>Extensão Pocket-like v1.0</p>
                    <p>Uma alternativa focada em privacidade para salvar links.</p>
                </section>
            </Card>
        </div>
    );
};
