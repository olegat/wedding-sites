import { HagaKeyword } from './toolchain/hagaKeyword';
import { HagaSweet, HagaSweetCommandArgs, HagaSweetString, HagaSweetTargetRsvgConvert } from './toolchain/hagaSweet'

const INDIR_PUBLIC  : HagaSweetString = [HagaKeyword.CURRENT_INPUT_DIR,  '/public'];
const OUTDIR_CPP    : HagaSweetString = [HagaKeyword.CURRENT_OUTPUT_DIR, '/cpp'];
const OUTDIR_PUBLIC : HagaSweetString = [HagaKeyword.CURRENT_OUTPUT_DIR, '/public'];
const OUTDIR_DEPLOY : HagaSweetString = [HagaKeyword.CURRENT_OUTPUT_DIR, '/deploy'];

const LOW_OPTS: HagaSweetCommandArgs = ['-resize', 'x100', '-quality', '50'];

/*
// Full Website
export default HagaSweet.eatSugar({
    targets: [
        // Two steps for *.html.in files:
        // 1. output `out/cpp/*.html` and `out/cpp/*.html.d` with clang.
        // 2. output `out/public/*.html` with minify.
        {
            type: 'cpps',
            inputs: [
                'hotels.html.in',
                'index.html.in',
                'travel.html.in',
                'rsvp.html.in',
            ],
            inputDir: INDIR_PUBLIC,
            outputDir: OUTDIR_CPP,
        },
        {
            type: 'minify',
            inputs: [
                'hotels.html',
                'index.html',
                'rsvp.html',
                'travel.html',
            ],
            inputDir: OUTDIR_CPP,
            outputDir: OUTDIR_PUBLIC,
        },
        {
            type: 'minify',
            inputs: [
                'public/burger.js',
                'public/common.css',
                'public/index.css',
                'public/language.js',
                'public/travel.css',
            ],
        },
        {
            type: 'magick',
            input:  'public/banner_16_9.jpeg',
            output: 'public/banner_16_9_low.jpeg',
            args: LOW_OPTS,
        },
        {
            type: 'magick',
            input: 'design/chalet.png',
            output: 'public/hotels_3_2.jpeg',
            args: ['-quality', '80'],
        },
        {
            type: 'magick',
            input: 'design/chalet.png',
            output: 'public/hotels_3_2_low.jpeg',
            args: LOW_OPTS,
        },
        {
            type: 'magick',
            input:  'public/travelalt_3_2.jpeg',
            output: 'public/travelalt_3_2_low.jpeg',
            args: LOW_OPTS,
        },
        ...[16, 32, 48, 96, 128, 180, 192].map((d: number): HagaSweetTargetRsvgConvert => {
            return {
                type: 'rsvg-convert',
                input:  'public/favicon.svg',
                output: `public/favicon-${d}x${d}.png`,
                args: ['-w', `${d}`, '-h', `${d}`],
            }
        }),
        {
            type: 'magick',
            input:  [HagaKeyword.CURRENT_OUTPUT_DIR, '/public/favicon-192x192.png'],
            output: `public/favicon.ico`,
            args: ['-background', 'none', '-define', 'icon:auto-resize=16,32,48'],
        },
        {
            type: 'copy',
            inputs: [
                'public/.htaccess',
                'public/acdc.svg',
                'public/airbourne.svg',
                'public/alestorm.webp',
                'public/badbunny.svg',
                'public/banner_16_9.jpeg',
                'public/blacksabbath.svg',
                'public/deadmaus.webp',
                'public/favicon.svg',
                'public/guns-n-roses.webp',
                'public/ironmaiden.svg',
                'public/linkinpark.svg',
                'public/metallica.svg',
                'public/oasis.svg',
                'public/publicenemy.svg',
                'public/rosalia.svg',
                'public/skindred.webp',
                'public/systemofadown.svg',
                'public/thecure.svg',
                'public/travelalt_3_2.jpeg',
            ],
        },
        {
            type: 'rsync',
            name: 'deploy',
            srcDir: OUTDIR_PUBLIC,
            configTemplate: {
                dstDir: OUTDIR_DEPLOY,
            },
            config: 'deploy.json',
            inputs: [
                '.htaccess',
                'acdc.svg',
                'airbourne.svg',
                'alestorm.webp',
                'badbunny.svg',
                'banner_16_9.jpeg',
                'banner_16_9_low.jpeg',
                'blacksabbath.svg',
                'burger.js',
                'common.css',
                'deadmaus.webp',
                'favicon.svg',
                'favicon.ico',
                'favicon-16x16.png',
                'favicon-32x32.png',
                'favicon-48x48.png',
                'favicon-96x96.png',
                'favicon-128x128.png',
                'favicon-180x180.png',
                'favicon-192x192.png',
                'hotels.html',
                'hotels_3_2.jpeg',
                'hotels_3_2_low.jpeg',
                'guns-n-roses.webp',
                'index.css',
                'index.html',
                'ironmaiden.svg',
                'language.js',
                'linkinpark.svg',
                'metallica.svg',
                'oasis.svg',
                'publicenemy.svg',
                'rosalia.svg',
                'rsvp.html',
                'skindred.webp',
                'systemofadown.svg',
                'thecure.svg',
                'travel.css',
                'travel.html',
                'travelalt_3_2.jpeg',
                'travelalt_3_2_low.jpeg',
            ],
        },
    ],
});
//*/

//*
// WIP Under construction version:
export default HagaSweet.eatSugar({
  targets: [
    {
      type: 'cpps',
      inputs: [ 'index.html.in', 'rsvp.html.in' ],
      inputDir: INDIR_PUBLIC,
      outputDir: OUTDIR_CPP,
      defines: ['USE_UNDER_CONSTRUCTION=1'],
    },
    {
      type: 'minify',
      inputs: [ 'index.html', 'rsvp.html' ],
      inputDir: OUTDIR_CPP,
      outputDir: OUTDIR_PUBLIC,
    },
    {
      type: 'minify',
      inputs: ['public/language.js'],
    },
    ...[16, 32, 48, 96, 128, 180, 192].map((d: number): HagaSweetTargetRsvgConvert => {
      return {
        type: 'rsvg-convert',
        input:  'public/favicon.svg',
        output: `public/favicon-${d}x${d}.png`,
        args: ['-w', `${d}`, '-h', `${d}`],
      }
    }),
    {
      type: 'magick',
      input:  [HagaKeyword.CURRENT_OUTPUT_DIR, '/public/favicon-192x192.png'],
      output: `public/favicon.ico`,
      args: ['-background', 'none', '-define', 'icon:auto-resize=16,32,48'],
    },
    {
      type: 'copy',
      inputs: [
        'public/.htaccess',
        'public/favicon.svg',
      ],
    },
    {
      type: 'rsync',
      name: 'deploy',
      srcDir: OUTDIR_PUBLIC,
      configTemplate: {
        dstDir: OUTDIR_DEPLOY,
      },
      config: 'deploy.json',
      inputs: [
        '.htaccess',
        'favicon.svg',
        'favicon.ico',
        'favicon-16x16.png',
        'favicon-32x32.png',
        'favicon-48x48.png',
        'favicon-96x96.png',
        'favicon-128x128.png',
        'favicon-180x180.png',
        'favicon-192x192.png',
        'index.html',
        'language.js',
        'rsvp.html',
      ],
    },
  ],
});
//*/