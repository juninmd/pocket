const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: 'production',
  entry: {
    popup: './src/popup/index.tsx',
    dashboard: './src/dashboard/index.tsx',
    reader: './src/reader/index.tsx',
    background: './src/background/background.ts',
    content: './src/content/content.ts',
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        exclude: /node_modules/,
        use: 'ts-loader',
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/popup/index.html',
      filename: 'popup.html',
      chunks: ['popup'],
    }),
    new HtmlWebpackPlugin({
      template: './src/dashboard/index.html',
      filename: 'dashboard.html',
      chunks: ['dashboard'],
    }),
    new HtmlWebpackPlugin({
      template: './src/reader/index.html',
      filename: 'reader.html',
      chunks: ['reader'],
    }),
    new CopyPlugin({
      patterns: [
        { from: 'manifest.json', to: 'manifest.json' },
        { from: 'src/icons', to: 'icons' },
      ],
    }),
  ],
};
