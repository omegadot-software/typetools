import { readFile } from "fs/promises";

import { normalizePath, PathArg } from "./private/normalizePath";

export function readUTF8File(path: PathArg): Promise<string> {
	return readFile(normalizePath(path), { encoding: "utf8" });
}
