import assert from "assert";
import EventEmitter from "events";
import { resolve } from "path";
import { Stream } from "stream";

import { StorageEngine, FileNotFoundError } from "@omegadot/storage-engine";

import { rowIndexToElementIndex } from "./rowIndexToElementIndex";

/**
 * The underlying data store for a `TabularData` is a file.
 * It can read rows of data directly from the file without having to read the whole file first.
 *
 * Instances of this class resemble file handles, but additionally provide an API for working with rows and columns of
 * the file.
 */
export class TabularData implements AsyncIterable<readonly number[]> {
	/**
	 * The absolute path to the file to be read.
	 */
	private readonly path: string;

	private readonly sto: StorageEngine;

	private readonly _numColumns: number;
	private _numRows: number;

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
	 * Returns a `TabularData` instance bound to the specified `path`.
	 *
	 * @param path - The path to the file to be read. Can be an array, in which case each element of
	 *               the array is treated as a path segment.
	 * @param numColumns - The number of columns (= the length of a row)
	 */
	static async open(
		sto: StorageEngine,
		path: string | string[],
		numColumns: number
	): Promise<TabularData> {
		const completePath = Array.isArray(path) ? resolve(...path) : path;

		let fileSize = 0;
		try {
			fileSize = await sto.size(completePath);
		} catch (e) {
			// It's ok if the file does not exist. It can be created by calling the `createWriteStream` method.
			if (!(e instanceof FileNotFoundError)) throw e;
		}
		// If the table has no columns, then it cannot contain data and hence there cannot be any rows
		const numRows =
			numColumns === 0
				? 0
				: fileSize / (Float64Array.BYTES_PER_ELEMENT * numColumns);

		if (!Number.isInteger(numRows)) {
			throw new Error("Corrupted file. Number of rows is not an int.");
		}

		return new TabularData(sto, completePath, numColumns, numRows);
	}

	numRows() {
		return this._numRows;
	}

	numColumns() {
		return this._numColumns;
	}

	/**
	 * Returns a shallow copy of the underlying tabular data into a new two-dimensional array,
	 * selected from `start` to `end` (`end` not included) where `start` and `end` represent the index
	 * of items in the underlying tabular data. The underlying data will not be modified.
	 *
	 * @param start - row index, inclusive. If `start` is undefined, rows starts from the index 0.
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

	/**
	 * Access the row at the specified `rowIndex`. Same as `rows(rowIndex, rowIndex + 1)`.
	 *
	 * @param rowIndex - Zero-based row index to access.
	 */
	async row(rowIndex: number) {
		return (await this.rows(rowIndex, rowIndex + 1))[0];
	}

	/**
	 * The returned stream's `write` method must be called with an array whose length matches the number of columns in
	 * the table. If a row with in incorrect number of elements is provided then the stream will be destroyed unless an
	 * argument for the callback is provided. In this case, the callback is called with the error argument and the
	 * stream is not destroyed.
	 */
	createWriteStream(): ITabularDataWritableStream {
		const stream = this.sto.createWriteStream(this.path);

		// Get references to the original methods and
		// bind them to the stream instance so we can override the method
		const write = stream.write.bind(stream);
		const end = stream.end.bind(stream);

		const overrides: Pick<ITabularDataWritableStream, "write" | "end"> = {
			write: (row, cb) => {
				// It is an error when the row length is incorrect
				if (row.length !== this.numColumns()) {
					// Deliver the error depending on whether an argument for `cb` was provided or not
					const error = new Error(
						`Number of values (${
							row.length
						}}) does not match number of columns (${this.numColumns()})`
					);

					if (cb) {
						cb(error);
						return stream.writable;
					}

					stream.destroy(error);
					return false;
				}
				++this._numRows;
				const doubles = new Float64Array(row);
				return write(new Uint8Array(doubles.buffer), cb);
			},
			end: (...args) => {
				let row: number[] | undefined;
				let cb: (() => void) | undefined;

				if (Array.isArray(args[0])) {
					row = args[0];
					cb = args[1] as () => void;
					overrides.write(row, cb);
				} else {
					cb = args[0];
				}

				return end(cb);
			},
		};

		return Object.assign(stream, overrides);
	}

	async *[Symbol.asyncIterator]() {
		for (let rowIndex = 0; rowIndex < this.numRows(); rowIndex++) {
			yield await this.row(rowIndex);
		}
	}
}

interface ITabularDataWritableStream extends Stream, EventEmitter {
	writable: boolean;
	write(row: number[], cb?: (err?: Error | null) => void): boolean;
	end(cb?: () => void): void;
	end(row: number[], cb?: () => void): void;
}
