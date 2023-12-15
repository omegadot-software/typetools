import { mkdir } from "node:fs/promises";

import { normalizePath, PathArg } from "./private/normalizePath";

export async function mkdirp(path: PathArg) {
	return mkdir(normalizePath(path), { recursive: true });
}
