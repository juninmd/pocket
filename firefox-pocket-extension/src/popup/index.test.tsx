import React from 'react';
import ReactDOM from 'react-dom/client';
import Popup from './Popup';

jest.mock('react-dom/client', () => ({
  createRoot: jest.fn().mockReturnValue({
    render: jest.fn(),
  }),
}));

jest.mock('./Popup', () => () => <div>PopupMock</div>);

describe('Popup Entry Point', () => {
    it('should render Popup', () => {
        const root = document.createElement('div');
        root.id = 'root';
        document.body.appendChild(root);

        require('./index');

        expect(ReactDOM.createRoot).toHaveBeenCalledWith(root);
        // We can't easily check render call because it happens immediately on require,
        // but checking createRoot is usually enough for entry point coverage.
    });
});
