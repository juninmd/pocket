import { useEffect, useRef, useState } from 'react';
import browser from 'webextension-polyfill';

export const useSettings = () => {
    const [apiKey, setApiKey] = useState('');
    const [model, setModel] = useState('gemini-1.5-flash');
    const [saved, setSaved] = useState(false);
    const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

    useEffect(() => {
        browser.storage.local.get(['geminiApiKey', 'selectedModel']).then((data: any) => {
            if (data?.geminiApiKey) setApiKey(data.geminiApiKey);
            if (data?.selectedModel) setModel(data.selectedModel);
        });
        return () => clearTimeout(timer.current);
    }, []);

    const saveKey = async () => {
        await browser.storage.local.set({ geminiApiKey: apiKey });
        setSaved(true);
        timer.current = setTimeout(() => setSaved(false), 1000);
    };

    const changeModel = async (value: string) => {
        setModel(value);
        await browser.storage.local.set({ selectedModel: value });
    };

    return { apiKey, setApiKey, model, changeModel, saved, saveKey };
};
