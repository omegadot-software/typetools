import { readFileSync } from "fs";
import { resolve } from "path";

export function readUTF8FileSync(...paths: string[]): string {
	return readFileSync(resolve(...paths), "utf8");
}
