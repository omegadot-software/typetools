import { mkdir as _mkdir } from "fs-extra";
import { resolve } from "path";

export function mkdir(...pathSegments: string[]) {
	return _mkdir(resolve(...pathSegments));
}
