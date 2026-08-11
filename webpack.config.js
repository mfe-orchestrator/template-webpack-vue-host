const HtmlWebpackPlugin = require('html-webpack-plugin');
const { VueLoaderPlugin } = require('vue-loader');
const webpack = require('webpack');
const { ModuleFederationPlugin } = webpack.container;

// Optional: unset, or set to an empty string, means "let the backend decide".
const environment = process.env.MFE_ENVIRONMENT?.trim();

module.exports = {
  entry: './src/index',
  mode: 'development',
  devServer: {
    port: 3000,
    hot: true,
    historyApiFallback: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  },
  output: {
    // Chunks are resolved from document.currentScript.src, which is the URL
    // before any redirect. Leave this on 'auto' so a version pinned entry keeps
    // loading its own chunks and two builds never mix on one page.
    publicPath: 'auto',
    clean: true,
  },
  resolve: {
    extensions: ['.js', '.vue', '.json'],
  },
  module: {
    rules: [
      {
        test: /\.vue$/,
        loader: 'vue-loader',
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  plugins: [
    new VueLoaderPlugin(),
    new webpack.DefinePlugin({
      'process.env.MFE_BACKEND_URL': JSON.stringify(
        process.env.MFE_BACKEND_URL || 'https://console.mfe-orchestrator.dev/api'
      ),
      'process.env.MFE_PROJECT_ID': JSON.stringify(process.env.MFE_PROJECT_ID || ''),
      // DefinePlugin pastes the text on the right into the bundle verbatim, so both
      // cases are spelled out: a quoted slug when there is one, the bare identifier
      // `undefined` when there is not. This used to default to 'DEV', which silently
      // pinned every build that forgot the variable to the DEV environment.
      'process.env.MFE_ENVIRONMENT': environment ? JSON.stringify(environment) : 'undefined',
    }),
    new ModuleFederationPlugin({
      name: 'host',
      // A host is consumable as a remote too, so it ships its own entry.
      filename: 'remoteEntry.js',
      exposes: {
        './App': './src/App.vue',
      },
      remotes: {
        // One entry per microfrontend this host consumes.
        //
        // The key is the federation-safe name you import from ("exampleremote/Button").
        // The string passed to remoteUrl() is the *slug* of the microfrontend in the
        // orchestrator: change it to yours, and add one entry per extra remote.
        //
        // Never write a URL here. The host does not choose the version it gets: the
        // backend resolves it and remoteUrl() returns that URL, already pinned, verbatim.
        exampleremote: `promise import('@mfe-orchestrator-hub/client').then(m => m.remoteUrl('example-remote'))`,
      },
      shared: {
        vue: {
          singleton: true,
          requiredVersion: '^3.5.0',
        },
      },
    }),
    new HtmlWebpackPlugin({
      template: './public/index.html',
    }),
  ],
};
