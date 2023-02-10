import { Writable } from "stream";
import { finished } from "stream/promises";

import { mkdirTmp } from "@omegadot/fs";
import {
	FileSystemStorageEngine,
	StorageEngine,
} from "@omegadot/storage-engine";

import { TabularData } from "../TabularData";

describe("TabularData", () => {
	async function setupWithNewFile() {
		const filename = "new-file";
		const sto: StorageEngine = new FileSystemStorageEngine(await mkdirTmp());

		const td = await TabularData.open(sto, filename, 3);

		const stream = td.createWriteStream();

		return {
			filename,
			sto,
			td,
			stream,
		};
	}

	test("empty file has row count of zero", async () => {
		const filename = "new-file";
		const sto: StorageEngine = new FileSystemStorageEngine(await mkdirTmp());

		const td = await TabularData.open(sto, filename, 1);

		expect(td.numRows()).toBe(0);
	});

	test("adding data by calling write() updates number of rows", async () => {
		const { stream, td } = await setupWithNewFile();

		stream.write([1, 2, 3]);
		stream.end();
		expect(td.numRows()).toBe(1);

		await finished(stream as Writable);
	});

	test("adding data by calling end() updates number of rows", async () => {
		const { stream, td } = await setupWithNewFile();

		stream.end([1, 2, 3]);

		expect(td.numRows()).toBe(1);

		await finished(stream as Writable);
	});

	test("file size is correct", async () => {
		const { stream, sto, filename } = await setupWithNewFile();

		stream.end([1, 2, 3]);

		await finished(stream as Writable);

		expect(await sto.size(filename)).toBe(3 * Float64Array.BYTES_PER_ELEMENT);
	});

	test("append rows and read individual rows", async () => {
		const { stream, td } = await setupWithNewFile();

		stream.write([1, 2, 3]);
		stream.write([4, 5, 6]);
		stream.end();

		await finished(stream as Writable);

		const row0 = await td.row(0);
		expect(row0).toEqual([1, 2, 3]);

		const row1 = await td.row(1);
		expect(row1).toEqual([4, 5, 6]);
	});

	test("append rows and iterate", async () => {
		const { stream, td } = await setupWithNewFile();

		stream.write([1, 2, 3]);
		stream.write([4, 5, 6]);
		stream.end();

		await finished(stream as Writable);

		const rows = [];
		for await (const row of td) rows.push(row);

		expect(rows[0]).toEqual([1, 2, 3]);
		expect(rows[1]).toEqual([4, 5, 6]);
	});

	// This test serves to assert that the code handles data that
	// comes in several chunks correctly.
	test("append rows and iterate - small streamed chunks", async () => {
		const { stream, td, sto } = await setupWithNewFile();

		const rows = [];
		for (let i = 1; i <= 24; i++) {
			const row = [i, i * 2, i * 3];
			rows.push(row);
			stream.write(row);
		}
		expect.assertions(rows.length);

		stream.end();

		// eslint-disable-next-line @typescript-eslint/unbound-method
		const createReadStream = sto.createReadStream;

		sto.createReadStream = (path, options) => {
			return createReadStream.call(sto, path, {
				...options,
				// Purposely taking a non-multiple of 8
				highWaterMark: 12,
			});
		};

		await finished(stream as Writable);

		const streamedRows = [];
		for await (const row of td) streamedRows.push(row);

		// Comparing stringified rows individually gives better error messages
		for (let i = 0; i < rows.length; i++) {
			expect(streamedRows[i].join(", ")).toEqual(rows[i].join(", "));
		}
	});

	describe("errors", () => {
		test("destroys stream when calling `write()` with incorrect row when no callback is provided", async () => {
			const { stream } = await setupWithNewFile();

			// Add a row with 1 value instead of 3
			stream.write([1]);
			await expect(finished(stream as Writable)).rejects.toThrowError(
				/columns/
			);
		});

		test("does not destroy stream when calling `write()` with incorrect row when callback is provided", async () => {
			const { stream } = await setupWithNewFile();

			const cb = jest.fn();

			// Add a row with 1 value instead of 3
			stream.write([1], cb);
			stream.write([1, 2, 3]);
			expect(cb).toHaveBeenCalledTimes(1);
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			expect(cb.mock.lastCall[0]).toBeInstanceOf(Error);
			stream.end();
			await expect(finished(stream as Writable)).resolves.toBeUndefined();
		});
	});
});
