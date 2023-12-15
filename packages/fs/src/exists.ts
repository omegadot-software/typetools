import { access } from "node:fs/promises";

import { normalizePath, PathArg } from "./private/normalizePath";

export async function exists(path: PathArg) {
	try {
		await access(normalizePath(path));
		return true;
	} catch (e) {
		return false;
	}
}
