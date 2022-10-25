const NodePolyfillPlugin = require('node-polyfill-webpack-plugin');
const path = require('path');

module.exports = {
  mode: 'development',

  entry: {
    'yivi': './index.js'
  },

  output: {
    path: path.join(__dirname, 'public'),
    filename: '[name].js'
  },

  plugins: [
    new NodePolyfillPlugin(),
  ],
};
