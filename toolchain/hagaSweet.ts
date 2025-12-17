import path from 'node:path';

import type {
    HagaCoreCommandArgs,
    HagaCoreExport,
    HagaCoreRule,
    HagaCoreTarget,
} from "./hagaCore";

import {
    HagaKeyword,
} from "./hagaKeyword";

import {
    HagaContext,
} from "./hagaContext";


//------------------------------------------------------------------------------
// Types:
//------------------------------------------------------------------------------
type HagaSweetStringComposition = (string | HagaKeyword)[];

type HagaSweetString = string | HagaSweetStringComposition;

type HagaSweetCommandArgs = HagaSweetString[];

type HagaSweetRule = {
    name: HagaSweetString;
    commands: HagaSweetCommandArgs[];
    description?: HagaSweetString;
};

type HagaSweetTargetCPP = {
    type: 'cpp';
    input: HagaSweetString;
    output?: HagaSweetString;
    implicits?: HagaSweetString[];
};

type HagaSweetTargetCopy = {
    type: 'copy';
    inputs: HagaSweetString[];
    outputDir?: HagaSweetString;
};

type HagaSweetTargetMinifyHtml = {
    type: 'minify-html';
    inputs: HagaSweetString[];
    outputDir?: HagaSweetString;
};

export type HagaSweetTargetRegen = {
    type: "regen";
    inputs?: HagaSweetString[]; // default [[HagaKeyword.HAGA_INPUT_HAGAFILE]]
    implicits?: HagaSweetString[]; // default ['./haga', 'toolchain/**.ts']
    outputs?: HagaSweetString[]; // default ["build.ninja"]
};

type HagaSweetTarget =
    HagaSweetTargetCopy |
    HagaSweetTargetCPP |
    HagaSweetTargetMinifyHtml |
    HagaSweetTargetRegen |
    HagaCoreTarget;

type HagaSweetExport = {
    rules?: HagaCoreRule[],
    targets: HagaSweetTarget[];
};

//------------------------------------------------------------------------------
// Constants:
//------------------------------------------------------------------------------
const SweetRules: { [K in NonNullable<HagaSweetTarget['type']>]: HagaSweetRule } = {
    'copy': {
        name: 'copy',
        commands: [
            [ [HagaKeyword.COPY_COMMAND], '$in', '$out' ]
        ],
    },
    'cpp': {
        name: 'cpp',
        commands: [
            [ [HagaKeyword.CPP_COMMAND], '-P', '$in', '>', '$out' ]
        ],
    },
    'minify-html': {
        name: 'minify-html',
        commands: [
            [
                [HagaKeyword.NPX_COMMAND], 'html-minifier-terser',
                '--collapse-whitespace',
                '--remove-comments',
                '--minify-css', 'true',
                '--minify-js', 'true',
                '-o', '$out',
                '$in',
            ],
        ],
        description: 'Minifying $in',
    },
    'regen': {
        name: 'regen',
        commands: [
            [ 'cd', [HagaKeyword.INPUT_DIR] ],
            [ [HagaKeyword.HAGA_COMMAND], 'genin', '$in', '>', '$out']
        ],
        description: 'Regenerate build.ninja',
    },
};

//------------------------------------------------------------------------------
// Implementation:
//------------------------------------------------------------------------------
function addRules(ctx: HagaContext, sweetExport: HagaSweetExport) {
    for (const sweetRule of sweetExport.rules ?? []) {
        if (ctx.ruleMap.has(sweetRule.name)) {
            ctx.reportError(new Error(`duplicate rule found: ${sweetRule.name}. ignoring`));
        } else {
            ctx.ruleMap.set(sweetRule.name, sweetRule);
        }
    }

    for (const target of sweetExport.targets) {
        switch (target.type) {
            case 'copy':
            case 'cpp':
            case 'minify-html':
            case 'regen':
                if ( ! ctx.ruleMap.has(target.type)) {
                    const sweetRule : HagaSweetRule = SweetRules[target.type];
                    const coreRule  : HagaCoreRule  = eatRule(ctx,sweetRule);
                    ctx.ruleMap.set(target.type, coreRule);
                }
                break;
            default:
                target satisfies HagaCoreTarget;
        }
    }
}

function toAbsolutePath(ctx: HagaContext, filepath: string, baseKeyword: HagaKeyword): string {
    const basepath: string = ctx.eatKeywork(baseKeyword);
    return path.resolve(basepath, filepath);
}

function dropExtension(filepath: string, extToDrop: `.${string}`): string {
    if (filepath.endsWith(extToDrop)) {
        return filepath.slice(0, filepath.length - extToDrop.length);
    }
    return filepath;
}

function eatString(ctx: HagaContext, sweetString: undefined): undefined;
function eatString(ctx: HagaContext, sweetString: HagaSweetString): string;
function eatString(ctx: HagaContext, sweetString: HagaSweetString | undefined): string | undefined;
function eatString(ctx: HagaContext, sweetString: HagaSweetString | undefined): string | undefined {
    if (sweetString === undefined || typeof sweetString === 'string') {
        return sweetString;
    }

    const buffer: string[] = [];
    for (const elem of (sweetString satisfies HagaSweetStringComposition)) {
        if (typeof elem === 'string') {
            buffer.push(elem);
        } else {
            buffer.push(ctx.eatKeywork(elem));
        }
    }
    return buffer.join('');
}

