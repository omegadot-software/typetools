import { Buffer } from "node:buffer";
import { Readable as NodeReadable } from "node:stream";

import { R2Bucket } from "@cloudflare/workers-types";
// import { R2UploadedPart } from "@miniflare/r2";
import { assertDefined, assertInstanceof } from "@omegadot/assert";
import {
	FileNotFoundError,
	IReadOptions,
	StorageEngine,
} from "@omegadot/storage-engine";
import {
	Readable,
	createReadable,
	createPipeline,
	// createDuplex,
} from "@omegadot/streams";

export interface IR2StorageEngineConfig {
	r2Bucket: R2Bucket;
}

//TODO: Apply constant handling of errors. First step is to find out what happens if a file is not found.
// ANSWER: Get methods return null if the file is not found. This is handled in the size method.

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
export class R2StorageEngine extends StorageEngine {
	r2Bucket: R2Bucket;

	constructor({ r2Bucket }: IR2StorageEngineConfig) {
		super();
		this.r2Bucket = r2Bucket;
	}

	createReadStream(
		path: string,
		options: { start?: number; end?: number } = {}
	): Readable<Buffer> {
		const stream = createPipeline<Buffer, Buffer>();

		void (async () => {
			try {
				const { start = 0, end } = options;
				const response = await this.r2Bucket.get(path, {
					range: {
						offset: start,
						length: end !== undefined ? end - start + 1 : undefined,
					},
				});
				assertDefined(response);
				stream.unshift(
					createReadable<Buffer>(NodeReadable.from(response.body))
				);
			} catch (e) {
				throw new FileNotFoundError();
			}
		})().catch((e) => {
			assertInstanceof(e, Error);
			// Destroy streams if the IIFE function causes issues on initialization
			// caused while setting up the stream (for example if the S3 invocation causes errors)
			stream.destroy(e);
		});

		return stream;

		// try{
		// 	const response = await this.r2Bucket.get(path, {
		// 	})
		// 	assertDefined(response);
		// 	return createReadable<Buffer>(NodeReadable.from(response.body))
		// } catch (e) {
		// 	throw new FileNotFoundError()
		// }
	}

	// createWriteStream(path: string) {
	// 	const duplex = createDuplex<Buffer, Buffer>();
	// 	const { readable, writable } = new TransformStream<Buffer, Buffer>();
	// 	const writer = writable.getWriter();
	// 	duplex.on("data", (chunk) => {
	// 		void writer.write(chunk);
	// 	});
	// 	duplex.on("end", () => void writer.close());
	//
	// 	void this.r2Bucket.put(path, readable);
	// 	// .then((response) => {
	// 	// 	if (response === null) {
	// 	// 		throw new FileNotFoundError();
	// 	// 	}
	// 	// })
	// 	// .catch((e) => {
	// 	// 	throw e;
	// 	// });
	//
	// 	return duplex;
	//
	// 	// // Implementation via multipart upload. Problem: The parts are smaller, than the minimal part size of
	// 	// const duplex = createDuplex<Buffer, Buffer>();
	// 	// const multipartUpload =  await this.r2Bucket.createMultipartUpload(
	// 	// 	path,
	// 	// )
	// 	// let partNumber = 1
	// 	// const uploadsInQueue: Promise<R2UploadedPart>[] = []
	// 	// duplex.on("data", (chunk) => {
	// 	// 	uploadsInQueue.push(multipartUpload.uploadPart(partNumber, chunk))
	// 	// 	partNumber++
	// 	// })
	// 	//
	// 	// duplex.promise = () =>
	// 	// 	Promise.race([
	// 	// 		new Promise((resolve, reject) => {
	// 	// 			duplex.on("error", reject);
	// 	// 		}),
	// 	// 		Promise.all(uploadsInQueue).then((uploadedParts) =>
	// 	// 		multipartUpload.complete(uploadedParts)
	// 	// 			.then(() => {
	// 	// 				console.log("complete", uploadedParts.length)
	// 	// 				// According to the nodejs docs, the 'close' event is emitted when the stream and any of its underlying
	// 	// 				// resources (a file descriptor, for example) have been closed. The event indicates that no more events will be
	// 	// 				// emitted, and no further computation will occur.
	// 	// 				duplex.emit("close");
	// 	// 			})
	// 	// 			.catch((e) => {
	// 	// 				assertInstanceof(e, Error);
	// 	// 				// Destroy streams if the IIFE function causes issues on initialization
	// 	// 				// caused while setting up the stream (for example if the S3 invocation causes errors)
	// 	// 				duplex.destroy(e);
	// 	// 				throw e;
	// 	// 			}))
	// 	// 	]).then();
	// 	// return duplex
	//
	// 	// const duplex = createDuplex<Buffer, Buffer>();
	// 	// const { readable, writable } = new TransformStream();
	// 	// const writer = writable.getWriter();
	// 	// duplex.on("data", (chunk) => {
	// 	// 	void writer.write(chunk);
	// 	// });
	// 	// duplex.on("end", () => void writer.close());
	// 	//
	// 	// void this.r2Bucket
	// 	// 	.put(path, readable)
	// 	// 	// .then((response) => {
	// 	// 	// 	if (response === null) {
	// 	// 	// 		throw new FileNotFoundError();
	// 	// 	// 	}
	// 	// 	// })
	// 	// 	// .catch((e) => {
	// 	// 	// 	throw e;
	// 	// 	// });
	// 	//
	// 	// return duplex;
	//
	// 	// const duplex = createDuplex<Buffer, Buffer>();
	// 	// this.r2Bucket.put(path, NodeReadable.from(duplex)).then((response) => {
	// 	// 	if (response === null) {
	// 	// 		throw new FileNotFoundError();
	// 	// 	}
	// 	// })
	// 	//
	// 	// duplex.promise = () =>
	// 	// 	Promise.race([
	// 	// 		new Promise((resolve, reject) => {
	// 	// 			duplex.on("error", reject);
	// 	// 		}),
	// 	// 	]).then();
	// 	//
	// 	// return duplex
	// }

