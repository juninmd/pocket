import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ItemCard } from './ItemCard';
import { ItemStatus, ItemType } from '../utils/types';

describe('ItemCard', () => {
    const mockItem = {
        id: '1',
        url: 'http://example.com',
        title: 'Test Title',
        status: ItemStatus.Unread,
        isFavorite: false,
        type: ItemType.Article,
        tags: ['tag1'],
        savedAt: '2023-01-01',
        excerpt: 'Excerpt'
    };

    const props = {
        item: mockItem,
        onToggleFavorite: jest.fn(),
        onToggleArchive: jest.fn(),
        onDelete: jest.fn()
    };

    // Mock window.open and location
    const originalLocation = window.location;
    const mockLocation = { href: '' };

    beforeAll(() => {
        delete (window as any).location;
        (window as any).location = mockLocation;
        window.open = jest.fn();
    });

    afterAll(() => {
        (window as any).location = originalLocation;
    });

    beforeEach(() => {
        mockLocation.href = '';
        jest.clearAllMocks();
    });

    it('should render item details', () => {
        render(<ItemCard {...props} />);
        expect(screen.getByText('Test Title')).toBeInTheDocument();
        expect(screen.getByText('Excerpt')).toBeInTheDocument();
        expect(screen.getByText('tag1')).toBeInTheDocument();
    });

    it('should trigger actions', () => {
        render(<ItemCard {...props} />);

        fireEvent.click(screen.getByTitle('Favoritar'));
        expect(props.onToggleFavorite).toHaveBeenCalled();

        fireEvent.click(screen.getByTitle('Arquivar'));
        expect(props.onToggleArchive).toHaveBeenCalled();

        fireEvent.click(screen.getByTitle('Excluir'));
        expect(props.onDelete).toHaveBeenCalled();
    });

    it('should navigate to reader if content exists', () => {
        render(<ItemCard {...props} item={{ ...mockItem, content: '<p>Content</p>' }} />);
        fireEvent.click(screen.getByText('Test Title'));
        expect(mockLocation.href).toContain('reader.html?id=1');
    });

    it('should open url if no content', () => {
        render(<ItemCard {...props} />);
        fireEvent.click(screen.getByText('Test Title'));
        expect(window.open).toHaveBeenCalledWith('http://example.com', '_blank');
    });
});
