import type { HagaCoreRule } from "./hagaCore";
import type { HagaKeyword } from "./hagaKeyword";

//------------------------------------------------------------------------------
// Types:
//------------------------------------------------------------------------------
type HagaContext = {
    readonly ruleMap: Map<string, HagaCoreRule>;
    eatKeywork(sym: HagaKeyword): string;
    reportError(err: Error): void;
};

//------------------------------------------------------------------------------
// Implementation:
//------------------------------------------------------------------------------
function setGlobalContext(ctx: HagaContext | undefined): void {
    (globalThis as any).hagaContext = ctx;
}

function getGlobalContext(): HagaContext | undefined {
    return (globalThis as any).hagaContext;
}

function getNonNullableGlobalContext(): HagaContext {
    const ctx = getGlobalContext();
    if (ctx == null) {
        throw new Error(`[HAGA ERROR] getGlobalContext returned ${ctx}`);
    }
    return ctx;
}


//------------------------------------------------------------------------------
// Exports:
//------------------------------------------------------------------------------
const HagaContext = {
    getGlobalContext,
    getNonNullableGlobalContext,
    setGlobalContext,
};

export {
    HagaContext
};
