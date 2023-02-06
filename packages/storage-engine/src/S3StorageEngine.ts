import { normalize } from "path";
import { PassThrough, Readable, Writable } from "stream";

import {
	CopyObjectCommand,
	DeleteObjectCommand,
	GetObjectCommand,
	HeadObjectCommand,
	PutObjectCommand,
	S3,
	S3Client,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { assertDefined, assertInstanceof } from "@omegadot/assert";

import { IReadOptions, StorageEngine } from "./StorageEngine";

export interface IS3StorageEngineConfig {
	endpoint: string;
	region: string;
	accessKeyId: string;
	secretAccessKey: string;
	bucket: string;

	prefix?: string;
}

export class S3StorageEngine extends StorageEngine {
	private s3client: S3Client;
	private readonly bucket: string;
	private readonly prefix: string;

	constructor({
		endpoint,
		region,
		accessKeyId,
		secretAccessKey,
		prefix,
		bucket,
	}: IS3StorageEngineConfig) {
		super();

		this.bucket = bucket;
		this.prefix = prefix ?? "resources";

		this.s3client = new S3({
			endpoint,
			// TODO: is the region param really required?
			region,
			credentials: {
				accessKeyId,
				secretAccessKey,
			},
		});
	}

	async remove(fileName: string) {
		await this.s3client.send(
			new DeleteObjectCommand(this.getBaseObject(fileName))
		);
	}

	async size(fileName: string) {
		const info = await this.s3client.send(
			new HeadObjectCommand(this.getBaseObject(fileName))
		);
		assertDefined(info.ContentLength, "Could not get S3 content length");
		return info.ContentLength;
	}

	// TODO: Whole contents are read into memory. Are there ways to avoid that?
	async readFile(fileName: string): Promise<Buffer> {
		const response = await this.s3client.send(
			new GetObjectCommand(this.getBaseObject(fileName))
		);

		return new Promise((resolve, reject) => {
			assertDefined(response.Body);
			assertInstanceof(response.Body, Readable);
			const body = response.Body;

			try {
				const chunks: Buffer[] = [];
				body.on("data", (chunk: Buffer) => chunks.push(chunk));
				body.once("end", () => resolve(Buffer.concat(chunks)));
				body.once("error", reject);
			} catch (err) {
				return reject(err);
			}
		});
	}

	readFileStream(fileName: string) {
		return this.createReadStream(fileName);
	}

	async write(fileName: string, contents: Buffer) {
		await this.s3client.send(
			new PutObjectCommand({
				...this.getBaseObject(fileName),
				Body: contents,
				ACL: "private",
			})
		);
	}

	async rename(oldFileName: string, newFileName: string) {
		// It looks like S3 does not support renaming/moving. The recommended way is to copy and
		// then delete the source
		// https://docs.aws.amazon.com/AmazonS3/latest/userguide/copy-object.html
		await this.s3client.send(
			new CopyObjectCommand({
				// Specify Source
				CopySource: `${this.bucket}/${this.getKey(oldFileName)}`,
				// Destination is taken from "Key" of the "base object"
				...this.getBaseObject(newFileName),
			})
		);

		await this.remove(oldFileName);
	}

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

	createReadStream(
		path: string,
		options: { start?: number; end?: number } = {}
	): Readable {
		const stream = new PassThrough();

		void (async () => {
			const { start = 0, end } = options;
			// See: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Range
			const range = `bytes=${start}-${end !== undefined ? `${end}` : ""}`;

			const response = await this.s3client.send(
				new GetObjectCommand({
					...this.getBaseObject(path),
					Range: range,
				})
			);

			// Type instanceOf assertion is hopefully justified because this code runs only in a
			// node context (and not in a browser)
			// See: https://stackoverflow.com/a/69803144
			assertDefined(response.Body);
			assertInstanceof(response.Body, Readable);
			const body = response.Body;

			body.pipe(stream);
		})().catch((e) => {
			assertInstanceof(e, Error);
			// Destroy streams if the IIFE function causes issues on initialization
			// caused while setting up the stream (for example if the S3 invocation causes errors)
			stream.destroy(e);
		});

		return stream;
	}

	createWriteStream(path: string): Writable {
		const stream = new PassThrough();

		void (async () => {
			const upload = new Upload({
				client: this.s3client,
				params: {
					...this.getBaseObject(path),
					ACL: "private",
					Body: stream,
				},
				queueSize: 4, // optional concurrency configuration
				partSize: 1024 * 1024 * 5, // optional size of each part, in bytes, at least 5MB
				leavePartsOnError: false, // optional manually handle dropped parts
			});

			// parallelUploads3.on("httpUploadProgress", (progress) => {
			// 		console.log(progress);
			// 	});

			await upload.done();
		})().catch((e) => {
			assertInstanceof(e, Error);
			// Destroy streams if the IIFE function causes issues on initialization
			// caused while setting up the stream (for example if the S3 invocation causes errors)
			stream.destroy(e);
		});

		return stream;
	}

	async getDownloadLink(fileName: string): Promise<string> {
		const getObjectCommand = new GetObjectCommand(this.getBaseObject(fileName));
		return getSignedUrl(this.s3client, getObjectCommand, { expiresIn: 3600 });
	}

	// Internally used by clone-env
	async interBucketCopy(
		src: { fileName: string; bucket: string; prefix: string },
		target: { fileName: string; bucket: string; prefix: string }
	) {
		await this.s3client.send(
			new CopyObjectCommand({
				// Specify Source
				CopySource: `${src.bucket}/${this.getKey(src.fileName, src.prefix)}`,
				// Destination is taken from "Key" of the "base object"
				Bucket: target.bucket,
				Key: this.getKey(target.fileName, target.prefix),
			})
		);
	}

	/**
	 * Get the S3 key for a file name (S3 keys are basically the file names within the S3 bucket)
	 */
	private getKey(fileName: string, customPrefix?: string) {
		return normalize(`${customPrefix ?? this.prefix}/${fileName}`);
	}

	/**
	 * Helper function which constructs a object which is required by many requests
	 */
	private getBaseObject(fileName: string) {
		return {
			Bucket: this.bucket,
			Key: this.getKey(fileName),
		};
	}
}
