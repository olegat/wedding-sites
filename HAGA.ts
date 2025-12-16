import { HagaSweet } from './toolchain/hagaSweet'

export default HagaSweet.eatSugar({
    targets: [
        {
            type: 'cpp',
            input: 'public/index.html.in',
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
            // C-u M-! ./print-implicits.bash public/travel.html.in
            implicits: [
                'public/body_footer.html',
                'public/body_header.html',
                'public/head_common.html',
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
                'public/burger.js',
                'public/common.css',
                'public/deadmaus.webp',
                'public/guns-n-roses.webp',
                'public/index.css',
                'public/ironmaiden.svg',
                'public/language.js',
                'public/linkinpark.svg',
                'public/metallica.svg',
                'public/oasis.svg',
                'public/publicenemy.svg',
                'public/rosalia.svg',
                'public/skindred.webp',
                'public/systemofadown.svg',
                'public/thecure.svg',
                'public/travel.css',
                'public/travel_3_2.jpeg',
            ],
        },
    ],
});
