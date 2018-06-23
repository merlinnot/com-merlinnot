const browserSync = require('browser-sync');
const del = require('del');
const gulp = require('gulp');
const ampValidator = require('gulp-amphtml-validator');
const autoprefixer = require('gulp-autoprefixer');
const cssnano = require('gulp-cssnano');
const plumber = require('gulp-plumber');
const pug = require('gulp-pug');
const responsive = require('gulp-responsive');
const sass = require('gulp-sass');
const merge = require('merge-stream');
const { extname } = require('path');
const through = require('through2');

/*
 * Common image configuration and helper methods
 */
const BREAKPOINT_MIN_PX = 320;
const BREAKPOINT_OFFSET_PX = 160;
const BREAKPOINTS_PX = Array.from(
  { length: 11 },
  (_, x) => BREAKPOINT_MIN_PX + x * BREAKPOINT_OFFSET_PX,
);

const RESPONSIVE_IMAGES_CONFIG = BREAKPOINTS_PX.map(x => ({
  width: x,
  rename: { suffix: `-${x}px` },
}));

const makeSrcset = breakpoints => extension =>
  breakpoints.map(x => `images/face-${x}px${extension} ${x}w`).join(',');

/*
 * Face image configuration
 */
const IMAGE_FACE_NAME = 'face.jpg';
const IMAGES_FACE_LAST_BREAKPOINT_INDEX = 6;
const IMAGES_FACE_BREAKPOINTS = BREAKPOINTS_PX.slice(
  0,
  IMAGES_FACE_LAST_BREAKPOINT_INDEX,
);

const IMAGES_FACE_RESPONSIVE_CONFIG_BASE = RESPONSIVE_IMAGES_CONFIG.slice(
  0,
  IMAGES_FACE_LAST_BREAKPOINT_INDEX,
);

const IMAGES_FACE_RESPONSIVE_CONFIG = [
  ...IMAGES_FACE_RESPONSIVE_CONFIG_BASE,
  ...IMAGES_FACE_RESPONSIVE_CONFIG_BASE.map(x => ({
    ...x,
    format: 'webp',
    rename: { ...x.rename, extname: '.webp' },
  })),
];

const IMAGES_FACE_SRCSET_WEBP = makeSrcset(IMAGES_FACE_BREAKPOINTS)('.webp');
const IMAGES_FACE_SRCSET_JPG = makeSrcset(IMAGES_FACE_BREAKPOINTS)('.jpg');

/*
 * Combined config for gulp-responsive plugin
 */
const RESPONSIVE_CONFIG = {
  [IMAGE_FACE_NAME]: IMAGES_FACE_RESPONSIVE_CONFIG,
};

/*
 * Pug configuration
 */
const PUG_CONFIGURATION = {
  locals: {
    images: {
      face: {
        webp: {
          srcset: IMAGES_FACE_SRCSET_WEBP,
        },
        jpg: {
          srcset: IMAGES_FACE_SRCSET_JPG,
        },
      },
    },
  },
};

/*
 * Helpers
 */
const browserSyncInstance = browserSync.create();

const inlineCss = () => {
  let htmlFile;
  let cssFile;

  const onFile = (file, _, callback) => {
    const extension = extname(file.path);
    console.log(extension);
    if (['.css', '.html'].includes(extension)) {
      if (extension === '.html' && htmlFile === undefined) {
        htmlFile = file;
      } else if (cssFile === undefined) {
        cssFile = file;
      } else {
        throw new Error(`Multiple ${extension} files provided.`);
      }
    } else {
      throw new Error(`Invalid extension: ${extension}.`);
    }
    callback();
  };

  const onEnd = callback => {
    if (htmlFile === undefined) {
      throw new Error('Missing html file.');
    }
    if (cssFile === undefined) {
      throw new Error('Missing css file.');
    }

    const cssFileContents = cssFile.contents.toString();
    const customStyleTag = `<style amp-custom>${cssFileContents}</style>`;
    const customCssRegex = /<style amp-custom>(.*)<\/style>/;

    const newHtmlFileContents = htmlFile.contents
      .toString()
      .replace(customCssRegex, customStyleTag);

    htmlFile.contents = new Buffer.from(newHtmlFileContents);

    callback(null, htmlFile);
  };

  return through.obj(onFile, onEnd);
};

/*
 * Tasks
 */
gulp.task('clean', () => del(['dist/**', '!dist'], { force: true }));

gulp.task('build:images', () =>
  gulp
    .src('src/images/*.jpg')
    .pipe(responsive(RESPONSIVE_CONFIG))
    .pipe(gulp.dest('dist/images')),
);

gulp.task('build:dev', () => {
  const htmlStream = gulp
    .src('src/index.pug')
    .pipe(plumber())
    .pipe(pug(PUG_CONFIGURATION))
    .pipe(plumber.stop());

  const stylesStream = gulp
    .src('src/index.scss')
    .pipe(plumber())
    .pipe(sass())
    .pipe(plumber.stop());

  return merge(htmlStream, stylesStream)
    .pipe(inlineCss())
    .pipe(ampValidator.validate())
    .pipe(ampValidator.format())
    .pipe(gulp.dest('dist'));
});

gulp.task('build:dev:reload', gulp.series('build:dev'), () => {
  browserSyncInstance.reload();
});

gulp.task('build:production', () => {
  const htmlStream = gulp.src('src/index.pug').pipe(pug(PUG_CONFIGURATION));

  const stylesStream = gulp
    .src('src/index.scss')
    .pipe(sass())
    .pipe(autoprefixer())
    .pipe(cssnano());

  return merge(htmlStream, stylesStream)
    .pipe(inlineCss())
    .pipe(ampValidator.validate())
    .pipe(ampValidator.format())
    .pipe(ampValidator.failAfterError())
    .pipe(gulp.dest('dist'));
});

gulp.task(
  'build',
  gulp.series('clean', gulp.parallel('build:images', 'build:production')),
);

gulp.task('watch', () => {
  browserSyncInstance.init({
    open: false,
    port: 8080,
    server: 'dist',
  });

  gulp.watch(
    ['src/index.pug', 'src/index.scss'],
    gulp.series('build:dev:reload'),
  );
});

gulp.task(
  'start:dev',
  gulp.series('clean', gulp.parallel('build:images', 'build:dev'), 'watch'),
);

gulp.task('default', gulp.series('start:dev'));
