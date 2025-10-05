import { HagaSweet } from './toolchain/hagaSweet'

export default HagaSweet.eatSugar({
    targets: [
        {
            type: 'cpp',
            input: 'public/index.html.in',
        },
        {
            type: 'copy',
            inputs: [
                'public/acdc.svg',
                'public/airbourne.svg',
                'public/alestorm.png',
                'public/badbunny.svg',
                'public/banner_16_9.jpeg',
                'public/blacksabbath.svg',
                'public/deadmaus.png',
                'public/guns-n-roses.png',
                'public/index.css',
                'public/ironmaiden.svg',
                'public/linkinpark.svg',
                'public/metallica.svg',
                'public/oasis.svg',
                'public/publicenemy.svg',
                'public/rosalia.svg',
                'public/skindred.png',
                'public/systemofadown.svg',
                'public/thecure.svg',
            ],
        },
    ],
});
