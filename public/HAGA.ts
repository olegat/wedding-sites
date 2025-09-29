import { HagaSweet } from '../toolchain/hagaSweet'

export default HagaSweet.eatSugar({
    targets: [
        { type: 'cpp', input: 'index.html.in' },
    ],
});
