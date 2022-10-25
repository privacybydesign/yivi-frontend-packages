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
        test: /\.woff2$/,
        loader: 'file-loader'
      }
    ]
  }
};
