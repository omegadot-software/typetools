import assert from "assert";

import { ITabularData } from "./interface/ITabularData";

/**
 * Provides the element index for the given `rowIndex`, assuming the rows are stored in a contiguous block of memory in
 * row-major order.
 *
 * Example:
 *
 * The following data...
 *
 *  rowIndex ║     Col 1 │ Col 2  │  Col 3
 *  ═════════╬═══════════════════════════════
 *           ║  ┌                         ┐
 *    0      ║  │  a_11  │  a_12  │  a_13 │
 *    1      ║  │  a_21  │  a_22  │  a_23 │
 *    2      ║  │  a_31  │  a_32  │  a_33 │
 *           ║  └                         ┘
 *
 * ...is stored in memory like this:
 *
 * value         ║  a_11 │ a_12 │ a_13 │ a_21 │ a_22 │ a_23 │ a_31 │ a_32 │ a_33
 * ══════════════╬═════════════════════════════════════════════════════════════════════
 * elementIndex  ║    0  │   1  │   2  │   3  │   4  │   5  │   6  │   7  │   8
 *
 *
 * For a given `rowIndex` of 1, the function returns a value of 3.
 *
 * @param rowIndex - The row for which to return the element index. The element at the returned position contains the
 *                   first item of the row.
 *
 */
export function rowIndexToElementIndex(this: ITabularData, rowIndex: number) {
	assert(rowIndex >= 0, "rowIndexToElementIndex: rowIndex < 0");
	assert(
		rowIndex <= this.numRows(),
		"rowIndexToElementIndex: rowIndex exceeds number of rows"
	);
	return rowIndex * this.numColumns();
}
