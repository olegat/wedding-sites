import { HagaKeyword } from './toolchain/hagaKeyword';
import { HagaSweet, HagaSweetString } from './toolchain/hagaSweet'

const CPP_OUTPUT_DIR: HagaSweetString = [HagaKeyword.CURRENT_OUTPUT_DIR, '/cpp'];

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
            inputDir: [HagaKeyword.CURRENT_INPUT_DIR, '/public'],
            outputDir: CPP_OUTPUT_DIR,
        },
        {
            type: 'minify',
            inputs: [
                'index.html',
                'rsvp.html',
                'travel.html',
            ],
            inputDir: CPP_OUTPUT_DIR,
            outputDir: 'public',
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
                'public/acdc.svg',
                'public/airbourne.svg',
                'public/alestorm.webp',
                'public/badbunny.svg',
                'public/banner_16_9.jpeg',
                'public/blacksabbath.svg',
                'public/deadmaus.webp',
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
            ],
        },
        {
            type: 'zip',
            inputs: [
                'acdc.svg',
                'airbourne.svg',
                'alestorm.webp',
                'badbunny.svg',
                'banner_16_9.jpeg',
                'blacksabbath.svg',
                'burger.js',
                'common.css',
                'deadmaus.webp',
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
            ],
            inputDir: [HagaKeyword.CURRENT_OUTPUT_DIR, '/public'],
            output: 'site.zip',
        },
    ],
});
