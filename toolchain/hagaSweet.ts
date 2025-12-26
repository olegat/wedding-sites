import fs from 'node:fs';
import path from 'node:path';
import rsync from './rsync';

import type {
    RsyncConfig,
    RsyncErrorCode
} from './rsync';

import type {
    HagaCoreCommandArgs,
    HagaCoreExport,
    HagaCoreRule,
    HagaCoreTarget,
    HagaCoreVars,
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

type HagaSweetRsyncConfig = {
    dstDir: HagaSweetString;
};

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

type HagaSweetTargetCPPs = {
    type: 'cpps';
    inputs: HagaSweetString[];
    inputDir?: HagaSweetString;
    outputDir?: HagaSweetString;
};

type HagaSweetTargetCopy = {
    type: 'copy';
    inputs: HagaSweetString[];
    inputDir?: HagaSweetString;
    outputDir?: HagaSweetString;
};

type HagaSweetTargetMagick = {
    type: 'magick';
    input: HagaSweetString;
    output: HagaSweetString;
    args: HagaSweetCommandArgs;
};

type HagaSweetTargetMinify = {
    type: 'minify';
    inputs: HagaSweetString[];
    inputDir?: HagaSweetString;
    outputDir?: HagaSweetString;
};

type HagaSweetTargetRegen = {
    type: "regen";
    inputs?: HagaSweetString[]; // default [[HagaKeyword.HAGA_INPUT_HAGAFILE]]
    implicits?: HagaSweetString[]; // default ['./haga', 'toolchain/**.ts']
    outputs?: HagaSweetString[]; // default ["build.ninja"]
};

type HagaSweetTargetRsync = {
    type: "rsync";
    name: string;
    inputs: string[];
    srcDir: HagaSweetString;
    config: HagaSweetString;
    configTemplate: HagaSweetRsyncConfig;
};

type HagaSweetTargetZip = {
    type: 'zip';
    inputs: HagaSweetString[];
    inputDir?: HagaSweetString;
    output: HagaSweetString;
};

type HagaSweetTarget =
    HagaSweetTargetCopy |
    HagaSweetTargetCPP |
    HagaSweetTargetCPPs |
    HagaSweetTargetMagick |
    HagaSweetTargetMinify |
    HagaSweetTargetRegen |
    HagaSweetTargetRsync |
    HagaSweetTargetZip |
    HagaCoreTarget;

type HagaSweetExport = {
    rules?: HagaCoreRule[],
    targets: HagaSweetTarget[];
};

//------------------------------------------------------------------------------
// Constants:
//------------------------------------------------------------------------------
const MinifyAny: HagaSweetString = [HagaKeyword.INPUT_DIR, '/toolchain/minify-any.sh'];
const ZipAbs: HagaSweetString = [HagaKeyword.INPUT_DIR, '/toolchain/zip-abs.sh'];

const CPPRule: HagaSweetRule = {
    name: 'cpp',
    commands: [
        [ [HagaKeyword.CLANG_COMMAND],
          '-x', 'c', '$in', '-E', '-P', '-MMD', '-MF', '$depfile', '-MT', '$outfile', '-o', '$outfile' ],
    ],
    description: 'CPP $in',
};
const SweetRules: { [K in NonNullable<HagaSweetTarget['type']>]: HagaSweetRule } = {
    'copy': {
        name: 'copy',
        commands: [
            [ [HagaKeyword.COPY_COMMAND], '$in', '$out' ],
        ],
        description: 'Copying $in',
    },
    'cpp': CPPRule,
    'cpps': CPPRule,
    'magick': {
        name: 'magick',
        commands: [
            [ [HagaKeyword.MAGICK_COMMAND], '$in', '$args', '$out' ],
        ],
        description: 'Magicking $out',
    },
    'minify': {
        name: 'minify',
        commands: [
            [ [HagaKeyword.BASH_COMMAND], MinifyAny, '$in', '$out', ],
        ],
        description: 'Minifying $in',
    },
    'regen': {
        name: 'regen',
        commands: [
            [ 'cd', [HagaKeyword.INPUT_DIR] ],
            [ [HagaKeyword.HAGA_COMMAND], 'genin', '$in', '>', '$out'],
        ],
        description: 'Regenerate build.ninja',
    },
    'rsync': {
        name: 'rsync',
        commands: [
            [ [HagaKeyword.HAGA_COMMAND], 'rsync', '$srcDir', '$dstDir', '$inputs'],
            [ [HagaKeyword.TOUCH_COMMAND], '$out' ],
        ],
        description: 'Deploying',
    },
    'zip': {
        name: 'zip',
        commands: [
            [ [HagaKeyword.BASH_COMMAND], ZipAbs, '$out', '$indir', '$in', ],
        ],
        description: 'Zipping $out',
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
            case 'cpps':
            case 'magick':
            case 'minify':
            case 'regen':
            case 'rsync':
            case 'zip':
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

function eatArgs(ctx: HagaContext, sweetArgs: HagaSweetCommandArgs): string {
    return sweetArgs.map((arg) => {
        const s = eatString(ctx, arg).replaceAll('\"', '\\\"');
        return `"${s}"`;
    }).join(' ');
}

function eatRsyncConfig(ctx: HagaContext, sweetConfig: HagaSweetRsyncConfig): RsyncConfig {
    return {
        dstDir: eatString(ctx, sweetConfig.dstDir),
    };
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

function appendExtension<E extends `.${string}`>(ctx: HagaContext, sweetPath: HagaSweetString, ext: E): `${string}${E}` {
    const corePath = eatString(ctx, sweetPath);
    const base = path.basename(corePath);
    const dir  = path.dirname(corePath);
    return path.resolve(dir, `${base}${ext}`) as `${string}${E}`;
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

type InputsAndOutdir = {
    inputs: HagaSweetString[],
    outputDir?: HagaSweetString,
    inputDir?: HagaSweetString
};
type Rule = keyof typeof SweetRules;
function eatTargetInputsWithRule(ctx: HagaContext, sweetTarget: InputsAndOutdir, rule: Rule): HagaCoreTarget[] {
    const outDir : string = resolvePath(ctx, [HagaKeyword.CURRENT_OUTPUT_DIR], sweetTarget.outputDir ?? '');
    const inDir  : string = resolvePath(ctx, [HagaKeyword.CURRENT_INPUT_DIR],  sweetTarget.inputDir ?? '');
    return sweetTarget.inputs.map(sweetInput => {
        const name  : string = eatString(ctx, sweetInput)
        const absInput  : string = resolvePath(ctx, inDir,  name);
        const absOutput : string = resolvePath(ctx, outDir, name);
        return {
            inputs:  [ absInput  ],
            outputs: [ absOutput ],
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
    const vars = {
        outfile: `${absOutput}`,
        depfile: `${absOutput}.d`,
    } as const satisfies HagaCoreVars;
    return {
        inputs: [ absInput ],
        outputs: [ vars.outfile, vars.depfile ],
        implicits,
        rule: 'cpp',
        vars,
    };
}

function eatTargetCPPs(ctx: HagaContext, sweetTarget: HagaSweetTargetCPPs): HagaCoreTarget[] {
    const result: HagaCoreTarget[] = [];
    const inputDir  = sweetTarget.inputDir  ?? [HagaKeyword.CURRENT_INPUT_DIR];
    const outputDir = sweetTarget.outputDir ?? [HagaKeyword.CURRENT_OUTPUT_DIR];
    for (const baseInput of sweetTarget.inputs) {
        const baseName : string = dropExtension(eatString(ctx, baseInput), '.in');
        const input    : string = resolvePath(ctx, inputDir,  baseInput);
        const output   : string = resolvePath(ctx, outputDir, baseName);
        result.push(eatTargetCPP(ctx, { type: 'cpp', input, output }));
    }
    return result;
}

function eatTargetMagick(ctx: HagaContext, sweetTarget: HagaSweetTargetMagick): HagaCoreTarget {
    const input  : string = resolvePath(ctx, [HagaKeyword.CURRENT_INPUT_DIR],  sweetTarget.input);
    const output : string = resolvePath(ctx, [HagaKeyword.CURRENT_OUTPUT_DIR], sweetTarget.output);
    const args   : string = eatArgs(ctx, sweetTarget.args);
    return {
        rule: "magick",
        inputs: [input],
        outputs: [output],
        vars: { args },
    };
}

function eatTargetMinify(ctx: HagaContext, sweetTarget: HagaSweetTargetMinify): HagaCoreTarget[] {
    const result = eatTargetInputsWithRule(ctx, sweetTarget, 'minify');
    const minifyAnyJs = eatString(ctx, MinifyAny);
    for (const targ of result) {
        targ.implicits ??= [];
        targ.implicits.push(minifyAnyJs);
    }
    return result;
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
        vars: { generator: '1', restat: '1' },
    };
}

function eatTargetRsync(ctx: HagaContext, sweetTarget: HagaSweetTargetRsync): HagaCoreTarget[] {
    const configPath = resolvePath(ctx, [HagaKeyword.CURRENT_INPUT_DIR], sweetTarget.config);
    const dstDir: string | void = (() => {
        // Initialise (write) config from template:
        if ( ! fs.existsSync(configPath) ) {
            const config: RsyncConfig = eatRsyncConfig(ctx, sweetTarget.configTemplate);
            const writeStatus: RsyncErrorCode = rsync.writeConfig(configPath, config);
            if (writeStatus !== rsync.RsyncErrorCode.SUCCESS) {
                return ctx.reportError(new Error(`cannot write template ${configPath} (error-code: ${writeStatus})`));
            } else {
                return config.dstDir;
            }
        }
        // Read existing config file:
        else {
            const readStatus = rsync.readConfig(configPath);
            let result = readStatus.config?.dstDir;
            if (readStatus.errorCode !== rsync.RsyncErrorCode.SUCCESS) {
                ctx.reportError(new Error(`cannot read ${configPath} (error-code: ${readStatus.errorCode})`));
                result = undefined;
            }
            for (const i of sweetTarget.inputs) {
                if (i.includes(' ') || i.includes(`\n`)) {
                    ctx.reportWarning(new Error(`spaces and EOL in rsync input '${i}' is unsupported`));
                    result = undefined;
                }
            }
            return result;
        }
    })();
    if (dstDir == undefined) return [];

    const srcDir: string = resolvePath(ctx, [HagaKeyword.CURRENT_OUTPUT_DIR], sweetTarget.srcDir);
    const rsyncOutput = [appendExtension(ctx, srcDir, '.timestamp')];
    return [
        {
            rule: "rsync",
            inputs: resolvePaths(ctx, srcDir, sweetTarget.inputs),
            outputs: rsyncOutput,
            regenImplicits: [configPath],
            vars: {
                srcDir,
                dstDir,
                inputs: sweetTarget.inputs.join(' '),
            },
            all: false,
        },
        {
            rule: "phony",
            inputs: rsyncOutput,
            outputs: [sweetTarget.name],
            all: false,
        },
    ];
}

function eatTargetZip(ctx: HagaContext, sweetTarget: HagaSweetTargetZip): HagaCoreTarget {
    const indir = eatString(ctx, sweetTarget.inputDir ?? [HagaKeyword.CURRENT_INPUT_DIR]);
    return {
        inputs:  resolvePaths(ctx, indir, sweetTarget.inputs),
        outputs: resolvePaths(ctx, [HagaKeyword.CURRENT_OUTPUT_DIR], [sweetTarget.output]),
        rule: "zip",
        implicits:  [ eatString(ctx, ZipAbs) ],
        vars: { indir },
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
                case 'cpps':
                    return eatTargetCPPs(ctx, target);
                case 'magick':
                    return eatTargetMagick(ctx, target);
                case 'minify':
                    return eatTargetMinify(ctx, target);
                case 'regen':
                    return eatTargetRegen(ctx, target);
                case 'rsync':
                    return eatTargetRsync(ctx, target);
                case 'zip':
                    return eatTargetZip(ctx, target);
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
    HagaSweetTargetRegen,
};

export const HagaSweet = {
    eatSugar,
};
