import { mkdirTmp } from "@omegadot/fs";
import { storageEngineTestSuite } from "@omegadot/storage-engine";

import { FileSystemStorageEngine } from "../FileSystemStorageEngine";

describe("FileSystemStorageEngine", () => {
	storageEngineTestSuite(
		"FileSystemStorageEngine",
		async () => new FileSystemStorageEngine(await mkdirTmp())
	);

	test("#createReadStream() - highWaterMark option controls chunk size", async () => {
		const sto = new FileSystemStorageEngine(await mkdirTmp());
		await sto.write("abc.txt", Buffer.from("abcdefghijklmnopqrstuvwxyz"));
		const stream = sto.createReadStream("abc.txt", { highWaterMark: 8 });

		const lengths = [];
		for await (const chunk of stream) {
			lengths.push(chunk.byteLength);
		}

		expect(lengths).toEqual([8, 8, 8, 2]);
	});
});
