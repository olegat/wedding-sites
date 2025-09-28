export type HagaCoreCommandArgs = string[];

export type HagaCoreTarget = {
    type?: never;
    inputs: string[];
    outputs: string[];
    commands: HagaCoreCommandArgs[];
};

export type HagaCoreExport = {
    targets: HagaCoreTarget[];
};
