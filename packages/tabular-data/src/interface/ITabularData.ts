import { Promisable } from "type-fest";

export interface ITabularData {
	/**
	 * Returns a shallow copy of the underlying tabular data into a new two-dimensional array,
	 * selected from `start` to `end` (`end` not included) where `start` and `end` represent the index
	 * of items in the underlying tabular data. The underlying data will not be modified.
	 *
	 * @param start - row index, inclusive. If `start` is undefined, rows starts from the index 0.
	 * @param end - row index, exclusive
	 */
	rows(start?: number, end?: number): Promisable<(readonly number[])[]>;

	/**
	 * Access the row at the specified `rowIndex`. Same as `rows(rowIndex, rowIndex + 1)`.
	 *
	 * @param rowIndex - Zero-based row index to access.
	 */
	row(rowIndex: number): Promisable<readonly number[]>;

	/**
	 * Returns the number of rows in the underlying tabular data. Same as `rows().length`.
	 */
	numRows(): number;

	/**
	 * Returns the number of columns in the underlying tabular data. Same as `rows(0).length`.
	 */
	numColumns(): number;
}
