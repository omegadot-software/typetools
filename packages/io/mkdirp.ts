import { mkdirp as _mkdirp } from "fs-extra";
import { resolve } from "path";

export function mkdirp(...pathSegments: string[]) {
	return _mkdirp(resolve(...pathSegments));
}
