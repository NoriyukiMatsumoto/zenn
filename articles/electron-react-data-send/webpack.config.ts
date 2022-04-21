/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable import/no-default-export */
import { Configuration } from "webpack";
import HtmlWebpackPlugin from "html-webpack-plugin";
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import Dotenv from "dotenv-webpack";
const path = require("path");

const isDev = process.env.NODE_ENV === "development";
const ElectronReloadPlugin = require("webpack-electron-reload")({
  path: path.join(__dirname, "./dist/main.js"),
});

const common: Configuration = {
  mode: isDev ? "development" : "production",
  resolve: {
    extensions: [".js", ".ts", ".jsx", ".tsx", ".json"],
  },
  externals: ["fsevents"],
  output: {
    publicPath: "./",
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        loader: "ts-loader",
      },
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, "css-loader"],
      },
      {
        test: /\.html$/,
        loader: "raw-loader",
      },
    ],
  },
  watch: isDev,
  devtool: isDev ? "inline-source-map" : undefined,
};

const main: Configuration = {
  ...common,
  target: "electron-main",
  entry: {
    main: "./src/main.ts",
  },
  plugins: [],
};

const preload: Configuration = {
  ...common,
  target: "electron-preload",
  entry: {
    preload: "./src/preload.ts",
  },
  plugins: [],
};

const rendererChild: Configuration = {
  ...common,
  target: "web",
  entry: {
    app: "./src/Child.tsx",
  },
  output: {
    filename: "child.js",
  },
  plugins: [
    new MiniCssExtractPlugin(),
    new HtmlWebpackPlugin({
      template: "./src/child.html",
      filename: "child.html",
    }),
    new Dotenv({ path: path.resolve(__dirname, `.env`) }),
  ],
};

const rendererParent: Configuration = {
  ...common,
  target: "web",
  entry: {
    app: "./src/Parent.tsx",
  },
  output: {
    filename: "parent.js",
  },

  plugins: [
    new MiniCssExtractPlugin(),
    new HtmlWebpackPlugin({
      template: "./src/parent.html",
      filename: "parent.html",
    }),
    new Dotenv({ path: path.resolve(__dirname, `.env`) }),
  ],
};
if (isDev) {
  const electronReloadPlugin = ElectronReloadPlugin();
  main.plugins?.push(electronReloadPlugin);
  rendererChild.plugins?.push(electronReloadPlugin);
  rendererParent.plugins?.push(electronReloadPlugin);
}
const config = [main, preload, rendererChild, rendererParent];
export default config;
