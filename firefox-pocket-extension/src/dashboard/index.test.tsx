import React from 'react';
import ReactDOM from 'react-dom/client';
import Dashboard from './Dashboard';

jest.mock('react-dom/client', () => ({
  createRoot: jest.fn().mockReturnValue({
    render: jest.fn(),
  }),
}));

jest.mock('./Dashboard', () => () => <div>DashboardMock</div>);

describe('Dashboard Entry Point', () => {
    it('should render Dashboard', () => {
        const root = document.createElement('div');
        root.id = 'root';
        document.body.appendChild(root);

        require('./index');

        expect(ReactDOM.createRoot).toHaveBeenCalledWith(root);
    });
});
