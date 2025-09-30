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
};

type HagaSweetTarget = HagaSweetTargetCPP | HagaCoreTarget;

type HagaSweetExport = {
    rules?: HagaCoreRule[],
    targets: HagaSweetTarget[];
};

//------------------------------------------------------------------------------
// Constants:
//------------------------------------------------------------------------------
const SweetRules: { [K in NonNullable<HagaSweetTarget['type']>]: HagaSweetRule } = {
    'cpp': {
        name: 'cpp',
        commands: [ [ [HagaKeyword.CPP_COMMAND], '-P', '$in', '>', '$out' ] ],
    }
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
            case 'cpp':
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

function eatTargetCPP(ctx: HagaContext, sweetTarget: HagaSweetTargetCPP): HagaCoreTarget {
    const input      : string = eatString(ctx, sweetTarget.input)
    const output     : string = eatString(ctx, sweetTarget.output ?? dropExtension(input, '.in'));
    const absInput   : string = toAbsolutePath(ctx, input,  HagaKeyword.CURRENT_INPUT_DIR);
    const absOutput  : string = toAbsolutePath(ctx, output, HagaKeyword.CURRENT_OUTPUT_DIR);
    return {
        inputs: [ absInput ],
        outputs: [ absOutput ],
        rule: 'cpp',
    };
}

function eatSugar(sweetExport: HagaSweetExport): HagaCoreExport {
    const ctx: HagaContext = HagaContext.getNonNullableGlobalContext();
    addRules(ctx, sweetExport);
    return {
        rules: Array.from(ctx.ruleMap.values()),
        targets: sweetExport.targets.map((target) => {
            switch (target.type) {
                case 'cpp':
                    return eatTargetCPP(ctx, target);
                case undefined:
                    return target satisfies HagaCoreTarget;
                default:
                    return target satisfies never;
            }
        }),
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
