/* tslint:disable */
/* eslint-disable */

/**
 * Bloom filter aligned with `topics/BLOOM_FILTERS/bloom_filter.rs` (double hashing, optimal m/k).
 */
export class BloomFilter {
    free(): void;
    [Symbol.dispose](): void;
    add(item: string): void;
    check(item: string): boolean;
    constructor(items_count: number, fp_prob: number);
    readonly hash_count: number;
    readonly size: number;
}

/**
 * Same word lists and flow as `bloom_filter.rs` `main()`.
 */
export function run_reference_demo(): string;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_bloomfilter_free: (a: number, b: number) => void;
    readonly bloomfilter_add: (a: number, b: number, c: number) => void;
    readonly bloomfilter_check: (a: number, b: number, c: number) => number;
    readonly bloomfilter_hash_count: (a: number) => number;
    readonly bloomfilter_new: (a: number, b: number) => number;
    readonly bloomfilter_size: (a: number) => number;
    readonly run_reference_demo: () => [number, number];
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
