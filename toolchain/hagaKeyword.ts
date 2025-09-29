//------------------------------------------------------------------------------
// Types:
//------------------------------------------------------------------------------
type Keywords =
    'CPP_COMMAND' |
    'INPUT_DIR' |
    'OUTPUT_DIR' |
    'CURRENT_INPUT_DIR' |
    'CURRENT_OUTPUT_DIR';

type KeywordObj<K extends Keywords> = { readonly keyword: K };

//------------------------------------------------------------------------------
// Constants:
//------------------------------------------------------------------------------
const HagaKeyword: { readonly [K in Keywords]: KeywordObj<K> } = {
    CPP_COMMAND: { keyword: 'CPP_COMMAND' },
    INPUT_DIR: { keyword: 'INPUT_DIR' },
    OUTPUT_DIR: { keyword: 'OUTPUT_DIR' },
    CURRENT_INPUT_DIR: { keyword: 'CURRENT_INPUT_DIR' },
    CURRENT_OUTPUT_DIR: { keyword: 'CURRENT_OUTPUT_DIR' },
};

type HagaKeyword = typeof HagaKeyword[Keywords];
type HagaKeywordMapping = { [K in Keywords]: string };

//------------------------------------------------------------------------------
// Exports:
//------------------------------------------------------------------------------
export {
    HagaKeyword,
    HagaKeywordMapping,
};
