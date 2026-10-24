import React from 'react';
import { render, screen, fireEvent, createEvent } from '@testing-library/react';
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
        onDelete: jest.fn(),
        onEdit: jest.fn()
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

        fireEvent.click(screen.getByTitle('Editar tags e pasta'));
        expect(props.onEdit).toHaveBeenCalled();
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

    it('should handle favicon error', () => {
        const { container } = render(<ItemCard {...props} />);
        const favicon = container.querySelector('img[src*="google.com"]');
        if (favicon) {
            fireEvent.error(favicon);
            expect(favicon).toHaveStyle('display: none');
        } else {
            throw new Error('Favicon not found');
        }
    });

    it('should render aiTags', () => {
        render(<ItemCard {...props} item={{ ...mockItem, tags: [], aiTags: ['ai-tag'] }} />);
        expect(screen.getByText('✨ ai-tag')).toBeInTheDocument();
    });

    it('should render both tags and aiTags', () => {
        render(<ItemCard {...props} item={{ ...mockItem, tags: ['user-tag'], aiTags: ['ai-tag'] }} />);
        expect(screen.getByText('user-tag')).toBeInTheDocument();
        expect(screen.getByText('✨ ai-tag')).toBeInTheDocument();
    });

    it('should render aiTags when tags is undefined', () => {
        const itemWithoutTags = { ...mockItem, tags: undefined, aiTags: ['ai-tag'] };
        render(<ItemCard {...props} item={itemWithoutTags} />);
        expect(screen.getByText('✨ ai-tag')).toBeInTheDocument();
    });

    it('should handle empty tag arrays', () => {
         render(<ItemCard {...props} item={{ ...mockItem, tags: [], aiTags: [] }} />);
         const tagElements = screen.queryByText(/tag/i);
         // "tag1" shouldn't be there.
         expect(screen.queryByText('tag1')).not.toBeInTheDocument();
    });

    it('should handle empty tags and undefined aiTags', () => {
        render(<ItemCard {...props} item={{ ...mockItem, tags: [], aiTags: undefined }} />);
        expect(screen.queryByText('tag1')).not.toBeInTheDocument();
   });

    it('should stop propagation on original link click', () => {
        render(<ItemCard {...props} />);
        const link = screen.getByTitle('Abrir original');
        const clickEvent = createEvent.click(link);
        const stopPropagation = jest.spyOn(clickEvent, 'stopPropagation');

        fireEvent(link, clickEvent);

        expect(stopPropagation).toHaveBeenCalled();
        // Ensure card click handler was NOT called (which calls window.open for this item)
        expect(window.open).not.toHaveBeenCalled();
    });

    it('should stop propagation on card-actions click', () => {
        render(<ItemCard {...props} />);
        const favoriteBtn = screen.getByTitle('Favoritar');
        const actionsContainer = favoriteBtn.parentElement;

        if (!actionsContainer) throw new Error('Actions container not found');

        const clickEvent = createEvent.click(actionsContainer);
        const stopPropagation = jest.spyOn(clickEvent, 'stopPropagation');
        fireEvent(actionsContainer, clickEvent);

        expect(stopPropagation).toHaveBeenCalled();
        expect(window.open).not.toHaveBeenCalled();
    });

    it('should use snapshotUrl if available', () => {
        const item = { ...mockItem, snapshotUrl: 'http://example.com/snap.jpg' };
        const { container } = render(<ItemCard {...props} item={item} />);
        const cardImage = container.querySelector('.card-image');
        expect(cardImage).toHaveStyle('background-image: url(http://example.com/snap.jpg)');
    });

    it('should use imageUrl if snapshotUrl is missing', () => {
        const item = { ...mockItem, imageUrl: 'http://example.com/image.jpg' };
        const { container } = render(<ItemCard {...props} item={item} />);
        const cardImage = container.querySelector('.card-image');
        expect(cardImage).toHaveStyle('background-image: url(http://example.com/image.jpg)');
    });

    it('should render tags when aiTags is undefined', () => {
        render(<ItemCard {...props} item={{ ...mockItem, tags: ['user-tag'], aiTags: undefined }} />);
        expect(screen.getByText('user-tag')).toBeInTheDocument();
    });

    it('should handle both undefined', () => {
        render(<ItemCard {...props} item={{ ...mockItem, tags: undefined, aiTags: undefined }} />);
        expect(screen.queryByText('tag1')).not.toBeInTheDocument();
    });

    it('should handle undefined tags and empty aiTags', () => {
        render(<ItemCard {...props} item={{ ...mockItem, tags: undefined, aiTags: [] }} />);
        expect(screen.queryByText('tag1')).not.toBeInTheDocument();
    });

    it('should render tags when aiTags is empty', () => {
        render(<ItemCard {...props} item={{ ...mockItem, tags: ['user-tag'], aiTags: [] }} />);
        expect(screen.getByText('user-tag')).toBeInTheDocument();
    });

    it('should render correct titles and styles for favorited and archived items', () => {
        const item = {
            ...mockItem,
            isFavorite: true,
            status: ItemStatus.Archived
        };
        render(<ItemCard {...props} item={item} />);

        const favBtn = screen.getByTitle('Remover dos favoritos');
        expect(favBtn).toBeInTheDocument();
        expect(favBtn).toHaveClass('is-favorite');
        expect(favBtn).toHaveAttribute('aria-pressed', 'true');

        const archiveBtn = screen.getByTitle('Desarquivar');
        expect(archiveBtn).toBeInTheDocument();
        expect(archiveBtn).toHaveClass('is-archived');
        expect(archiveBtn).toHaveAttribute('aria-pressed', 'true');
    });

    it('should leave ctrl+click on the title to the browser', () => {
        render(<ItemCard {...props} item={mockItem} />);
        const title = screen.getByText('Test Title');
        const openSpy = jest.spyOn(window, 'open').mockImplementation(() => null);
        const event = createEvent.click(title, { ctrlKey: true });
        fireEvent(title, event);
        expect(event.defaultPrevented).toBe(false);
        expect(openSpy).not.toHaveBeenCalled();
        openSpy.mockRestore();
    });
});
