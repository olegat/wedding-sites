import { HagaSweet } from './toolchain/hagaSweet'

export default HagaSweet.eatSugar({
    targets: [
        { type: 'cpp', input: 'public/index.html.in' },
    ],
});
