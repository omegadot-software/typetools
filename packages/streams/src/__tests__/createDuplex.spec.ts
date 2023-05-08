import { createDuplex } from "../createDuplex";

describe("createDuplex", () => {
	test("transform function that returns data", async () => {
		const transformStream = createDuplex({
			transform: (chunk: number) => chunk * 2,
		});

		// No consumers, hence the stream should signal to stop writing.
		expect(transformStream.write(0)).toBe(false);
		expect(transformStream.write(1)).toBe(false);
		transformStream.end(2);

		const values = await transformStream.collect();

		expect(values).toEqual([0, 2, 4]);
	});

	test("transform function that calls callback", async () => {
		const transformStream = createDuplex({
			transform: (chunk: number, cb) => cb(null, chunk * 2),
		});

		// No consumers, hence the stream should signal to stop writing.
		expect(transformStream.write(0)).toBe(false);
		expect(transformStream.write(1)).toBe(false);
		transformStream.end(2);

		const values = await transformStream.collect();

		expect(values).toEqual([0, 2, 4]);
	});

	test("error in transform destroys stream", () => {
		const error = new Error("oh no");
		const transformStream = createDuplex({
			transform: () => {
				throw error;
			},
		});
		const listener = jest.fn();
		transformStream.on("error", listener);

		// transformStream.on("close", () => console.log("close"));

		transformStream.write("hello");

		expect(listener).toHaveBeenCalledTimes(1);
		expect(listener).toHaveBeenCalledWith(error);
	});
});
