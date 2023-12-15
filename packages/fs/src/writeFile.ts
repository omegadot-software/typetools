import { writeFile as writeFileFs } from "node:fs/promises";

import { normalizePath, PathArg } from "./private/normalizePath";

export function writeFile(path: PathArg, data: string | Buffer) {
	return writeFileFs(normalizePath(path), data);
}
