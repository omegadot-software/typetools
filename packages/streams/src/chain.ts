import { pipeline } from "stream/promises";

import { Readable } from "./createReadable";
import { Writable } from "./createWritable";

/**
 * Simple wrapper around node:stream/promises' `pipeline` function that accepts our custom stream types.
 */
export function chain<TIn>(
	head: Readable<TIn>,
	tail: Writable<TIn>
): Promise<void>;
export function chain(...args: unknown[]): Promise<void> {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-return,@typescript-eslint/no-unsafe-call,@typescript-eslint/no-explicit-any
	return (pipeline as any)(...args);
}
