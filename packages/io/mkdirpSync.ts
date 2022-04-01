import { mkdirpSync as _mkdirpSync } from "fs-extra";
import { resolve } from "path";

export function mkdirpSync(...pathSegments: string[]) {
	return _mkdirpSync(resolve(...pathSegments));
}
