import { dirname, basename } from 'node:path';

import { HagaCoreExport, HagaCoreTarget } from "./hagaCore";
import { type HagaKeyword, HagaKeywords } from "./hagaKeyword";

export type HagaSweetStringComposition = (string | HagaKeyword)[];

export type HagaSweetString = string | HagaSweetStringComposition;

export type HagaSweetCommandArgs = HagaSweetString[];

export type HagaSweetTargetCommands = {
    type: 'commands';
    inputs: HagaSweetString[];
    outputs: HagaSweetString[];
    commands: HagaSweetCommandArgs[];
};

export type HagaSweetTargetCPP = {
    type: 'cpp';
    input: string;
    output?: string;
};

export type HagaSweetTarget =
    HagaSweetTargetCommands |
    HagaSweetTargetCPP |
    HagaCoreTarget;

export type HagaSweetExport = {
    targets: HagaSweetTarget[];
};

export type HagaContext = {
    eatKeywork(sym: HagaKeyword): string;
};

export const HagaMacros = {
    eatSugar(sweetExport: HagaSweetExport): HagaCoreExport {
        const ctx: HagaContext = (window as any).ctx;
        return {
            targets: sweetExport.targets.map((target) => {
                switch (target.type) {
                    case 'commands':
                        return eatTargetCommand(ctx, target);
                    case 'cpp':
                        return eatTargetCPP(ctx, target);
                    default:
                        return target;
                }
            }),
        };
    }
};

function toAbsolutePath(ctx: HagaContext, url: string, baseKeyword: HagaKeyword): string {
    const basepath: string = ctx.eatKeywork(baseKeyword);
    return URL.parse(url, `file://${basepath}`)?.pathname ?? 'NOTFOUND';
}

function eatString(ctx: HagaContext, sweetString: HagaSweetString): string {
    if (typeof sweetString === 'string') {
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

function eatTargetCommand(ctx: HagaContext, sweetTarget: HagaSweetTargetCommands): HagaCoreTarget {
    const coreTarget: HagaCoreTarget = {
        inputs   : sweetTarget.inputs.map((i) => eatString(ctx, i)),
        outputs  : sweetTarget.outputs.map((o) => eatString(ctx, o)),
        commands : sweetTarget.commands.map((args) => args.map((a) => eatString(ctx, a))),
    }
    return coreTarget;
}

function eatTargetCPP(ctx: HagaContext, sweetTarget: HagaSweetTargetCPP): HagaCoreTarget {
    const input      : string = sweetTarget.input;
    const output     : string = sweetTarget.output ?? `${dirname(input)}/${basename(input, '.in')}`;
    const absInput   : string = toAbsolutePath(ctx, input,  HagaKeywords.INPUT_DIR);
    const absOutput  : string = toAbsolutePath(ctx, output, HagaKeywords.OUTPUT_DIR);
    const cppCommand : string = ctx.eatKeywork(HagaKeywords.CPP_COMMAND);
    return {
        inputs: [ absInput ],
        outputs: [ absOutput ],
        commands: [ [cppCommand, '-P', absInput, '>', absOutput ] ],
    };
}
