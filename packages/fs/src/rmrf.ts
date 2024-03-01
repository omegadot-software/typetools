import { rm } from "node:fs/promises";

import { normalizePath, PathArg } from "./private/normalizePath";

export function rmrf(path: PathArg) {
	return rm(normalizePath(path), { force: true, recursive: true });
}
