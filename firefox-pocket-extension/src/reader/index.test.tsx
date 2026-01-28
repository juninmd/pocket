import React from 'react';
import ReactDOM from 'react-dom/client';
import Reader from './Reader';

jest.mock('react-dom/client', () => ({
  createRoot: jest.fn().mockReturnValue({
    render: jest.fn(),
  }),
}));

jest.mock('./Reader', () => () => <div>ReaderMock</div>);

describe('Reader Entry Point', () => {
    it('should render Reader', () => {
        const root = document.createElement('div');
        root.id = 'root';
        document.body.appendChild(root);

        require('./index');

        expect(ReactDOM.createRoot).toHaveBeenCalledWith(root);
    });
});
