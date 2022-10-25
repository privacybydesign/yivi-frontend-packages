const NodePolyfillPlugin = require('node-polyfill-webpack-plugin');
const path = require('path');

module.exports = {
  target: ['web', 'es5'],

  entry: {
    'yivi': [
      'core-js/features/url',
      'core-js/modules/es.promise',
      'core-js/modules/es.promise.finally',
      'core-js/modules/es.array.iterator',
      'core-js/modules/es.array.includes',
      'core-js/modules/web.dom-collections.for-each',
      './index.js'
    ],
  },

  output: {
    path: path.join(__dirname, 'dist'),
    filename: '[name].js',
    library: 'yivi',
    libraryTarget: 'umd'
  },

  devServer: {
    contentBase: path.join(__dirname, 'dist'),
    disableHostCheck: true
  },

  module: {
    rules: [
      {
        test: /\.css$/i,
        use: [
          'style-loader',
          'css-loader'
        ]
      },
      {
        test: /\.js$/i,
        use: {
          loader: 'babel-loader',
          options: {
            'presets': [
              [
                '@babel/preset-env',
                {
                  'useBuiltIns': 'entry',
                  'corejs': { 'version': 3.18 },
                },
              ],
            ],
          },
        },
      },
    ],
  },

  plugins: [
    new NodePolyfillPlugin(),
  ],
};
