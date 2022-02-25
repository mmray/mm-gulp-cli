const { src, dest, series, parallel, watch } = require('gulp')

const loadPlugins = require('gulp-load-plugins')
const plugins = loadPlugins()
const browserSync = require('browser-sync')
const bs = browserSync.create()

const del = require('del')

const cwd = process.cwd()

let config = {
  build: {
    src: 'src',
    dist: 'dist',
    temp: 'temp',
    public: 'public',
    paths: {
      styles: 'assets/styles/*.scss',
      scripts: 'assets/scripts/*.js',
      pages: '*.html',
      images: 'assets/images/**',
      fonts: 'assets/fonts/**'
    }
  }
}

try{
  const loadConfig = require(`${cwd}/pages.config.js`)
  config = Object.assign({}, config, loadConfig)
}catch(e) {}

// CSS任务
const style = () => {
  // base 选项即dist目录下的src
  return src(config.build.paths.styles, { base: config.build.src, cwd: config.build.src})
    .pipe(plugins.sass({ outputStyle: 'expanded' }))
    .pipe(dest(config.build.temp))
}

// JS 任务
const script = () => {
  return src(config.build.paths.scripts, { base: config.build.src, cwd: config.build.src })
    .pipe(plugins.babel({ presets: [require('@babel/preset-env')]} ))
    .pipe(dest(config.build.temp))
}

// HTML 任务
const page = () => {
  return src(config.build.paths.pages, { base: config.build.src, cwd: config.build.src } )
    .pipe(plugins.swig({data: config.data, defaults: { cache: false }}))   // 防止模板缓存导致页面不能及时更新
    .pipe(dest(config.build.temp))
}

// Image 任务
const image = () => {
  return src(config.build.paths.images, { base: config.build.src, cwd: config.build.src })
    .pipe(plugins.imagemin())
    .pipe(dest(config.build.dist))
}

// Font 任务
const font = () => {
  return src(config.build.paths.fonts, { base: config.build.src, cwd: config.build.src })
    .pipe(plugins.imagemin())
    .pipe(dest(config.build.dist))
}

// 清除任务
const clean = () => {
  return del([config.build.dist, config.build.temp])
}

// 测试服务器
const serve = () => {
  watch(config.build.paths.styles, { cwd: config.build.src }, style)
  watch(config.build.paths.scripts, { cwd: config.build.src }, script)
  watch(config.build.paths.pages, {cwd: config.build.src}, page)

  watch([
    config.build.paths.images,
    config.build.paths.fonts
  ], { cwd: config.build.src }, bs.reload)
  watch('**', { cwd: config.build.public }, bs.reload)

  bs.init({
    notify: false,
    port: 2080,
    files: `${config.build.temp}/**`,
    server: {
      baseDir: [config.build.temp, config.build.src, config.build.public],
      routes: {
        '/node_modules': 'node_modules'
      }
    }
  })
}

const extra = () => {
  return src('**', {cwd: config.build.public})
    .pipe(dest(config.build.dist))
}

const useref = () => {

  return src(config.build.paths.pages, {base: config.build.temp, cwd: config.build.public})
    .pipe(plugins.useref({ searchPath: [config.build.public, '.'] }))
    .pipe(plugins.if(/\.js$/, plugins.uglify()))
    .pipe(plugins.if(/\.css$/, plugins.cleanCss()))
    .pipe(plugins.if(/\.html$/, plugins.htmlmin({
      collapseWhitespace: true,
      minifyCSS: true,
      minifyJS: true
    })))
    .pipe(dest(config.build.dist))

}

const compile = parallel(style, script, page)

const build = series(clean, parallel(series(compile, useref), image, font, extra))

const dev = series(compile, serve)


module.exports = {
  clean,
  build,
  dev
}