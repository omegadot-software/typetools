import fs from "fs";
import { FileHandle, readFile, rename, rm, writeFile } from "fs/promises";
import { cwd } from "process";
import { Readable, Writable } from "stream";

import { stat } from "@omegadot/fs";
import semver from "semver";

import { ReusableFileHandle } from "./ReusableFileHandle";
import { IReadOptions, StorageEngine } from "./StorageEngine";

// Some of this code is not compatible with older NodeJS versions
// NOT compatible with NodeJS 14
// UNTESTED WITH NodeJS 15
// TESTED only with NodeJS 16
// The error pattern is somewhat subtle (especially if the function is not considered in isolation),
// since in some cases simply too much is read or returned. To prevent potential problems this class
// therefore checks for the minimum node version on its own
const MIN_NODE_VERSION = 16;

const nodeVersion = process.version;
if (!semver.satisfies(nodeVersion, `>=${MIN_NODE_VERSION}`)) {
	throw new Error(
		`Your node version ${nodeVersion} is not supported by this StorageEngine implementation (LocalFileEngine requires Node >=${MIN_NODE_VERSION})`
	);
}

export class FileSystemStorageEngine extends StorageEngine {
	private fileHandles = new Map<string, ReusableFileHandle>();

	constructor(private directory: string = cwd()) {
		super();
	}

	async read(path: string, options: IReadOptions = {}) {
		const { handle, free } = await this.open(path);
		try {
			// Explicitly set position so that the read function will not continue reading from where it left off when
			// it was last invoked
			const position = options.position ?? 0;
			return await handle.read({ ...options, position });
		} finally {
			free();
		}
	}

	async readReverse(path: string, options: IReadOptions = {}) {
		const filesize = await this.size(path);

		const { handle, free } = await this.open(path);
		try {
			const reversePosition = options.position ?? 0;
			if (reversePosition >= filesize) {
				return { buffer: Buffer.alloc(0), bytesRead: 0 };
			}
			const length = Math.min(
				options.length ?? options.buffer?.length ?? 1024,
				filesize - reversePosition
			);
			const position = filesize - (options.position ?? 0) - length;
			const buffer = options.buffer ?? Buffer.alloc(length);

			const { bytesRead } = await handle.read({ position, length, buffer });

			for (let i = 0; i < bytesRead / 2; i++) {
				const tmp = buffer[i];
				buffer[i] = buffer[bytesRead - i - 1];
				buffer[bytesRead - i - 1] = tmp;
			}

			return { buffer, bytesRead };
		} finally {
			free();
		}
	}

	readFile(fileName: string): Promise<Buffer> {
		return readFile(this.fullPath(fileName));
	}

	async write(fileName: string, contents: Buffer): Promise<void> {
		await writeFile(this.fullPath(fileName), contents);
	}

	async append(fileName: string, contents: Buffer): Promise<void> {
		const { handle, free } = await this.open(fileName, "a");
		try {
			return await handle.appendFile(contents);
		} finally {
			free();
		}
	}

	async remove(fileName: string): Promise<void> {
		await rm(this.fullPath(fileName));
	}

	createReadStream(
		path: string,
		options?: { start?: number; end?: number }
	): Readable {
		return fs.createReadStream(this.fullPath(path), options);
	}

	createWriteStream(path: string): Writable {
		return fs.createWriteStream(this.fullPath(path));
	}

	/**
	 * Returns a readable stream that emits data in reverse order. The `start` and `end` options are also reversed,
	 * meaning that a `start` value of 0 will begin reading from the end of the file.
	 */
	createReverseReadStream(
		path: string,
		options: { highWaterMark?: number; start?: number; end?: number } = {}
	): Readable {
		let position = 0;

		const readReverse = (buffer: Buffer) =>
			this.readReverse(path, { buffer, position });

		// Implementing the stream with "simplified construction"
		// https://nodejs.org/docs/latest-v16.x/api/stream.html#simplified-construction
		// https://nodejs.org/en/docs/guides/backpressuring-in-streams/#rules-specific-to-readable-streams
		return new Readable({
			highWaterMark: options.highWaterMark,
			async read(size) {
				const { buffer, bytesRead } = await readReverse(Buffer.alloc(size));
				position += bytesRead;

				if (bytesRead === 0) return this.push(null);

				// Shrink the buffer in case fewer bytes than available space in the buffer were read
				if (bytesRead !== buffer.length) {
					return this.push(buffer.subarray(0, bytesRead));
				}

				this.push(buffer);
			},
		});
	}

	async size(fileName: string) {
		return (await stat(this.fullPath(fileName))).size;
	}

	private async open(
		path: string,
		flags = "r"
	): Promise<{ handle: FileHandle; free: () => void }> {
		path = this.fullPath(path);
		let reusableFileHandle = this.fileHandles.get(path);
		if (!reusableFileHandle || reusableFileHandle.flags !== flags) {
			reusableFileHandle = new ReusableFileHandle(path, 1000, flags);
			this.fileHandles.set(path, reusableFileHandle);
		}

		return reusableFileHandle.getFileHandle();
	}

	public fullPath(fileName: string) {
		return `${this.directory}/${fileName}`;
	}

	async rename(oldFileName: string, newFileName: string): Promise<void> {
		await rename(this.fullPath(oldFileName), this.fullPath(newFileName));
	}
}
