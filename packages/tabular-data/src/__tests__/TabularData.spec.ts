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
describe.each(testCases)("TabularData %j", (data: number[][]) => {
	const numColumns = data[0]?.length ?? 0;
	const numRows = data.length;

	const dataAsTypedArray = new Float64Array(numRows * numColumns);
	dataAsTypedArray.set(data.flat());

	async function testInterfaceFunctions(table: ITabularData) {
		expect(table.numColumns()).toEqual(numColumns);
		expect(table.numRows()).toEqual(numRows);
		expect(await table.rows()).toEqual(data);

		// Get the last row from the table
		if (data.length > 0) {
			const start = data.length - 1;
			expect(await table.rows(start)).toEqual(data.slice(start));
		}

		// Get the first row from the table
		if (data.length > 0) {
			expect(await table.rows(0, 1)).toEqual(data.slice(0, 1));
		}

		for (let i = 0; i < data.length; i++) {
			expect(await table.row(i)).toEqual(data[i]);
		}
	}

	describe("TabularDataImmutable", () => {
		const immutable = new TabularDataImmutable(
			dataAsTypedArray.buffer as ITabularDataBuffer,
			numColumns
		);
		test("implements ITabularData", () => {
			return testInterfaceFunctions(immutable);
		});
		test("from()", async () => {
			const mutable = new TabularDataMutable();
			data.forEach((row) => mutable.push(row));
			const immutable2 = await TabularDataImmutable.from(mutable);
			return testInterfaceFunctions(immutable2);
		});
		test("fromMutable()", async () => {
			const immutable2 = await TabularDataImmutable.from(immutable);
			return testInterfaceFunctions(immutable2);
		});
		test("getBuffer()", () => {
			expect(new Float64Array(immutable.getBuffer())).toEqual(dataAsTypedArray);
		});
	});

	describe("TabularDataMutable", () => {
		const mutable = new TabularDataMutable();
		data.forEach((row) => mutable.push(row));
		test("implements ITabularData", () => {
			return testInterfaceFunctions(mutable);
		});
		test("from()", async () => {
			const mutable2 = await TabularDataMutable.from(mutable);
			return testInterfaceFunctions(mutable2);
		});
	});

	describe("TabularDataStream", () => {
		let testFilePath: string;
		let sto: StorageEngine;

		beforeAll(async () => {
			sto = new FileSystemStorageEngine(await mkdirTmp());
			testFilePath = "test";
		});
		let stream: TabularDataStream;

		beforeEach(async () => {
			await sto.write(testFilePath, Buffer.from(dataAsTypedArray.buffer));
			stream = await TabularDataStream.open(sto, testFilePath, numColumns);
		});

		afterAll(async () => {
			await rmrf(testFilePath);
		});

		test("implements ITabularData", () => {
			return testInterfaceFunctions(stream);
		});

		test("from()", async () => {
			const stream2 = await TabularDataStream.from(sto, stream, testFilePath);
			return testInterfaceFunctions(stream2);
		});

		test("implements Iterator", async () => {
			let index = 0;
			for await (const tableElement of stream) {
				expect(tableElement).toEqual(await stream.row(index));
				expect(tableElement).toEqual(data[index]);
				index++;
			}
		});
	});
});
