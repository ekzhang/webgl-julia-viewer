const path = require('path');

module.exports = (argv) => ({
  mode: 'development',
  entry: './src/index.ts',
  devtool: argv.mode === 'production' ? '' : 'inline-source-map',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      },
      {
        test: /\.glsl$/,
        use: 'raw-loader'
      }
    ]
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js']
  },
  serve: {
    content: path.resolve(__dirname, 'docs')
  },
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'docs')
  }
});
