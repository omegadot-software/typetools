import assert from "assert";

import { ITabularData } from "./interface/ITabularData";
import { ITabularDataBuffer } from "./interface/ITabularDataBuffer";
import { rowIndexToElementIndex } from "./rowIndexToElementIndex";

/**
 * The underlying data store for a `TabularDataImmutable` is an ArrayBuffer (Float64Array).
 * Used where we need a raw `ITabularDataBuffer` (e.g. for `Transfer()` or `writeFile()`).
 */
export class TabularDataImmutable implements ITabularData {
	private readonly data: Float64Array;

	private readonly _numColumns: number;
	private readonly _numRows: number;

	static async from(arg: ITabularData): Promise<TabularDataImmutable> {
		const data = await arg.rows();

		const float64Array = new Float64Array(data.flat());

		return new TabularDataImmutable(
			float64Array.buffer as ITabularDataBuffer,
			arg.numColumns()
		);
	}

	constructor(data: ITabularDataBuffer, numColumns: number) {
		this.data = new Float64Array(data);
		this._numColumns = numColumns;
		this._numRows = numColumns === 0 ? 0 : this.data.length / numColumns;
		assert(
			Number.isInteger(this._numRows),
			"Corrupted file. Number of rows is not an int."
		);
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
	rows(start = 0, end = this.numRows()) {
		assert(start >= 0, "TabularDataImmutable.rows: start < 0");
		if (this.numRows() === 0) return [];
		assert(start < end, "TabularDataImmutable.rows: end <= start");

		const startElementIndex = rowIndexToElementIndex.call(this, start);
		const endElementIndex = rowIndexToElementIndex.call(this, end);

		const doubles = this.data.slice(startElementIndex, endElementIndex);

		const data: number[][] = [];
		for (let i = 0; i < doubles.length; i += this.numColumns()) {
			const items = Array.from(doubles.subarray(i, i + this.numColumns()));
			data.push(items);
		}
		return data;
	}

	row(rowIndex: number) {
		return this.rows(rowIndex, rowIndex + 1)[0];
	}

	*[Symbol.iterator]() {
		for (let rowIndex = 0; rowIndex < this.numRows(); rowIndex++) {
			yield this.row(rowIndex);
		}
	}

	getBuffer(): ITabularDataBuffer {
		return this.data.buffer as ITabularDataBuffer;
	}
}
