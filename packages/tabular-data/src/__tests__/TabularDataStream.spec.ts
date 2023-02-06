import exp from "constants";

import { mkdirTmp, rmrf } from "@omegadot/fs";
import {
	FileSystemStorageEngine,
	StorageEngine,
} from "@omegadot/storage-engine";

import { TabularDataImmutable } from "../TabularDataImmutable";
import { TabularDataMutable } from "../TabularDataMutable";
import { TabularDataStream } from "../TabularDataStream";
import { ITabularData } from "../interface/ITabularData";
import { ITabularDataBuffer } from "../interface/ITabularDataBuffer";

const testCases = [
	// [
	// 	// Empty
	// 	[],
	// ],
	[
		// Single row with single item
		[[1]],
	],
	// [
	// 	// Multiple rows with single column
	// 	[[1], [2], [3]],
	// ],
	// [
	// 	// Single row with multiple columns
	// 	[[1, 2, 3]],
	// ],
	// [
	// 	// Multiple rows with multiple columns (3x3)
	// 	[
	// 		[1, 1, 1],
	// 		[2, 2, 2],
	// 		[3, 3, 3],
	// 	],
	// ],
	// [
	// 	// Multiple rows with multiple columns (3x4)
	// 	[
	// 		[1, 2, 3, 4],
	// 		[2, 2, 2, 5],
	// 		[6, 3, 3, 3],
	// 	],
	// ],
	// [
	// 	// Multiple rows with multiple columns (4x3)
	// 	[
	// 		[1, 2, 3],
	// 		[2, 2, 2],
	// 		[6, 3, 3],
	// 		[6, 3, 3],
	// 	],
	// ],
];
describe("TabularDataStream", () => {
	test("creates file if it does not exist", async () => {
		const filename = "non-existent";
		const sto: StorageEngine = new FileSystemStorageEngine(await mkdirTmp());
		await TabularDataStream.init(sto, filename, 1);

		expect(await sto.size(filename)).toBe(0);
	});

	test("empty file has row count of zero", async () => {
		const filename = "empty";
		const sto: StorageEngine = new FileSystemStorageEngine(await mkdirTmp());

		// Create empty file
		await sto.write(filename, Buffer.alloc(0));

		const td = await TabularDataStream.init(sto, filename, 1);

		expect(td.numRows()).toBe(0);
	});

	test("adding data updates number of rows", async () => {
		const filename = "empty";
		const sto: StorageEngine = new FileSystemStorageEngine(await mkdirTmp());

		// Create empty file
		await sto.write(filename, Buffer.alloc(0));

		const td = await TabularDataStream.init(sto, filename, 3);

		await td.push([1, 2, 3]);

		expect(td.numRows()).toBe(1);
	});

	test("file size is correct", async () => {
		const filename = "test";
		const sto: StorageEngine = new FileSystemStorageEngine(await mkdirTmp());
		const td = await TabularDataStream.init(sto, filename, 3);

		await td.push([1, 2, 3]);

		expect(await sto.size(filename)).toBe(3 * Float64Array.BYTES_PER_ELEMENT);
	});

	test("append rows and read individual rows", async () => {
		const filename = "test";
		const sto: StorageEngine = new FileSystemStorageEngine(await mkdirTmp());
		const td = await TabularDataStream.init(sto, filename, 3);

		await td.push([1, 2, 3]);
		await td.push([4, 5, 6]);

		const row0 = await td.row(0);
		expect(row0).toEqual([1, 2, 3]);

		const row1 = await td.row(1);
		expect(row1).toEqual([4, 5, 6]);
	});

	test("append rows and iterate", async () => {
		const filename = "test";
		const sto: StorageEngine = new FileSystemStorageEngine(await mkdirTmp());
		const td = await TabularDataStream.init(sto, filename, 3);

		await td.push([1, 2, 3]);
		await td.push([4, 5, 6]);

		const rows = [];
		for await (const row of td) rows.push(row);

		expect(rows[0]).toEqual([1, 2, 3]);
		expect(rows[1]).toEqual([4, 5, 6]);
	});

	describe("errors", () => {
		test("push row with too few elements", async () => {
			const filename = "empty";
			const sto: StorageEngine = new FileSystemStorageEngine(await mkdirTmp());

			const td = await TabularDataStream.init(sto, filename, 1);

			// Add a row with three values instead of 1
			return expect(td.push([1, 2, 3])).rejects.toThrowError(/columns/);
		});
	});
});
