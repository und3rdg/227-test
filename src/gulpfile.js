// jshint esversion:6, strict:false, node: true, unused: false
// -------------------------------------------------------

const gulp         = require('gulp')
const plumber      = require('gulp-plumber')
const sourcemaps   = require('gulp-sourcemaps')
//sourcemaps compatibility ->
//https://github.com/gulp-sourcemaps/gulp-sourcemaps/wiki/Plugins-with-gulp-sourcemaps-support
const sass         = require('gulp-sass')
const cleanCSS     = require('gulp-clean-css')
const autoprefixer = require('gulp-autoprefixer');
const concat       = require('gulp-concat')
// ---------js only--------------
const browserify   = require('browserify')
const babelify     = require('babelify')
const watchify     = require('watchify')
const source       = require('vinyl-source-stream')
const buffer       = require('vinyl-buffer')
const uglify       = require('gulp-uglify')
const rename       = require('gulp-rename')

const duration     = require('gulp-duration')

// BUNDLES INPUT'S AND OUTPUT'S
//////////////////////////////////////////////

const css = {
    index:{
        src:[
            './scss/index.scss'
        ],
        dist: 'style.css'
    },
    print:{
        src:[
            './src/scss/print.scss'
        ],
        dist: 'print.css'
    }
}



const javascript = {
    bundle: { // es6
        src: [
            './js/index.js'
        ],
        dist: 'bundle.js'
    },
    legacy_code: {
        src: [
            './js/legacy/script.js',
            './js/legacy/script2.js',
        ],
        dist: 'script_es5.js'
    },
}



const es5 = [
    javascript.legacy_code
]



// output folders
const dest = {
    javascript : './../dist/js',
    css        : './../dist/css',
}



// HELPERS
//////////////////////////////////////////////
const is_dev_task = () => {
    // const task_runner = gulp.env._[0]
    const task_runner = process.argv[2]
    let is_dev = false
    is_dev = (task_runner ==="bs") || (task_runner === "watch")
    console.log(
`--------------------
    is_dev: ${is_dev}
--------------------`)
return is_dev
}
const IS_DEV = is_dev_task()
const IS_PROD = !IS_DEV



// JAVASCRIPT
//////////////////////////////////////////////
const jsEs5 = ()=> {
    es5.forEach((item)=> {
        let stream = gulp.src(item.src)
        stream = stream.pipe(plumber())
        stream = IS_DEV ? stream.pipe(sourcemaps.init()) : stream
        stream = IS_PROD ? stream.pipe(uglify()) : stream
        stream = IS_DEV ? stream.pipe(sourcemaps.write('./')) : stream
        stream = stream.pipe(rename(item.dist))
        stream = stream.pipe(duration('javascript es5'))
        stream = stream.pipe(gulp.dest(dest.javascript))

        return stream
    })
}


const jsEs6 = () => {
    const set_browserify = {
        entries: javascript.bundle.src,
        debug: true,
        cache: {},
        packageCache: {},
        fullPaths: true,
    }

    // react still is slowest for compiling.
    // ATM about the same time as with webpack. :(
    const set_babelify = {
        presets: [
            '@babel/env',
            '@babel/preset-react',
        ],
        "plugins": [
            [
                "@babel/plugin-proposal-class-properties",
            ]
        ],
        sourceMaps: IS_DEV ? true : false,
    }

    if(IS_PROD) {
        process.env.NODE_ENV = 'production';
    }
    let stream = browserify(set_browserify)
    stream = stream.transform(babelify.configure(set_babelify))
    IS_DEV && stream.plugin(watchify, {})

    stream = stream.bundle().on('error', err => console.error(err.message))
    stream = stream.pipe(source(javascript.bundle.dist))
    stream = stream.pipe(buffer())

    // enable map if there will by any task running in dev env
    stream = IS_DEV ? stream.pipe(sourcemaps.init({loadMaps: true})) : stream
    stream = IS_PROD ? stream.pipe(uglify()) : stream
    stream = IS_DEV ? stream.pipe(sourcemaps.write('./')) : stream
    stream = stream.pipe(duration('javascript es6'))
    stream = stream.pipe(gulp.dest(dest.javascript))

    return stream
}

