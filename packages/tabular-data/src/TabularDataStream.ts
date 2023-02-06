import assert from "assert";
import { resolve } from "path";

import { StorageEngine } from "@omegadot/storage-engine";

import { TabularDataImmutable } from "./TabularDataImmutable";
import { ITabularData } from "./interface/ITabularData";
import { ITabularDataBuffer } from "./interface/ITabularDataBuffer";
import { StrictArrayBuffer } from "./interface/StrictArrayBuffer";
import { rowIndexToElementIndex } from "./rowIndexToElementIndex";

/**
 * The underlying data store for a `TabularDataStream` is a file.
 * It can read rows of data directly from the file without having to read the whole file first.
 */
export class TabularDataStream
	implements ITabularData, AsyncIterable<readonly number[]>
{
	/**
	 * The absolute path to the file to be read.
	 */
	private readonly path: string;

	private readonly sto: StorageEngine;

	private readonly _numColumns: number;
	private _numRows: number;

	static async from(
		sto: StorageEngine,
		arg: ITabularData,
		path: string | string[]
	): Promise<TabularDataStream> {
		let completePath: string;
		if (Array.isArray(path)) {
			completePath = resolve(...path);
		} else {
			completePath = path;
		}

		const data = await arg.rows();
		const float64Array = new Float64Array(data.flat());
		await sto.write(completePath, Buffer.from(float64Array.buffer));

		return TabularDataStream.init(sto, completePath, arg.numColumns());
	}

	/**
	 *
	 * @param path - The path to the file to be read. Can be an array, in which case each element of
	 *               the array is treated as a path segment.
	 * @param numColumns
	 * @param numRows
	 */
	private constructor(
		sto: StorageEngine,
		path: string,
		numColumns: number,
		numRows: number
	) {
		this.path = path;
		this._numColumns = numColumns;
		this._numRows = numRows;
		this.sto = sto;
	}

	/**
	 * @param path - The path to the file to be read. Can be an array, in which case each element of
	 *               the array is treated as a path segment.
	 * @param numColumns - The number of columns (= the length of a row)
	 */
	static async init(
		sto: StorageEngine,
		path: string | string[],
		numColumns: number
	) {
		const completePath = Array.isArray(path) ? resolve(...path) : path;

		let fileSize = 0;
		try {
			fileSize = await sto.size(completePath);
		} catch (e) {
			// TODO: StorageEngine should throw a dedicated DOES_NOT_EXIST error that we can check
			await sto.write(completePath, Buffer.alloc(0));
		}
		// If the table has no columns, then it cannot contain data and hence there cannot be any rows
		const numRows =
			numColumns === 0
				? 0
				: fileSize / (Float64Array.BYTES_PER_ELEMENT * numColumns);

		if (!Number.isInteger(numRows)) {
			throw new Error("Corrupted file. Number of rows is not an int.");
		}

		return new TabularDataStream(sto, completePath, numColumns, numRows);
	}

	numRows() {
		return this._numRows;
	}

	numColumns() {
		return this._numColumns;
	}

	/**
	 * Read a slice of data, i.e. rows of the original table
	 * @param start - row index, inclusive
	 * @param end - row index, exclusive
	 */
	async rows(
		start = 0,
		end: number = this.numRows()
	): Promise<(readonly number[])[]> {
		assert(start >= 0, "TabularDataStream.rows: start < 0");
		if (this.numRows() === 0) return [];
		assert(start < end, "TabularDataStream.rows: end <= start");

		const startElementIndex = rowIndexToElementIndex.call(this, start);
		const endElementIndex = rowIndexToElementIndex.call(this, end);

		const bytes =
			(endElementIndex - startElementIndex) * Float64Array.BYTES_PER_ELEMENT;

		const { buffer } = await this.sto.read(this.path, {
			position: startElementIndex * Float64Array.BYTES_PER_ELEMENT,
			length: bytes,
			buffer: Buffer.alloc(bytes),
		});

		const doubles = new Float64Array(buffer.buffer);

		const data: number[][] = [];
		for (let i = 0; i < doubles.length; i += this.numColumns()) {
			const items = Array.from(doubles.subarray(i, i + this.numColumns()));
			data.push(items);
		}
		return data;
	}

	async row(rowIndex: number) {
		return (await this.rows(rowIndex, rowIndex + 1))[0];
	}

	/**
	 * Appends the row to the end of the table. An error is thrown when the number of elements does not match the number
	 * of columns returned by `numColumns()`.
	 *
	 * @param row - An array of numbers to add. Length must equal to the number of columns in the table.
	 */
	async push(row: number[]) {
		if (row.length !== this.numColumns()) {
			throw new Error(
				`Number of values (${
					row.length
				}}) does not match number of columns (${this.numColumns()})`
			);
		}

		const array = Float64Array.from(row);
		await this.sto.append(this.path, Buffer.from(array.buffer));
		++this._numRows;
	}

	async *[Symbol.asyncIterator]() {
		for (let rowIndex = 0; rowIndex < this.numRows(); rowIndex++) {
			yield await this.row(rowIndex);
		}
	}
}
