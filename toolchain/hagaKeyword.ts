//------------------------------------------------------------------------------
// Types:
//------------------------------------------------------------------------------
type Keywords =
    | 'BASH_COMMAND'
    | 'CLANG_COMMAND'
    | 'COPY_COMMAND'
    | 'CURRENT_INPUT_DIR'
    | 'CURRENT_OUTPUT_DIR'
    | 'HAGA_COMMAND'
    | 'HAGA_INPUT_HAGAFILE'
    | 'INPUT_DIR'
    | 'MAGICK_COMMAND'
    | 'OUTPUT_DIR'
    | 'TOUCH_COMMAND'
;

type KeywordObj<K extends Keywords> = { readonly keyword: K };

//------------------------------------------------------------------------------
// Constants:
//------------------------------------------------------------------------------
const HagaKeyword: { readonly [K in Keywords]: KeywordObj<K> } = {
    BASH_COMMAND: { keyword: 'BASH_COMMAND' },
    CLANG_COMMAND: { keyword: 'CLANG_COMMAND' },
    COPY_COMMAND: { keyword: 'COPY_COMMAND' },
    CURRENT_INPUT_DIR: { keyword: 'CURRENT_INPUT_DIR' },
    CURRENT_OUTPUT_DIR: { keyword: 'CURRENT_OUTPUT_DIR' },
    HAGA_COMMAND: { keyword: 'HAGA_COMMAND' },
    HAGA_INPUT_HAGAFILE: { keyword: 'HAGA_INPUT_HAGAFILE' },
    INPUT_DIR: { keyword: 'INPUT_DIR' },
    MAGICK_COMMAND: { keyword: 'MAGICK_COMMAND' },
    OUTPUT_DIR: { keyword: 'OUTPUT_DIR' },
    TOUCH_COMMAND: { keyword: 'TOUCH_COMMAND' },
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
