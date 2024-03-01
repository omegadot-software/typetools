import { resolve } from "node:path";

export type PathArg = string | string[];

export function normalizePath(arg: PathArg): string {
	if (typeof arg === "string") return arg;
	return resolve(...arg);
}
