const path = require('path');
const Webpack = require('webpack');
const nodeExternals = require('webpack-node-externals');

module.exports = {
  entry: './src/index.ts',
  output: {
    path: path.resolve('./dist'),
    filename: 'index.js'
  },
  mode: 'production',
  externals: [nodeExternals()],
  plugins: [
    new Webpack.DefinePlugin({
      'process.env': {
        APP_ENV: JSON.stringify(process.env.APP_ENV),
      }
    })
  ],
  resolve: {
    extensions: [".ts", ".js"],
    alias: {
      '@': path.resolve(__dirname, 'src')
    },
  },
  module: {
    rules: [
      {
        test: /.ts$/,
        loader: 'ts-loader',
        exclude: /node_modules/,
      }
    ]
  }
}