function resolvePath(ctx: HagaContext, baseDir: HagaSweetString, sweetString: undefined): undefined;
function resolvePath(ctx: HagaContext, baseDir: HagaSweetString, sweetString: HagaSweetString): string;
function resolvePath(ctx: HagaContext, baseDir: HagaSweetString, sweetString: HagaSweetString | undefined): string | undefined;
function resolvePath(ctx: HagaContext, baseDir: HagaSweetString, sweetString: HagaSweetString | undefined): string | undefined {
    const base = eatString(ctx, baseDir);
    const name = eatString(ctx, sweetString);
    return base != null && name != null ? path.resolve(base, name) : undefined;
}

function resolvePaths(ctx: HagaContext, baseDir: HagaSweetString, sweetString: HagaSweetString[]): string[] {
    const base = eatString(ctx, baseDir);
    return sweetString?.map((s) => path.resolve(base, eatString(ctx, s)));
}

function eatCommands(ctx: HagaContext, sweetCommandArgs: HagaSweetCommandArgs[]): HagaCoreCommandArgs[] {
    return sweetCommandArgs.map((sweetArgs) => sweetArgs.map((s) => eatString(ctx, s)));
}

function eatRule(ctx: HagaContext, sweetRule: HagaSweetRule): HagaCoreRule {
    return {
        name: eatString(ctx, sweetRule.name),
        commands: eatCommands(ctx, sweetRule.commands),
        description: eatString(ctx, sweetRule.description),
    };
}

type InputsAndOutdir = { inputs: HagaSweetString[], outputDir?: HagaSweetString };
type Rule = keyof typeof SweetRules;
function eatTargetInputsWithRule(ctx: HagaContext, sweetTarget: InputsAndOutdir, rule: Rule): HagaCoreTarget[] {
    const outDir: string = resolvePath(ctx, [HagaKeyword.CURRENT_OUTPUT_DIR], sweetTarget.outputDir ?? '');
    return sweetTarget.inputs.map(sweetInput => {
        const relInput: string = eatString(ctx, sweetInput)
        const absInput: string = toAbsolutePath(ctx, relInput, HagaKeyword.CURRENT_INPUT_DIR);
        return {
            inputs: [ absInput ],
            outputs: [ path.resolve(outDir, relInput) ],
            rule,
        }
    });
}

function eatTargetCopy(ctx: HagaContext, sweetTarget: HagaSweetTargetCopy): HagaCoreTarget[] {
    return eatTargetInputsWithRule(ctx, sweetTarget, 'copy');
}

function eatTargetCPP(ctx: HagaContext, sweetTarget: HagaSweetTargetCPP): HagaCoreTarget {
    const input      : string = eatString(ctx, sweetTarget.input)
    const output     : string = eatString(ctx, sweetTarget.output ?? dropExtension(input, '.in'));
    const absInput   : string = toAbsolutePath(ctx, input,  HagaKeyword.CURRENT_INPUT_DIR);
    const absOutput  : string = toAbsolutePath(ctx, output, HagaKeyword.CURRENT_OUTPUT_DIR);
    const implicits = resolvePaths(ctx, [HagaKeyword.INPUT_DIR], sweetTarget.implicits ?? []);
    return {
        inputs: [ absInput ],
        outputs: [ absOutput ],
        implicits,
        rule: 'cpp',
    };
}

function eatTargetMinifyHtml(ctx: HagaContext, sweetTarget: HagaSweetTargetMinifyHtml): HagaCoreTarget[] {
    return eatTargetInputsWithRule(ctx, sweetTarget, 'minify-html');
}

function eatTargetRegen(ctx: HagaContext, sweetTarget: HagaSweetTargetRegen): HagaCoreTarget {
    const inputs    = sweetTarget.inputs ?? [[HagaKeyword.HAGA_INPUT_HAGAFILE]];
    const outputs   = sweetTarget.outputs ?? resolvePaths(ctx, [HagaKeyword.OUTPUT_DIR], ['build.ninja'])
    const implicits = sweetTarget.implicits ?? resolvePaths(ctx, [HagaKeyword.INPUT_DIR], [
        'haga',
        'toolchain/hagaContext.ts',
        'toolchain/hagaKeyword.ts',
        'toolchain/hagaSweet.ts',
        'toolchain/hagaCLI.ts',
        'toolchain/hagaCore.ts',
    ]);
    return {
        inputs:    resolvePaths(ctx, [HagaKeyword.CURRENT_INPUT_DIR],  inputs),
        outputs:   resolvePaths(ctx, [HagaKeyword.CURRENT_OUTPUT_DIR], outputs),
        implicits: resolvePaths(ctx, [HagaKeyword.CURRENT_INPUT_DIR],  implicits),
        rule: "regen",
        restat: true,
    };
}

function eatSugar(sweetExport: HagaSweetExport): HagaCoreExport {
    const ctx: HagaContext = HagaContext.getNonNullableGlobalContext();
    addRules(ctx, sweetExport);
    return {
        rules: Array.from(ctx.ruleMap.values()),
        targets: sweetExport.targets.map((target) => {
            switch (target.type) {
                case 'copy':
                    return eatTargetCopy(ctx, target);
                case 'cpp':
                    return eatTargetCPP(ctx, target);
                case 'minify-html':
                    return eatTargetMinifyHtml(ctx, target);
                case 'regen':
                    return eatTargetRegen(ctx, target);
                case undefined:
                    return target satisfies HagaCoreTarget;
                default:
                    return target satisfies never;
            }
        }).flat(),
    };
}

//------------------------------------------------------------------------------
// Exports:
//------------------------------------------------------------------------------
export type {
    HagaSweetCommandArgs,
    HagaSweetExport,
    HagaSweetRule,
    HagaSweetString,
    HagaSweetStringComposition,
    HagaSweetTarget,
    HagaSweetTargetCPP,
};

export const HagaSweet = {
    eatSugar,
};
