
### 简答题

1、谈谈你对工程化的初步认识，结合你之前遇到过的问题说出三个以上工程化能够解决问题或者带来的价值。

> 将我们源代码 构建成 生产环境代码 自动编译到浏览器里呈现效果
1. node 构建的模版引擎可以减少写不必要的重复布局
2. 将源代码中的高级语法转化为浏览器可解析的代码，
3. 可以让配置统一，代码风格统一，操作统一

2、你认为脚手架除了为我们创建项目结构，还有什么更深的意义？
> 可以为我们管理多个项目模版，提升开发人员的效率。也可以通过其他定制的命令去执行一段代码

---

### 编程题

概述脚手架实现的过程，并使用 NodeJS 完成一个自定义的小型脚手架工具

> 通过用户输入的内容来选择对应的文件读写等操作。 命令定义放在 bin , 命令执行的逻辑放在 lib。

自定义脚手架 czh-cli: `npm install czh-cli -g` 目前可直接安装


#### gulp构建

该项目的实现思路：

首先需要构建资源文件, 将 js,css,html 到构建出的结果目录里，
而普通的静态资源文件 image , font 在进入生产时打包就可以。开发模式不需要打包

在开发模式运行打包过后打开浏览器， 用到 browser-sync 去打开浏览器，并且具有监听文件的需要，当源代码改变时代码需要更新。

最后做合并处理，压缩缓存目录包中的 html js css

````javascript
// parallel 同时执行任务  series 左到右依次执行任务
// watch 监视文件变化,(回调)  dest 传入打包的文件夹的名称 src(匹配器，默认：当前文件夹/src)
const { src, dest, parallel, series, watch } = require("gulp");
// browserSync 同步打包文件到浏览器（热更新）
const browserSync = require("browser-sync");
// 自动导入易安装gulp的插件
const loadPlugins = require("gulp-load-plugins");

const plugins = loadPlugins();
const bs = browserSync.create();

const data = {
  menus: [
    {
      name: "Home",
      icon: "aperture",
      link: "index.html",
    },
    {
      name: "About",
      link: "about.html",
    },
  ],
  pkg: require("./package.json"),
  date: new Date(),
};
/**
 * 构建任务
 * */
// 样式文件处理任务
const style = () => {
  return src("src/assets/styles/*.scss", { base: "src" }) // 以src 为基准路径
    .pipe(plugins.sass({ outputStyle: "expanded" }))
    .pipe(dest("temp"))
    .pipe(bs.reload({ stream: true })); // 以流的形式往浏览器推送
};

// 脚本文件处理任务
const script = () => {
  return src("src/assets/scripts/*.js", { base: "src" })
    .pipe(plugins.babel({ presets: ["@babel/preset-env"] }))
    .pipe(dest("temp"))
    .pipe(bs.reload({ stream: true }));
};

// html文件处理
const page = () => {
  return src("src/*.html", { base: "src" })
    .pipe(plugins.swig({ data, defaults: { cache: false } })) // 防止模板缓存导致页面不能及时更新
    .pipe(dest("temp"))
    .pipe(bs.reload({ stream: true }));
};

/**
 * image font extra 在build时构建，开发时不需要
 */
// 图片文件处理
const image = () => {
  return src("src/assets/images/**", { base: "src" })
    .pipe(plugins.imagemin())
    .pipe(dest("dist"));
};
// font文件夹中图片处理
const font = () => {
  return src("src/assets/fonts/**", { base: "src" })
    .pipe(plugins.imagemin())
    .pipe(dest("dist"));
};
// 额外任务处理
const extra = () => {
  return src("public/**", { base: "public" }).pipe(dest("dist"));
};
// 自运行文件夹
const serve = () => {
  // watch 监视文件变化， (监视路径, 回调)
  watch("src/assets/styles/**/*.scss", style);
  watch("src/assets/scripts/**/*.js", script);
  watch("src/**/*.html", page);

  // 像下面这种静态资源文件改变时不用去构建，只需要重新加载页面就好了 --- 节省性能
  watch(
    ["src/assets/images/**", "src/assets/fonts/**", "public/**"],
    bs.reload
  );

  bs.init({
    notify: false,
    port: 2080,
    open: true,
    // files: 'dist/**',
    server: {
      // baseDir 会去查找目录，开发时应该依赖src
      baseDir: ["temp", "src", "public"],
      // 在开发时提供对应的文件夹，localhost:2080/node_modules 就可以被访问
      routes: {
        "/node_modules": "node_modules",
      },
    },
  });
};

// 合并文件处理，压缩为最小
const useref = () => {
  return (
    src("temp/*.html", { base: "temp" }) // 开发目录temp
      .pipe(plugins.useref({ searchPath: ["temp", "."] }))
      // html js css 压缩
      .pipe(plugins.if(/\.js$/, plugins.uglify()))
      .pipe(plugins.if(/\.css$/, plugins.cleanCss()))
      .pipe(
        plugins.if(
          /\.html$/,
          plugins.htmlmin({
            collapseWhitespace: true,
            minifyCSS: true,
            minifyJS: true,
          })
        )
      )
      .pipe(dest("dist")) // 最终上线目录
  );
};


// 这些构建任务 运用来 gulp.series 和 gulp.parallel 合并指令
// 清除任务
const del = require("del");
const clean = () => {
  return del(["dist", "temp"]);
};

const compile = parallel(style, script, page);

// 上线之前执行的任务
const build = series(
  clean,
  parallel(series(compile, useref), image, font, extra)
);

// 开发时执行
const develop = series(compile, serve);
// 导出的构建任务就分为三个
module.exports = {
  clean, // 清除
  build, // 生产
  develop, // 开发模式
};
````
