import path from 'path';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import { VueLoaderPlugin } from 'vue-loader';
import webpack, { type Configuration } from 'webpack';
import type { Configuration as DevServerConfiguration } from 'webpack-dev-server';

const { ModuleFederationPlugin } = webpack.container;

interface WebpackConfiguration extends Configuration {
  devServer?: DevServerConfiguration;
}

// Optional: unset, or set to an empty string, means "let the backend decide".
const environment = process.env.MFE_ENVIRONMENT?.trim();

const config: WebpackConfiguration = {
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
    path: path.resolve(__dirname, 'dist'),
  },
  resolve: {
    extensions: ['.ts', '.js', '.vue', '.json'],
  },
  module: {
    rules: [
      {
        test: /\.vue$/,
        loader: 'vue-loader',
      },
      {
        test: /\.ts$/,
        loader: 'ts-loader',
        exclude: /node_modules/,
        // The <script lang="ts"> block of an SFC reaches ts-loader as a virtual
        // file with no extension, so it needs the suffix appended to be compiled.
        options: {
          appendTsSuffixTo: [/\.vue$/],
        },
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
        // The key is the federation-safe name you import from ("exampleremote/Button"),
        // and it must have a matching module declaration in src/remotes.d.ts.
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

export default config;