gulp.task('js', ()=>{
    jsEs5()
    jsEs6().on('end', bsync.reload)
})



// STYLE
//////////////////////////////////////////////
let scss_constructor_task = (obj_name) => {
    gulp.task(obj_name, () => {
        let stream = gulp.src(css[obj_name].src, { base: './src/scss' })
        stream = stream.pipe(plumber())
        stream = IS_DEV ? stream.pipe(sourcemaps.init()) : stream
        stream = stream.pipe(sass().on('error',sass.logError))
        stream = stream.pipe(autoprefixer())
        stream = stream.pipe(concat(css[obj_name].dist))
        stream = IS_PROD ? stream.pipe(cleanCSS({debug: true})) : stream
        stream = IS_DEV ? stream.pipe(sourcemaps.write('.')) : stream
        // stream = stream.pipe(duration(obj_name))
        stream = stream.pipe(gulp.dest(dest.css))
        stream = stream.pipe(bsync.stream())

        return stream
    })
}



// SCSS TASKS CONSTRUCTOR
//////////////////////////////////////////////
const tasks = [
    'index',
    'print',
]

tasks.forEach( task => scss_constructor_task(task) )

gulp.task('scss', tasks)

const scss_constructor_watch = (obj_name) => {
    gulp.watch(css[obj_name].src, [obj_name])
}


const watch_scss = () => {
    // for modern projects based on import's from index.scss
    gulp.watch('./scss/**/*.scss', ['scss'])

    // for supper big legacy projects
    // based on concatenation via gulp object
    // tasks.forEach( task => scss_constructor_watch(task) )
}



// BROWSERSYNC
//////////////////////////////////////////////
gulp.task('watch_bs', ['browserSync'], () => {
    watch_scss()
    gulp.watch(['./src/js/**/*.js', '!./src/js/**/node_modules/**'], ['js'])
    gulp.watch([
        '../application/**/*.php',
        './../**/*.html'
    ], {delay: 300}).on( 'change', bsync.reload )
})


// Runnin browser synk on server (my local machine's are 100% web server)
const bsync = require('browser-sync').create()
gulp.task('browserSync', () => {
    bsync.init({
        proxy: '227.test/',
        host: '227.test',
        port: 4000,
        ui:{
            port: 4001
        },
        open: false,
        notify: {
            styles: {
                top: 'auto',
                bottom: '0'
            }
        }
    })
})



//////////////////////////////////////////////
// COMPILER
/*
  |------------|------------------------------------|
  | command    | description                        |
  |------------|------------------------------------|
  | gulp       | Run this BEFORE EVERY COMMIT!!!!!! |
  |            | it will DO uglify JS,              |
  |            | it will DO exit after first run.   |
  |            | it will DO run TDD tests.          |
  |------------|------------------------------------|
  | gulp watch | This is for developing process     |
  |            | it will NOT uglify JS,             |
  |            | it will NOT exit after first run.  |
  |------------|------------------------------------|
  | gulp bs    | This is for developing process     |
  |            | it will NOT uglify JS,             |
  |            | it will NOT exit after first run,  |
  |            | hot reaload and ccs injection.     |
  |------------|------------------------------------|
  */


// COMPILE AND WATCH
// >$ npx gulp watch
gulp.task('watch-default', () =>  {
    watch_scss()
    gulp.watch(['./src/js/**/*.js'], ['js'])
})
gulp.task('watch', ['scss', 'js', 'watch-default'])

// COMPILE, WATCH AND HOT RELOAD + EXTRA DEV TOOLS
// >$ npx gulp bs
gulp.task('bs', ['watch_bs', 'scss', 'js'])

// COMPILE AND EXIT
// >$ npx gulp
gulp.task('default', ['scss', 'js'])

// COMPILER
//////////////////////////////////////////////

// vim: tabstop=4 sw=4
