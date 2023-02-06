import assert from "assert";

import { ITabularData } from "./interface/ITabularData";

/**
 * The underlying data store for a `TabularDataMutable` is an ordinary 2D number array.
 * This class implements a `push` method (hence the name) and can therefore be used when first constructing a resource.
 * When purely accessing resources prefer `TabularDataStream` or `TabularDataImmutable`.
 */
export class TabularDataMutable implements ITabularData {
	private readonly data: (readonly number[])[];

	static async from(arg: ITabularData): Promise<TabularDataMutable> {
		return new TabularDataMutable(await arg.rows());
	}

	constructor(data: (readonly number[])[] = []) {
		this.data = data;
	}

	numRows() {
		return this.data.length;
	}

	numColumns() {
		if (this.data.length === 0) return 0;
		return this.data[0].length;
	}

	rows(start = 0, end: number = this.numRows()) {
		assert(start >= 0, "TabularDataMutable.rows: start < 0");
		if (this.numRows() === 0) return [];
		assert(start < end, "TabularDataMutable.rows: end <= start");

		return this.data.slice(start, end);
	}

	row(rowIndex: number) {
		return this.data[rowIndex];
	}

	push(y: number[]) {
		assert(this.data.length === 0 || this.data[0].length === y.length);
		this.data.push(y);
		return this;
	}

	unshift(y: number[]) {
		assert(this.data.length === 0 || this.data[0].length === y.length);
		this.data.unshift(y);
		return this;
	}

	*[Symbol.iterator]() {
		for (const item of this.data) yield item;
	}
}
