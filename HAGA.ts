// -*- Mode: typescript; typescript-indent-level: 2; -*-
import { HagaKeyword } from './toolchain/hagaKeyword';
import { HagaSweet, HagaSweetString, HagaSweetTargetRsvgConvert } from './toolchain/hagaSweet'

const INDIR_PUBLIC  : HagaSweetString = [HagaKeyword.CURRENT_INPUT_DIR,  '/public'];
const OUTDIR_CPP    : HagaSweetString = [HagaKeyword.CURRENT_OUTPUT_DIR, '/cpp'];
const OUTDIR_PUBLIC : HagaSweetString = [HagaKeyword.CURRENT_OUTPUT_DIR, '/public'];
const OUTDIR_DEPLOY : HagaSweetString = [HagaKeyword.CURRENT_OUTPUT_DIR, '/deploy'];

export default HagaSweet.eatSugar({
  targets: [
    {
      type: 'cpps',
      inputs: [
        'index.html.in',
        'travel.html.in',
      ],
      inputDir: INDIR_PUBLIC,
      outputDir: OUTDIR_CPP,
      defines: ['USE_UNDER_CONSTRUCTION=1'],
    },
    {
      type: 'minify',
      inputs: [
        'index.html',
        'travel.html',
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
      ],
    },
  ],
});
