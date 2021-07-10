const { resolve } = require('path')
const webpack = require('webpack');
//  复制
const CopyWebpackPlugin = require('copy-webpack-plugin') 
// 每次打包前都清空打包代码
const { CleanWebpackPlugin } = require('clean-webpack-plugin')

//  引用自定义插件，动态设置entry
const MultiEntryPlugin = require('./plugin/MultiEntryPlugin');

// const UglifyJSPlugin = require('webpack/lib/optimize/UglifyJsPlugin');
const TerserPlugin = require("terser-webpack-plugin");

const MiniCssExtractPlugin = require("mini-css-extract-plugin");

const LodashWebpackPlugin = require('lodash-webpack-plugin');
const MinaRuntimePlugin = require('./plugin/MinaRuntimePlugin');



// const MinaRuntimePlugin = require('@tinajs/mina-runtime-webpack-plugin')

// import MultiEntryPlugin from 'multi-entry-plugin';
module.exports = {
    optimization: {
        splitChunks: {
            chunks: 'all',
            /**
             * initial 入口 chunk，对于异步导入的文件不处理
                async 异步 chunk，只对异步导入的文件处理
                all 全部 chunk
             */

            // 缓存分组
            cacheGroups: {
                // 第三方模块
                vendor: {
                    name: 'vendor', // chunk 名称
                    priority: 1, // 权限更高，优先抽离，重要！！！
                    test: /node_modules/, // 一般第三方模块都是从node_modules引进来如lodash
                    minSize: 0,  // 大小限制
                    minChunks: 1  // 最少复用过几次
                },

                // 公共的模块
                common: {
                    name: 'common', // chunk 名称
                    priority: 0, // 优先级
                    minSize: 0,  // 公共模块的大小限制
                    minChunks: 2  // 公共模块最少复用过几次
                }
            }
        },
        runtimeChunk: {
            name: 'runtime',
        },
        minimize: true,  // 是否混淆
        minimizer: [
            new TerserPlugin({
                terserOptions: {
                    format: {
                      comments: true,
                    },
                    compress: {  // 打包时打印去掉
                        warnings: true,
                        drop_debugger: true,
                        drop_console: true,
                      }
                  },
                  extractComments: true,
            }),
          ],
      },
    context: resolve('src'),
        entry: './app.js',
        // entry: {
        //     'app': './app.js',
        //     'pages/index/index': './pages/index/index.js',
        //     'pages/logs/logs': './pages/logs/logs.js'
        // },
        output: {
            path: resolve('dist'),
            filename: '[name].js',
            globalObject: 'wx',
            publicPath: '',
        },
    module: {
        rules: [
            {
                test: /\.js$/,
                use: ['babel-loader'],
            },
            {
                test: /\.(scss)$/,
                include: /src/,
                use: [
                
                    {
                        loader: 'file-loader',
                        options: {
                            useRelativePath: true,
                            name: '[path][name].wxss',
                            context: resolve('src'),
                        },
                    },
                    {
                        loader: 'sass-loader',
                        options: {
                            sassOptions: {
                                includePaths: [resolve('src', 'styles'), resolve('src')],
                            } 
                        },
                    },
                ],
            },
        ],
    },
    plugins: [
     
         // new LodashWebpackPlugin(),
         new CleanWebpackPlugin({
            cleanStaleWebpackAssets: false,
        }),
      
        new MultiEntryPlugin({
            scriptExtensions: ['.js'],
            assetExtensions: ['.scss'],
        }),
        new MinaRuntimePlugin(),
      
        new CopyWebpackPlugin({
            patterns: [
                {
                    from: '**/*',
                    to: './',
                    globOptions: { // 复制时排除文件配置
                        dot: false,
                        gitignore: false,
                        ignore: ['**/*.js'],
                        // ignore: ['**/*.js', '**/*.scss'], 
                        // ignore: ['**/*.scss'],
                    }
                },
            ]
        }
        ),
    ],
    mode: 'none',
}