import React from 'react';
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

    return (
        <div className="settings">
            <div className="card panel">
                <h2>Configurações</h2>
                <section className="panel-section">
                    <h3>Inteligência Artificial (Gemini)</h3>
                    <p className="hint">Adicione sua chave de API do Gemini para habilitar resumos automáticos.</p>
                    <div className="btn-row nowrap">
                        <input type="password" className="search-bar grow" value={apiKey} placeholder="Cole sua API Key aqui"
                            aria-label="Chave da API Gemini" onChange={(e) => setApiKey(e.target.value)} />
                        <button className={`btn accent ${saved ? 'ok' : ''}`} onClick={saveKey}>{saved ? 'Salvo!' : 'Salvar Key'}</button>
                    </div>
                    <p className="hint small">
                        <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer">Obter chave de API gratuita</a>
                    </p>
                    <label className="field-label" htmlFor="model">Modelo de IA</label>
                    <select id="model" className="search-bar full" value={model} onChange={(e) => changeModel(e.target.value)}>
                        {MODELS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
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
            </div>
        </div>
    );
};
