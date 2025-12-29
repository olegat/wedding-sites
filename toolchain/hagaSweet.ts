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
    implicits?: HagaSweetString[];
    description?: HagaSweetString;
    generator?: boolean;
    restat?: boolean;
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

type HagaSweetTargetRsvgConvert = {
    type: 'rsvg-convert';
    input: HagaSweetString;
    output: HagaSweetString;
    args: HagaSweetCommandArgs;
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

type HagaSweetTarget = TargetMap[TargetType] | HagaCoreTarget;

type HagaSweetExport = {
    rules?: HagaCoreRule[],
    targets: HagaSweetTarget[];
};

type TargetMap = {
    'copy': HagaSweetTargetCopy;
    'cpp': HagaSweetTargetCPP;
    'cpps': HagaSweetTargetCPPs;
    'magick': HagaSweetTargetMagick;
    'minify': HagaSweetTargetMinify;
    'regen': HagaSweetTargetRegen;
    'rsvg-convert': HagaSweetTargetRsvgConvert;
    'rsync': HagaSweetTargetRsync;
    'zip': HagaSweetTargetZip;
};

type TargetType = keyof TargetMap;

type TargetSpecEntry<T extends TargetType> = {
    getRules(): readonly Readonly<HagaSweetRule>[];
    eatTarget(ctx: HagaContext, sweetTarget: TargetMap[T]): HagaCoreTarget | HagaCoreTarget[];
}

type TargetSpec = {
    [K in TargetType]: TargetSpecEntry<K>;
};


//------------------------------------------------------------------------------
// Util
//------------------------------------------------------------------------------
function rulesGetter(...input: readonly Readonly<HagaSweetRule>[]): () => typeof input {
    return () => input;
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

type InputsAndOutdir = {
    inputs: HagaSweetString[],
    outputDir?: HagaSweetString,
    inputDir?: HagaSweetString
};
function eatTargetInputsWithRule(ctx: HagaContext, sweetTarget: InputsAndOutdir, rule: string /* TODO change to HagaSweetRule */): HagaCoreTarget[] {
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

type InputOutputArgs = {
    input:  HagaSweetString;
    output: HagaSweetString;
    args: HagaSweetCommandArgs;
};
function eatTargetWithArgs(ctx: HagaContext, sweetTarget: InputOutputArgs, rule: string /* TODO change to HagaSweetRule */): HagaCoreTarget {
    const input  : string = resolvePath(ctx, [HagaKeyword.CURRENT_INPUT_DIR],  sweetTarget.input);
    const output : string = resolvePath(ctx, [HagaKeyword.CURRENT_OUTPUT_DIR], sweetTarget.output);
    const args   : string = eatArgs(ctx, sweetTarget.args);
    return {
        rule,
        inputs: [input],
        outputs: [output],
        vars: { args },
    };
}


//------------------------------------------------------------------------------
// Constants:
//------------------------------------------------------------------------------
const MinifyAny: HagaSweetString = [HagaKeyword.INPUT_DIR, '/toolchain/minify-any.sh'];
const ZipAbs: HagaSweetString = [HagaKeyword.INPUT_DIR, '/toolchain/zip-abs.sh'];

const SweetTargetSpec: TargetSpec = {
    'copy': {
        getRules: rulesGetter({
            name: 'copy',
            commands: [
                [ [HagaKeyword.COPY_COMMAND], '$in', '$out' ],
            ],
            description: 'CPP $in',
        }),
        eatTarget(ctx: HagaContext, sweetTarget: HagaSweetTargetCopy) {
            return eatTargetCopy(ctx, sweetTarget);
        },
    },

    'cpp': {
        getRules: rulesGetter({
            name: 'cpp',
            commands: [
                [ [HagaKeyword.CLANG_COMMAND],
                  '-x', 'c', '$in', '-E', '-P', '-MMD', '-MF', '$depfile', '-MT', '$outfile', '-o', '$outfile' ],
            ],
            description: 'CPP $in',
        }),
        eatTarget(ctx: HagaContext, sweetTarget: HagaSweetTargetCPP) {
            return eatTargetCPP(ctx, sweetTarget);
        },
    },

    'cpps': {
        getRules: () => SweetTargetSpec['cpp'].getRules(),
        eatTarget(ctx: HagaContext, sweetTarget: HagaSweetTargetCPPs) {
            return eatTargetCPPs(ctx, sweetTarget);
        },
    },

    'magick': {
        getRules: rulesGetter({
            name: 'magick',
            commands: [
                [ [HagaKeyword.MAGICK_COMMAND], '$in', '$args', '$out' ],
            ],
            description: 'Magicking $out',
        }),
        eatTarget(ctx: HagaContext, sweetTarget: HagaSweetTargetMagick) {
            return eatTargetMagick(ctx, sweetTarget);
        },
    },

    'minify': {
        getRules: rulesGetter({
            name: 'minify',
            commands: [
                [ [HagaKeyword.BASH_COMMAND], MinifyAny, '$in', '$out', ],
            ],
            description: 'Minifying $in',
        }),
        eatTarget(ctx: HagaContext, sweetTarget: HagaSweetTargetMinify) {
            return eatTargetMinify(ctx, sweetTarget);
        },
    },

    'regen': {
        getRules: rulesGetter({
            name: 'regen',
            commands: [
                [ [HagaKeyword.HAGA_COMMAND], 'genin', '$in', '$outdir/$out'],
            ],
            description: 'Regenerate build.ninja',
            generator: true,
            restat: true,
        }),
        eatTarget(ctx: HagaContext, sweetTarget: HagaSweetTargetRegen) {
            return eatTargetRegen(ctx, sweetTarget);
        },
    },

    'rsvg-convert': {
        getRules: rulesGetter({
            name: 'rsvg-convert',
            commands: [
                [ [HagaKeyword.RSVG_COMMAND], '$args', '$in', '-o', '$out' ],
            ],
            description: 'Rasterizing SVG $out',
        }),
        eatTarget(ctx: HagaContext, sweetTarget: HagaSweetTargetRsvgConvert) {
            return eatTargetRsvgConvert(ctx, sweetTarget);
        },
    },

    'rsync': {
        getRules: rulesGetter({
            name: 'rsync',
            commands: [
                [ [HagaKeyword.HAGA_COMMAND], 'rsync', '$srcDir', '$dstDir', '$inputs'],
                [ [HagaKeyword.TOUCH_COMMAND], '$out' ],
            ],
            description: 'Deploying',
        }),
        eatTarget(ctx: HagaContext, sweetTarget: HagaSweetTargetRsync) {
            return eatTargetRsync(ctx, sweetTarget);
        },
    },

    'zip': {
        getRules: rulesGetter( {
            name: 'zip',
            commands: [
                [ [HagaKeyword.BASH_COMMAND], ZipAbs, '$out', '$indir', '$in', ],
            ],
            description: 'Zipping $out',
        }),
        eatTarget(ctx: HagaContext, sweetTarget: HagaSweetTargetZip) {
            return eatTargetZip(ctx, sweetTarget);
        },
    },
}


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
        if (target.type === undefined) {
            target satisfies HagaCoreTarget; // skip
        } else {
            const targetSpec = SweetTargetSpec[target.type];
            addSpecRules(ctx, target.type, targetSpec);
        }
    }
}

function addSpecRules<T extends TargetType>(ctx: HagaContext, type: T, spec: TargetSpecEntry<T>) {
    for (const sweetRule of spec.getRules()) {
        if ( ! ctx.ruleMap.has(type)) {
            const coreRule  : HagaCoreRule = eatRule(ctx, sweetRule);
            ctx.ruleMap.set(type, coreRule);
        }
    }
}

function eatRule(ctx: HagaContext, sweetRule: HagaSweetRule): HagaCoreRule {
    const result: HagaCoreRule = {
        name: eatString(ctx, sweetRule.name),
        commands: eatCommands(ctx, sweetRule.commands),
        description: eatString(ctx, sweetRule.description),
    };
    if (sweetRule.generator !== undefined) {
        result.generator = sweetRule.generator;
    }
    if (sweetRule.restat !== undefined) {
        result.restat = sweetRule.restat;
    }
    return result;
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

function eatTargetRsvgConvert(ctx: HagaContext, sweetTarget: HagaSweetTargetRsvgConvert): HagaCoreTarget {
    return eatTargetWithArgs(ctx, sweetTarget, "rsvg-convert");
}

function eatTargetMagick(ctx: HagaContext, sweetTarget: HagaSweetTargetMagick): HagaCoreTarget {
    return eatTargetWithArgs(ctx, sweetTarget, "magick");
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
    const implicits = sweetTarget.implicits ?? resolvePaths(ctx, [HagaKeyword.INPUT_DIR], [
        'haga',
        'toolchain/hagaContext.ts',
        'toolchain/hagaKeyword.ts',
        'toolchain/hagaSweet.ts',
        'toolchain/hagaCLI.ts',
        'toolchain/hagaCore.ts',
    ]);
    return {
        inputs:    resolvePaths(ctx, [HagaKeyword.CURRENT_INPUT_DIR], inputs),
        implicits: resolvePaths(ctx, [HagaKeyword.CURRENT_INPUT_DIR], implicits),
        outputs: ['build.ninja'],
        rule: "regen",
        vars: { outdir: eatString(ctx, [HagaKeyword.OUTPUT_DIR]) },
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
            implicits: resolvePaths(ctx, [HagaKeyword.INPUT_DIR], ['toolchain/rsync.ts']),
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
                    return SweetTargetSpec['copy'].eatTarget(ctx, target);
                case 'cpp':
                    return SweetTargetSpec['cpp'].eatTarget(ctx, target);
                case 'cpps':
                    return SweetTargetSpec['cpps'].eatTarget(ctx, target);
                case 'rsvg-convert':
                    return SweetTargetSpec['rsvg-convert'].eatTarget(ctx, target);
                case 'magick':
                    return SweetTargetSpec['magick'].eatTarget(ctx, target);
                case 'minify':
                    return SweetTargetSpec['minify'].eatTarget(ctx, target);
                case 'regen':
                    return SweetTargetSpec['regen'].eatTarget(ctx, target);
                case 'rsync':
                    return SweetTargetSpec['rsync'].eatTarget(ctx, target);
                case 'zip':
                    return SweetTargetSpec['zip'].eatTarget(ctx, target);
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
    HagaSweetTargetRsvgConvert,
    HagaSweetTargetMagick,
};

export const HagaSweet = {
    eatSugar,
};
