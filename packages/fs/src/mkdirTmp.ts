import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export function mkdirTmp(prefix = "") {
	return mkdtemp(join(tmpdir(), "/", prefix));
}
