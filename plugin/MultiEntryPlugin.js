const DynamicEntryPlugin = require('webpack/lib/DynamicEntryPlugin');
const path = require('path')
const minimatch = require('minimatch');
const fs = require('fs')
const replaceExt = require('replace-ext')

const assetsChunkName = '__assets_chunk_name__'


/**
 *  读取 json 配置文件 
 * @param {*} entries 
 * @param {*} dirname 
 * @param {*} entry 
 */
function _inflateEntries(entries = [], dirname, entry) {
    const configFile = replaceExt(entry, '.json')
    const content = fs.readFileSync(configFile, 'utf8')
    const config = JSON.parse(content)

    ;['pages', 'usingComponents', 'subpackages'].forEach(key => {
        const items = config[key]
     
        if (typeof items === 'object') {
         
            if (key === 'subpackages') {
                console.log('subPackages === ', items)
                Object.values(items).forEach(item => _inflateSubPackages(item, entries, dirname))
            } else {
                Object.values(items).forEach(item => inflateEntries(entries, dirname, item))
            }
        }
    })
}

function _inflateSubPackages(subPackge, entries, dirname) {
    let root  =  subPackge.root;
    let pages = subPackge.pages;
    // dirname = `${dirname}\\${root}`
    console.log(' _inflateSubPackages 15',subPackge,  dirname, pages)
    pages.forEach(item =>  {
        inflateEntries(entries, dirname, replaceExt( root + '//'+ item, '.js'))
        // console.log('replaceExt(item)', )
    })
}

function inflateEntries(entries, dirname, entry) {
    // console.log('inflateEntries', entry)
    let keys =  Object.keys(entry)
    if (keys.length === 0) {
        console.error('请配置entry')
        return
    }
    if (Array.isArray(entry[keys[0]]['import'])) {
        entry = path.resolve(dirname, entry[keys[0]]['import'][0])
    } else {
        entry = path.resolve(dirname, entry)
    }

    if (entry != null && !entries.includes(entry)) {
        entries.push(entry)
        _inflateEntries(entries, path.dirname(entry), entry)
    }
}

function first(entry, extensions) {
    for (const ext of extensions) {
        const file = replaceExt(entry, ext)
        if (fs.existsSync(file)) {
            return file
        }
    }
    return null
}
  
function all(entry, extensions) {
    const items = []
    for (const ext of extensions) {
        const file = replaceExt(entry, ext)
        if (fs.existsSync(file)) {
            items.push(file)
        }
    }
    return items
}

class MultiEntryPlugin {
    // 构造函数
    constructor(options = {}) {
        this.scriptExtensions = options.scriptExtensions || ['.ts', '.js']
        this.assetExtensions = options.assetExtensions || []
        this.entries = []
        this.createDynamicEntry = null
    }
    /**
     *   处理函数
     * @param {*} compiler 
     * @param {*} done 
     */
    applyEntry(compiler, done) {
        const { context } = compiler.options
        
        let entriesList = []
        this.entries
        .map(item => first(item, this.scriptExtensions))
        .map(item =>  path.relative(context, item))
        .forEach(item =>  {
           entriesList.push(this.getMultiEntry(item) )
           this.createDynamicEntry(() => this.getMultiEntry(item))
        })
       
        
           
         
        // 把所有的非 js 文件都合到同一个 entry 中，交给 MultiEntryPlugin 去处理
        const assets = this.entries
            .reduce((items, item) => [...items, ...all(item, this.assetExtensions)], [])
            .map(item => './' + path.relative(context, item))
            .forEach(item =>  {  this.createDynamicEntry(() => this.getMultiEntry(item)) })

        
        //  console.log('applyEntry assets',  this.assetExtensions)
        // itemToPlugin(context, assets, assetsChunkName).apply(compiler)

        if (done) {
            done()
        }
    }
    /**
     *  当webpack执行插件时，会执行apply
     * @param {*} compiler  
     */ 
    apply(compiler) {
        // context  路径 、entry 入口配置
        const { context, entry } = compiler.options
         console.log('apply entry', entry)
        inflateEntries(this.entries, context, entry)

        // 在 webpack 选项中的 entry 被处理过之后调用。
        // 这里订阅了 compiler 的 entryOption 事件，当事件发生时，就会执行回调里的代码
        compiler.hooks.entryOption.tap('MinaWebpackPlugin', () => {

            this.createDynamicEntry =
                cb => new DynamicEntryPlugin(context, cb).apply(compiler);
          

            this.applyEntry(compiler)
            return true
        })
        // 在监听模式下，一个新的 compilation 触发之后，但在 compilation 实际开始之前执行
        compiler.hooks.watchRun.tap('MinaWebpackPlugin', (compiler, done) => {
            this.applyEntry(compiler, done)
        })


        compiler.hooks.compilation.tap('MinaWebpackPlugin', compilation => {
            // beforeChunkAssets 事件在 compilation.createChunkAssets 方法之前被触发
            compilation.hooks.beforeChunkAssets.tap('MinaWebpackPlugin', () => {
              const assetsChunkIndex = compilation.chunks.findIndex(({ name }) => name === assetsChunkName)
              if (assetsChunkIndex > -1) {
                // 移除该 chunk, 使之不会生成对应的 asset，也就不会输出文件
                // 如果没有这一步，最后会生成一个 __assets_chunk_name__.js 文件
                compilation.chunks.splice(assetsChunkIndex, 1)
              }
            })
        })
    }

    getMultiEntry(entry) {
        if (!entry) return {};
        const entries = {};
        let ekey = entry.split('.')[0]
        entries[ekey] = { 
            'import': ['./' + entry]
        }
        // console.log('getMultiEntry', entries)
        return entries;
        
    }
    
}

module.exports = MultiEntryPlugin