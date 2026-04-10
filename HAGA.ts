// -*- Mode: typescript; typescript-indent-level: 2; -*-
import { HagaKeyword } from './toolchain/hagaKeyword';
import { HagaSweet, HagaSweetString, HagaSweetTargetRsvgConvert } from './toolchain/hagaSweet'

const INDIR_PUBLIC  : HagaSweetString = [HagaKeyword.CURRENT_INPUT_DIR,  '/public'];
const OUTDIR_TSC    : HagaSweetString = [HagaKeyword.CURRENT_OUTPUT_DIR, '/tsc'];
const OUTDIR_CPP    : HagaSweetString = [HagaKeyword.CURRENT_OUTPUT_DIR, '/cpp'];
const OUTDIR_PUBLIC : HagaSweetString = [HagaKeyword.CURRENT_OUTPUT_DIR, '/public'];
const OUTDIR_DEPLOY : HagaSweetString = [HagaKeyword.CURRENT_OUTPUT_DIR, '/deploy'];

export default HagaSweet.eatSugar({
  targets: [
    {
      type: 'tsc',
      inputs: [
        'public/language.ts',
      ],
      outputDir: OUTDIR_TSC,
    },
    {
      type: 'minify',
      inputs: [
        'language.js',
      ],
      inputDir: OUTDIR_TSC,
      outputDir: OUTDIR_PUBLIC,
    },
    {
      type: 'cpps',
      inputs: [
        'index.css.in',
        'index.html.in',
        'travel.html.in',
        'hotels.html.in',
      ],
      inputDir: INDIR_PUBLIC,
      outputDir: OUTDIR_CPP,
      defines: ['USE_UNDER_CONSTRUCTION=1'],
    },
    {
      type: 'minify',
      inputs: [
        'index.css',
        'index.html',
        // 'travel.html',
        // 'hotels.html',
      ],
      inputDir: OUTDIR_CPP,
      outputDir: OUTDIR_PUBLIC,
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
        'public/flowers1.webp',
        'public/placeholder1.jpeg',
        'public/placeholder2.jpeg',
        'public/placeholder3.jpeg',
        'public/placeholder4.jpeg',
        'public/Aileron.woff2',
        'public/AileronBold.woff2',
        'public/NewIconSerifRegular.woff2',
        'public/PinyonScript.woff2',
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
        'index.css',
        'index.html',
        'language.js',
        'flowers1.webp',
        'placeholder1.jpeg',
        'placeholder2.jpeg',
        'placeholder3.jpeg',
        'placeholder4.jpeg',
        'Aileron.woff2',
        'AileronBold.woff2',
        'NewIconSerifRegular.woff2',
        'PinyonScript.woff2',
      ],
    },
  ],
});
