import { createWriteStream } from "fs";
import { join } from "path";

import { mkdirTmp } from "@omegadot/fs";
import { Minipass } from "minipass";

import { createWritable } from "../createWritable";

describe("createWritable", () => {
	test("wraps node writable stream in Minipass instance", async () => {
		const tmpDir = await mkdirTmp();
		const stream = createWriteStream(join(tmpDir, "does-not-exist"));
		const writable = createWritable(stream);

		expect(writable).toBeInstanceOf(Minipass);
	});
});
