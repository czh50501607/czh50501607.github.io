
### 简答题

1、Webpack 的构建流程主要有哪些环节？如果可以请尽可能详尽的描述 Webpack 打包的整个过程
> webpack 主要先通过入口文件，然后解析各个模块经过loader和plugin的解析。(先通过plguin后loader), 每个文件都会转为一块函数的形式去放到打包文件中, 并通过treesharking去除多余代码。

2、Loader 和 Plugin 有哪些不同？请描述一下开发 Loader 和 Plugin 的思路。

> loader 是匹配对应的文件来执行对应的加载器,主要作用在于按要求解析文件
> plugin 是增强项目能力。处理每个文件之外的事情，除了解析方面的事情
*开发思路*
> loader 是要求最终结果返回一段代码块这段代码块会放入打包结果中

```javascript
module.exports = (source) => {} // 我们可以用别的插件来给loader做文件处理
```

> plugin 是要求声明一个class 具有 apply 方法
会传给 apply 方法对应的内容

```javascript
class MyPlugin{
  apply(complier){

  }
}
```

---

### 编程题

使用 Webpack 实现 Vue 项目打包任务

__webpack.common.js__
``` javascript

const path = require('path');
const { HotModuleReplacementPlugin, DefinePlugin } = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const VueLoaderPlugin = require('vue-loader/lib/plugin');

module.exports = {
  entry: './src/main.js',
  output: {
    path: path.resolve(process.cwd(), './dist'),
    filename: '[name].js',
    publicPath: '',
  },
  target: 'web',
  module: {
    rules: [
      {
        test: /\.(png|jpe?g|gif|svg)(\?.*)?$/,
        use: {
          loader: 'url-loader',
          options: { 
            limit: 10 * 1024,
            esModule: false
          }, // 10 kb,超出就调用  file-loader
        },
      },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
        },
      },
      {
        test: /\.vue$/,
        use: ['vue-loader'],
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.less$/,
        use: ['style-loader', 'css-loader', 'less-loader'],
      },
    ],
  },
  plugins: [
    new DefinePlugin({
      BASE_URL: `"/"`,
    }),
    new HtmlWebpackPlugin({
      template: 'public/index.html',
      title: '6666',
    }),
    new VueLoaderPlugin(),
  ],
};


```

__webpack.dev.js__

```javascript
const { merge } = require('webpack-merge');
const commonConfig = require('./webpack.common');

module.exports = merge({}, commonConfig, {
  mode: 'development',
  devServer: {
    port: 3984,
    hot: true,
  },
});

```

__webpack.prod.js__
```javascript
const path = require('path');
const { merge } = require('webpack-merge');
const commonConfig = require('./webpack.common');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const OptimizeCssAssetsWebpackPlugin = require('optimize-css-assets-webpack-plugin');
const TerserWebpackPluin = require('terser-webpack-plugin');

module.exports = merge({}, commonConfig, {
  mode: 'production',
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [
          {
            loader: 'style-loader',
          },
          MiniCssExtractPlugin.loader,
          {
            loader: 'css-loader',
          },
        ],
      },
    ],
  },
  plugins: [
    new CleanWebpackPlugin(),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: path.resolve(__dirname, 'public/'),
          to: './',
        },
      ],
    }),
    new MiniCssExtractPlugin({
      filename: '[name]-[hash:8].bundle.css',
    }),
  ],
  optimization: {
    usedExports: true,
    minimize: true,
    // 合并每一个模块到函数中
    concatenateModules: true,
    splitChunks: {
      chunks: 'all',
    },
    minimizer: [new TerserWebpackPluin(), new OptimizeCssAssetsWebpackPlugin()],
  },
});

```
