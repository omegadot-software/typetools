import { readFile as readFileFs } from "node:fs/promises";

import { normalizePath, PathArg } from "./private/normalizePath";

export function readFile(path: PathArg): Promise<Buffer> {
	return readFileFs(normalizePath(path));
}
