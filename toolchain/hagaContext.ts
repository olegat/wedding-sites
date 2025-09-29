import type { HagaCoreRule } from "./hagaCore";
import type { HagaKeyword } from "./hagaKeyword";

export type HagaContext = {
    readonly ruleMap: Map<string, HagaCoreRule>;
    eatKeywork(sym: HagaKeyword): string;
    reportError(err: Error): void;
};

export const HagaContext = {
    setGlobalContext(ctx: HagaContext | undefined): void {
        (globalThis as any).hagaContext = ctx;
    },

    getGlobalContext(): HagaContext | undefined {
        return (globalThis as any).hagaContext;
    },

    getNonNullableGlobalContext(): HagaContext {
        const ctx = this.getGlobalContext();
        if (ctx == null) {
            throw new Error(`[HAGA ERROR] getGlobalContext returned ${ctx}`);
        }
        return ctx;
    },
}
