import { mkdirTmp } from "@omegadot/fs";
import {
	FileNotFoundError,
	FileSystemStorageEngine,
	StorageEngine,
} from "@omegadot/storage-engine";

import { TabularData } from "../TabularData";

describe("TabularData", () => {
	async function setupWithNewFile() {
		const filename = "new-file";
		const tmpDir = await mkdirTmp();
		const sto: StorageEngine = new FileSystemStorageEngine(tmpDir);

		return {
			tmpDir,
			filename,
			sto,
			get writable() {
				return TabularData.createWriteStream(sto, filename);
			},
		};
	}

	test("empty file has row count of zero", async () => {
		const filename = "new-file";
		const sto: StorageEngine = new FileSystemStorageEngine(await mkdirTmp());

		const td = await TabularData.open(sto, filename, 1);

		expect(td.numRows()).toBe(0);
	});

	test("file size is correct", async () => {
		const { writable, sto, filename } = await setupWithNewFile();

		writable.write([1, 2, 3]);
		writable.write([1, 2, 3]);
		writable.end([1, 2, 3]);

		await writable.promise();

		expect(await sto.size(filename)).toBe(9 * Float64Array.BYTES_PER_ELEMENT);
	});

	test("append rows and read individual rows", async () => {
		const { writable, sto, filename } = await setupWithNewFile();

		writable.write([1, 2, 3]);
		writable.write([4, 5, 6]);
		writable.end();

		await writable.promise();

		const td = await TabularData.open(sto, filename, 3);

		const row0 = await td.row(0);
		expect(row0).toEqual([1, 2, 3]);

		const row1 = await td.row(1);
		expect(row1).toEqual([4, 5, 6]);
	});

	test("append rows and iterate", async () => {
		const { writable, sto, filename } = await setupWithNewFile();

		writable.write([1, 2, 3]);
		writable.write([4, 5, 6]);
		writable.end();

		await writable.promise();

		const td = TabularData.createReadStream(sto, filename, 3);

		const rows = [];
		for await (const row of td) rows.push(row);

		expect(rows[0]).toEqual([1, 2, 3]);
		expect(rows[1]).toEqual([4, 5, 6]);
	});

	// This test serves to assert that the code handles data that
	// comes in several chunks correctly.
	test("append rows - small streamed chunks", async () => {
		const { writable, sto, filename } = await setupWithNewFile();

		const rows = [];
		for (let i = 1; i <= 24; i++) {
			const row = [i, i * 2, i * 3];
			rows.push(row);
			writable.write(row);
		}
		expect.assertions(rows.length);

		writable.end();

		// eslint-disable-next-line @typescript-eslint/unbound-method
		const createReadStream = sto.createReadStream;

		sto.createReadStream = (path, options) => {
			return createReadStream.call(sto, path, {
				...options,
				// Purposely taking a non-multiple of 8
				highWaterMark: 12,
			});
		};

		await writable.promise();

		const streamedRows = await TabularData.createReadStream(
			sto,
			filename,
			3
		).collect();

		// Comparing stringified rows individually gives better error messages
		for (let i = 0; i < rows.length; i++) {
			expect(streamedRows[i].join(", ")).toEqual(rows[i].join(", "));
		}
	});

	test("iterate empty file", async () => {
		const { writable, sto, filename } = await setupWithNewFile();

		// Create empty file
		writable.end();
		await writable.promise();

		const fn = jest.fn();

		const td = await TabularData.open(sto, filename, 3);

		for await (const row of td) fn(row);

		expect(fn).not.toHaveBeenCalled();
	});

	test("iterate non-existing file", async () => {
		expect.assertions(2);

		const { sto } = await setupWithNewFile();

		const fn = jest.fn();

		const readable = TabularData.createReadStream(sto, "does-not-exist", 3);

		try {
			await (async () => {
				for await (const row of readable) fn(row);
			})();
		} catch (e) {
			expect(e).toBeInstanceOf(FileNotFoundError);
		}

		expect(fn).not.toHaveBeenCalled();
	});

	// test.only("aborting iteration closes underlying file descriptor", async () => {
	// 	const { writable, sto, tmpDir, filename } = await setupWithNewFile();
	//
	// 	const path = tmpDir + "/" + filename;
	//
	// 	async function openFiles() {
	// 		const [results] = await lsof();
	//
	// 		return results.files.filter((file) => file.name?.endsWith(path)).length;
	// 	}
	//
	// 	expect(await openFiles()).toBe(1);
	//
	// 	writable.write([1, 2, 3]);
	// 	writable.write([4, 5, 6]);
	// 	writable.write([7, 8, 9]);
	// 	writable.end();
	// 	await writable.promise();
	//
	// 	await sto.rename(filename, "test");
	//
	// 	expect(await openFiles()).toBe(0);
	//
	// 	const td = TabularData.createReadStream(sto, "test", 3);
	// 	expect(await openFiles()).toBe(1);
	// 	// const td = await TabularData.open(sto, filename, 3);
	// 	for await (const row of td) {
	// 		// expect(await openFiles()).toBe(1);
	// 		// console.log(results.files.filter((file) => file.name?.endsWith("test")));
	// 		// expect(await openFiles()).toBe(1);
	// 	}
	//
	// 	expect(await openFiles()).toBe(0);
	// });

	describe("errors", () => {
		test("destroys stream when calling `write()` with incorrect row when no callback is provided", async () => {
			const { writable } = await setupWithNewFile();

			const p = writable.promise();

			// First call defines number of columns
			writable.write([1, 2, 3]);
			// Add a row with 1 value instead of 3
			writable.write([1]);
			await expect(p).rejects.toThrowError(/columns/);
		});
	});
});
