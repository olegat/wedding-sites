import { HagaKeyword } from './toolchain/hagaKeyword';
import { HagaSweet } from './toolchain/hagaSweet'

export default HagaSweet.eatSugar({
    targets: [
        {
            type: 'cpp',
            input: 'public/index.html.in',
            output: [HagaKeyword.CURRENT_OUTPUT_DIR, '/cpp/index.html'],
            // C-u M-! ./print-implicits.bash public/index.html.in
            implicits: [
                'public/body_footer.html',
                'public/body_header.html',
                'public/head_common.html',
            ],
        },
        {
            type: 'cpp',
            input: 'public/travel.html.in',
            output: [HagaKeyword.CURRENT_OUTPUT_DIR, '/cpp/travel.html'],
            // C-u M-! ./print-implicits.bash public/travel.html.in
            implicits: [
                'public/body_footer.html',
                'public/body_header.html',
                'public/head_common.html',
            ],
        },
        {
            type: 'minify',
            inputs: [
                'public/rsvp.html',
                'public/burger.js',
                'public/common.css',
                'public/index.css',
                'public/language.js',
                'public/travel.css',
            ],
        },
        {
            type: 'minify',
            inputs: [
                'index.html',
                'travel.html',
            ],
            inputDir: [HagaKeyword.CURRENT_OUTPUT_DIR, '/cpp'],
            outputDir: 'public',
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
    ],
});
