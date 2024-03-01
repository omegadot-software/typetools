import { readdir as readdirFs } from "node:fs/promises";

import { normalizePath, PathArg } from "./private/normalizePath";

export function readdir(path: PathArg) {
	return readdirFs(normalizePath(path));
}
