import {
    basename,
    dirname,
} from 'node:path';

import type {
    HagaCoreCommandArgs,
    HagaCoreExport,
    HagaCoreRule,
    HagaCoreTarget,
} from "./hagaCore";

import {
    HagaKeywords,
    type HagaKeyword,
} from "./hagaKeyword";

import {
    HagaContext,
} from "./hagaContext";


//------------------------------------------------------------------------------
// Types:
//------------------------------------------------------------------------------
export type HagaSweetStringComposition = (string | HagaKeyword)[];

export type HagaSweetString = string | HagaSweetStringComposition;

export type HagaSweetCommandArgs = HagaSweetString[];

export type HagaSweetRule = {
    name: HagaSweetString;
    commands: HagaSweetCommandArgs[];
    description?: HagaSweetString;
};

export type HagaSweetTargetCPP = {
    type: 'cpp';
    input: HagaSweetString;
    output?: HagaSweetString;
};

export type HagaSweetTarget = HagaSweetTargetCPP | HagaCoreTarget;

export type HagaSweetExport = {
    rules?: HagaCoreRule[],
    targets: HagaSweetTarget[];
};

//------------------------------------------------------------------------------
// Implementation:
//------------------------------------------------------------------------------
const SweetRules: { [K in NonNullable<HagaSweetTarget['type']>]: HagaSweetRule } = {
    'cpp': {
        name: 'cpp',
        commands: [ [ [HagaKeywords.CPP_COMMAND], '-P', '$in', '>', '$out' ] ],
    }
};

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

function toAbsolutePath(ctx: HagaContext, url: string, baseKeyword: HagaKeyword): string {
    const basepath: string = ctx.eatKeywork(baseKeyword);
    return URL.parse(url, `file://${basepath}`)?.pathname ?? 'NOTFOUND';
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
    const output     : string = eatString(ctx, sweetTarget.output ?? `${dirname(input)}/${basename(input, '.in')}`);
    const absInput   : string = toAbsolutePath(ctx, input,  HagaKeywords.INPUT_DIR);
    const absOutput  : string = toAbsolutePath(ctx, output, HagaKeywords.OUTPUT_DIR);
    return {
        inputs: [ absInput ],
        outputs: [ absOutput ],
        rule: 'cpp',
    };
}

export const HagaMacros = {
    eatSugar(sweetExport: HagaSweetExport): HagaCoreExport {
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
};
