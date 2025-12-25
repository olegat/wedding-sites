import { HagaKeyword } from './toolchain/hagaKeyword';
import { HagaSweet, HagaSweetString } from './toolchain/hagaSweet'

const INDIR_PUBLIC  : HagaSweetString = [HagaKeyword.CURRENT_INPUT_DIR,  '/public'];
const OUTDIR_CPP    : HagaSweetString = [HagaKeyword.CURRENT_OUTPUT_DIR, '/cpp'];
const OUTDIR_PUBLIC : HagaSweetString = [HagaKeyword.CURRENT_OUTPUT_DIR, '/public'];
const OUTDIR_DEPLOY : HagaSweetString = [HagaKeyword.CURRENT_OUTPUT_DIR, '/deploy'];

export default HagaSweet.eatSugar({
    targets: [
        // Two steps for *.html.in files:
        // 1. output `out/cpp/*.html` and `out/cpp/*.html.d` with clang.
        // 2. output `out/public/*.html` with minify.
        {
            type: 'cpps',
            inputs: [
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
                'public/travel_3_2.jpeg',
                'public/travelalt_3_2.jpeg',
            ],
        },
        {
            type: 'rsync',
            name: 'deploy_public',
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
                'blacksabbath.svg',
                'burger.js',
                'common.css',
                'deadmaus.webp',
                'favicon.svg',
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
                'travel_3_2.jpeg',
                'travelalt_3_2.jpeg',
            ],
        },
    ],
});