	read(
		path: string,
		options: IReadOptions = {}
	): Promise<{ bytesRead: number; buffer: Buffer }> {
		const start = options?.position ?? 0;
		const end =
			options?.length !== undefined ? start + options.length - 1 : undefined;
		const buffer = options.buffer ?? Buffer.alloc(16 * 1024);

		const stream = this.createReadStream(path, { start, end });

		let bytesRead = 0;

		return new Promise((resolve, reject) => {
			stream.on("data", function (d: Buffer) {
				const capacity = buffer.length - bytesRead;
				const tmp = d.subarray(0, capacity);
				buffer.set(tmp, bytesRead);
				bytesRead += tmp.length;

				if (bytesRead >= buffer.length) {
					// If all requested bytes are read the stream (provided by S3) can be closed
					// In theory, this should not happen, since the stream should only contain the
					// requested bytes. However, for the sake of completeness, the stream will be
					// destroyed.
					stream.destroy();

					resolve({ buffer, bytesRead });
				}
			});

			stream.on("error", reject);

			stream.on("end", () => resolve({ buffer, bytesRead }));
		});
	}

	async readFile(fileName: string): Promise<Buffer> {
		try {
			const response = await this.r2Bucket.get(fileName, {});
			assertDefined(response);
			return await response.blob().then(async (blob) => {
				const arrayBuffer = await blob.arrayBuffer();
				return Buffer.from(arrayBuffer);
			});
		} catch (e) {
			throw new FileNotFoundError();
		}
	}

	async remove(fileName: string): Promise<void> {
		await this.r2Bucket.delete(fileName);
	}

	async rename(oldFileName: string, newFileName: string): Promise<void> {
		const readStream = await this.r2Bucket.get(oldFileName).then((response) => {
			if (response === null) {
				throw new FileNotFoundError();
			}
			return response.body;
		});
		await this.r2Bucket.put(newFileName, readStream);
		await this.r2Bucket.delete(oldFileName);
	}

	async size(fileName: string): Promise<number> {
		const response = await this.r2Bucket.head(fileName);
		if (response === null) {
			throw new FileNotFoundError();
		}
		return response.size;
	}

	async write(fileName: string, contents: Buffer): Promise<void> {
		await this.r2Bucket.put(fileName, contents.toString());
	}
}
