import { Buffer } from "buffer";

import { R2Bucket as R2BucketV3 } from "@cloudflare/workers-types";
import { R2Bucket } from "@miniflare/r2";
import { assertDefined } from "@omegadot/assert";
import {
	FileNotFoundError,
	IReadOptions,
	StorageEngine,
} from "@omegadot/storage-engine";
import { Miniflare } from "miniflare";
import { test, expect, beforeAll } from "vitest";

import { streamToString } from "../../../storage-engine/src";
import { R2StorageEngine } from "../R2StorageEngine";

const describe = setupMiniflareIsolatedStorage();

describe("R2StorageEngine", () => {
	let bucket: R2Bucket;
	let sto: StorageEngine;
	const files = {
		"abc.txt": "abcdefghijklmnopqrstuvwxyz",
	};

	beforeAll(async () => {
		const mf = new Miniflare({
			modules: true,
			script: ``,
			r2Buckets: ["r2Bucket"],
		});
		bucket = await mf.getR2Bucket("r2Bucket");
		sto = new R2StorageEngine({ r2Bucket: bucket as unknown as R2BucketV3 });
		``;
		for (const [path, fileContents] of Object.entries(files)) {
			await sto.write(path, Buffer.from(fileContents));
		}
	});

	describe("tests not in storageEngineTestSuite", () => {
		test("put", async () => {
			await bucket.put("count", "1");
			await bucket.put("count2", "2");
			const objectBody = await bucket.get("count");
			expect(objectBody).toBeDefined();
			// Add assertions here to verify the behavior
		});

		test("put get", async () => {
			await bucket.put("count", "1");
			const object = await bucket.get("count");
			expect(object).toBeDefined();
			assertDefined(object);
			expect(await object.text()).toBe("1");
		});

		test("put buffer", async () => {
			await bucket.put("count", Buffer.from("1"));
			const object = await bucket.get("count");
			expect(object).toBeDefined();
			assertDefined(object);
			expect(await object.text()).toBe("1");
		});

		test("R2StorageEngine.readFile()", async () => {
			await bucket.put("abc.txt", "abcdefghijklmnopqrstuvwxyz");
			const sto = new R2StorageEngine({
				r2Bucket: bucket as unknown as R2BucketV3,
			});
			await sto.readFile("abc.txt").then((file) => {
				expect(file.toString()).toBe("abcdefghijklmnopqrstuvwxyz");
			});
		});

		test("R2StorageEngine.write()", async () => {
			const sto = new R2StorageEngine({
				r2Bucket: bucket as unknown as R2BucketV3,
			});
			await sto
				.write("abc.txt", Buffer.from("abcdefghijklmnopqrstuvwxyz"))
				.then(async () => {
					const object = await bucket.get("abc.txt");
					expect(object).toBeDefined();
					assertDefined(object);
					expect(await object.text()).toBe("abcdefghijklmnopqrstuvwxyz");
				});
		});
	});

	/**
	 * The following tests are copied from storageEngineTestSuite.ts and adapdet for the vitest environment
	 */
	describe(`StorageEngine test suite - R2StorageEngine implementation`, () => {
		async function read(path: string, options?: IReadOptions): Promise<string> {
			const { buffer, bytesRead } = await sto.read(path, options);
			return buffer.toString("utf8", 0, bytesRead);
		}

		describe("read()", () => {
			test("returns complete file contents with default options", async () => {
				const string = await read("abc.txt");

				expect(string).toBe("abcdefghijklmnopqrstuvwxyz");
			});

			test("returns file contents with specified `length`", async () => {
				const string = await read("abc.txt", { length: 10 });

				expect(string).toBe("abcdefghij");
				expect(string).toHaveLength(10);
			});

			test("returns file contents from specified `position`", async () => {
				const string = await read("abc.txt", { position: 1, length: 10 });

				expect(string).toBe("bcdefghijk");
				expect(string).toHaveLength(10);
			});

			test("short buffer", async () => {
				const buffer16 = Buffer.alloc(16);
				const { buffer, bytesRead } = await sto.read("abc.txt", {
					buffer: buffer16,
				});

				expect(bytesRead).toBe(16);
				expect(buffer).toBe(buffer16);
				expect(buffer.toString("utf8")).toBe("abcdefghijklmnop");
			});

			test("throws FileNotFoundError when file does not exist", async () => {
				await expect(sto.read("nonexistent.txt")).rejects.toBeInstanceOf(
					FileNotFoundError
				);
			});
		});

		describe("rename()", () => {
			test("rename file", async () => {
				const src = "move-source";
				const dst = "move-dst";

				await sto.write(src, Buffer.from("123"));
				await expect(sto.size(dst)).rejects.toThrow();

				await sto.rename(src, dst);

				await expect(sto.size(src)).rejects.toThrow();
				expect(await sto.size(dst)).toBe(3);

				await sto.remove(dst);
			});

			test("rename file that does not exist", async () => {
				await expect(
					sto.rename("nonexistent.txt", "newname.txt")
				).rejects.toBeInstanceOf(FileNotFoundError);
			});
		});

		describe("remove()", () => {
			test("cannot access removed file", async () => {
				const src = "deletion-test";
				await sto.write(src, Buffer.from("123"));

				expect(await sto.size(src)).toBe(3);
				await sto.remove(src);
				await expect(sto.size(src)).rejects.toThrow();
			});
		});

		describe("size()", () => {
			test("returns size of file in bytes", async () => {
				expect(await sto.size("abc.txt")).toBe(26);
			});

			test("throws FileNotFoundError when file does not exist", async () => {
				await expect(
					sto.size("THIS_FILE_SHOULD_NOT_EXIST")
				).rejects.toBeInstanceOf(FileNotFoundError);
			});
		});

		describe("createReadStream()", () => {
			test("streams file contents", async () => {
				const stream = sto.createReadStream("abc.txt");

				expect(await streamToString(stream)).toBe(files["abc.txt"]);
			});

			test("emits FileNotFoundError when file does not exist", async () => {
				const stream = sto.createReadStream("THIS_FILE_SHOULD_NOT_EXIST");

				return expect(stream.promise()).rejects.toBeInstanceOf(
					FileNotFoundError
				);
			});
		});

		describe("createWriteStream()", () => {
			test("appends data to end of file", async () => {
				const stream = await sto.createWriteStream("stream.txt");

				stream.write(Buffer.from("012345"));
				stream.write(Buffer.from("abcdef"));
				stream.end();

				await stream.promise();
				const fileContents = await read("stream.txt");

				expect(fileContents).toBe("012345abcdef");
			});
		});
	});
});
