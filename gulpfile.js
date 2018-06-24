const browserSync = require('browser-sync');
const del = require('del');
const { readdir, readFile } = require('fs');
const gulp = require('gulp');
const ampValidator = require('gulp-amphtml-validator');
const autoprefixer = require('gulp-autoprefixer');
const cssnano = require('gulp-cssnano');
const plumber = require('gulp-plumber');
const pug = require('gulp-pug');
const replace = require('gulp-replace');
const responsive = require('gulp-responsive');
const rev = require('gulp-rev');
const sass = require('gulp-sass');
const merge = require('merge-stream');
const { basename, extname, join } = require('path');
const through = require('through2');
const { promisify } = require('util');

/*
 * Helpers
 */
const browserSyncInstance = browserSync.create();

const inlineCss = () => {
  let htmlFile;
  let cssFile;

  const onFile = function(file, _, callback) {
    const extension = extname(file.path);
    if (['.css', '.html'].includes(extension)) {
      if (extension === '.html' && htmlFile === undefined) {
        htmlFile = file;
        callback();
      } else if (cssFile === undefined) {
        cssFile = file;
        callback();
      } else {
        callback(new Error(`Multiple ${extension} files provided.`));
      }
    } else {
      callback(new Error(`Invalid extension: ${extension}.`));
    }
  };

  const onEnd = callback => {
    if (htmlFile === undefined) {
      callback(new Error('Missing html file.'));
      return;
    }
    if (cssFile === undefined) {
      callback(new Error('Missing css file.'));
      return;
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

const revisionManifest = async which =>
  JSON.parse(
    await promisify(readFile)(
      join(__dirname, 'dist', 'revisions', `${which}.json`),
      'utf8',
    ),
  );

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

const makeSrcset = (breakpoints, extension, mapping) =>
  breakpoints
    .map(x => `${mapping[`assets/images/face-${x}px${extension}`]} ${x}w`)
    .join(',');

/*
 * Face image configuration
 */
const IMAGE_FACE_NAME = 'assets/images/face.jpg';
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

/*
 * Combined config for gulp-responsive plugin
 */
const responsiveConfig = {
  [IMAGE_FACE_NAME]: IMAGES_FACE_RESPONSIVE_CONFIG,
};

/*
 * Pug configuration
 */
const pugConfiguration = async () => {
  const mappingFilenames = await promisify(readdir)(
    join(__dirname, 'dist', 'revisions'),
  );
  const mappingObjects = await Promise.all(
    mappingFilenames.map(x => basename(x, '.json')).map(revisionManifest),
  );
  const mapping = mappingObjects.reduce((acc, x) => ({ ...acc, ...x }));
  const mappingWithAbsolutePaths = Object.assign(
    ...Object.entries(mapping).map(([k, v]) => ({ [k]: `/${v}` })),
  );

  const revisions = mappingWithAbsolutePaths;

  return {
    locals: {
      revisions,
      images: {
        face: {
          webp: {
            srcset: makeSrcset(IMAGES_FACE_BREAKPOINTS, '.webp', revisions),
          },
          jpg: {
            srcset: makeSrcset(IMAGES_FACE_BREAKPOINTS, '.jpg', revisions),
          },
        },
      },
    },
  };
};

/*
 * Tasks
 */
gulp.task('clean', () => del(['dist/**', '!dist'], { force: true }));

gulp.task('build:assets:images', () =>
  gulp
    .src('src/assets/images/*.jpg', { base: 'src' })
    .pipe(responsive(responsiveConfig))
    .pipe(rev())
    .pipe(gulp.dest('dist'))
    .pipe(rev.manifest('revisions/images.json'))
    .pipe(gulp.dest('dist')),
);

gulp.task('build:assets:manifest:png', () =>
  gulp
    .src('src/assets/manifest/*.png', { base: 'src' })
    .pipe(rev())
    .pipe(gulp.dest('dist'))
    .pipe(rev.manifest('revisions/manifest-png.json'))
    .pipe(gulp.dest('dist')),
);

gulp.task('build:assets:manifest:browserconfig', async () => {
  const originalAssetPath = 'assets/manifest/mstile-150x150.png';
  const manifest = await revisionManifest('manifest-png');

  return gulp
    .src('src/assets/manifest/browserconfig.xml', { base: 'src' })
    .pipe(replace(originalAssetPath, manifest[originalAssetPath]))
    .pipe(rev())
    .pipe(gulp.dest('dist'))
    .pipe(rev.manifest('revisions/manifest-browserconfig.json'))
    .pipe(gulp.dest('dist'));
});

gulp.task('build:assets:manifest:favicon', () =>
  gulp
    .src('src/assets/manifest/favicon.ico', { base: 'src' })
    .pipe(rev())
    .pipe(gulp.dest('dist'))
    .pipe(rev.manifest('revisions/manifest-favicon.json'))
    .pipe(gulp.dest('dist')),
);

gulp.task('build:assets:manifest:svg', () =>
  gulp
    .src('src/assets/manifest/*.svg', { base: 'src' })
    .pipe(rev())
    .pipe(gulp.dest('dist'))
    .pipe(rev.manifest('revisions/manifest-svg.json'))
    .pipe(gulp.dest('dist')),
);

gulp.task('build:assets:manifest:webmanifest', async () => {
  const smallAssetPath = 'assets/manifest/android-chrome-192x192.png';
  const largeAssetPath = 'assets/manifest/android-chrome-512x512.png';

  const manifest = await revisionManifest('manifest-png');

  return gulp
    .src('src/assets/manifest/site.webmanifest', { base: 'src' })
    .pipe(replace(smallAssetPath, manifest[smallAssetPath]))
    .pipe(replace(largeAssetPath, manifest[largeAssetPath]))
    .pipe(rev())
    .pipe(gulp.dest('dist'))
    .pipe(rev.manifest('revisions/manifest-webmanifest.json'))
    .pipe(gulp.dest('dist'));
});

gulp.task(
  'build:assets',
  gulp.parallel(
    gulp.series(
      'build:assets:manifest:png',
      gulp.parallel(
        'build:assets:manifest:browserconfig',
        'build:assets:manifest:webmanifest',
      ),
    ),
    'build:assets:images',
    'build:assets:manifest:favicon',
    'build:assets:manifest:svg',
  ),
);

gulp.task('build:dev', async () => {
  const manifest = await revisionManifest('images');

  const htmlStream = gulp
    .src('src/templates/index.pug')
    .pipe(plumber())
    .pipe(pug(await pugConfiguration(manifest)))
    .pipe(plumber.stop());

  const stylesStream = gulp
    .src('src/styles/index.scss')
    .pipe(plumber())
    .pipe(sass())
    .pipe(plumber.stop());

  return merge(htmlStream, stylesStream)
    .pipe(plumber())
    .pipe(inlineCss())
    .pipe(plumber.stop())
    .pipe(ampValidator.validate())
    .pipe(ampValidator.format())
    .pipe(gulp.dest('dist'));
});

gulp.task('build:production', async () => {
  const manifest = await revisionManifest('images');

  const htmlStream = gulp
    .src('src/templates/index.pug')
    .pipe(pug(await pugConfiguration(manifest)));

  const stylesStream = gulp
    .src('src/styles/index.scss')
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

gulp.task('build', gulp.series('clean', 'build:assets', 'build:production'));

gulp.task('watch', () => {
  browserSyncInstance.init({
    open: false,
    port: 8080,
    server: 'dist',
  });

  gulp
    .watch(
      ['src/templates/*.pug', 'src/styles/*.scss'],
      gulp.series('build:dev'),
    )
    .on('change', browserSyncInstance.reload);
});

gulp.task(
  'start:dev',
  gulp.series('clean', 'build:assets', 'build:dev', 'watch'),
);

gulp.task('default', gulp.series('start:dev'));
