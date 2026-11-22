import React from 'react';
import { render, screen } from '@testing-library/react';
import { OrganizePreview } from './OrganizePreview';
import { ItemStatus, ItemType, SavedItem } from '../utils/types';

const item = (id: string, aiFolder?: string): SavedItem => ({
    id, url: `https://a.com/${id}`, title: id, status: ItemStatus.Unread, isFavorite: false,
    type: ItemType.Article, tags: [], savedAt: '2026-01-01T00:00:00.000Z', aiFolder,
});

describe('OrganizePreview', () => {
    it('shows no warning when every batch succeeded', () => {
        render(<OrganizePreview total={1} organized={[item('1', 'Tech')]} debugLogs={[{ error: null }]} />);
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    // A Gemini error (bad key, quota) left items unorganized behind a "success" preview.
    it('warns when the AI failed for some batches', () => {
        render(
            <OrganizePreview
                total={2}
                organized={[item('1', 'Tech'), item('2')]}
                debugLogs={[{ error: null }, { error: 'Error: 429' }]}
            />
        );
        expect(screen.getByRole('alert')).toHaveTextContent('A IA falhou em 1 de 2 lotes');
    });

    it('says nothing was organized when every batch failed', () => {
        render(<OrganizePreview total={1} organized={[item('1')]} debugLogs={[{ error: 'Error: API key not valid' }]} />);
        expect(screen.getByRole('alert')).toHaveTextContent('Nenhum item foi organizado');
    });
});
