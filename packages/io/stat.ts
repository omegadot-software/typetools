import { stat as statCb } from "fs";
import { promisify } from "util";
import { resolve } from "path";

const _stat = promisify(statCb);

export function stat(...pathSegments: string[]) {
	return _stat(resolve(...pathSegments));
}
