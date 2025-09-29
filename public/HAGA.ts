import { type HagaCoreExport } from '../toolchain/hagaCore'
import { HagaMacros } from '../toolchain/hagaSweet'

export default HagaMacros.eatSugar({
    targets: [
        { type: 'cpp', input: 'index.html.in' },
    ],
});
