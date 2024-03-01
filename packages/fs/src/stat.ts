import { stat as statFs } from "node:fs/promises";

import { normalizePath, PathArg } from "./private/normalizePath";

export function stat(path: PathArg) {
	return statFs(normalizePath(path));
}
