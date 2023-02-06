import { Readable, Writable } from "stream";

export interface IReadOptions {
	buffer?: Buffer;
	position?: number;
	length?: number;
}

/**
 * Base class that describes basic io operations to files.
 *
 * A dedicated class (`StorageEngineRemoteAccess`) exists for providing efficient access to these files to remote users.
 */
export abstract class StorageEngine {
	abstract write(fileName: string, contents: Buffer): Promise<void>;

	// TODO: Implementations should be ready be able to handle several successive calls for similar
	// locations (i.e. as backing implementation for TabularDataStream)
	abstract read(
		path: string,
		options?: IReadOptions
	): Promise<{ bytesRead: number; buffer: Buffer }>;

	abstract remove(fileName: string): Promise<void>;

	abstract rename(oldFileName: string, newFileName: string): Promise<void>;

	abstract size(fileName: string): Promise<number>;

	/**
	 * options can include start and end values to read a range of bytes from the file instead of the entire file.
	 * Both start and end are inclusive and start counting at 0, allowed values are in the [0, Number.MAX_SAFE_INTEGER] range.
	 */
	abstract createReadStream(
		path: string,
		options?: { start?: number; end?: number }
	): Readable;

	/**
	 * Returns a writable stream, useful for writing large files.
	 *
	 * @param path - The path to be written to.
	 */
	abstract createWriteStream(path: string): Writable;

	/**
	 * Asynchronously reads the entire contents of a file.
	 *
	 * @deprecated
	 */
	abstract readFile(fileName: string): Promise<Buffer>;

	/**
	 * @deprecated - Use createReadStream instead
	 */
	readFileStream(path: string): Readable {
		return this.createReadStream(path);
	}
}
