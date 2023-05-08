import { Readable } from "@omegadot/streams";

/**
 * Utility function for assertions in the tests.
 */
export async function streamToString(
	stream: Readable<Buffer>
): Promise<string> {
	const buffer = await stream.concat();

	return buffer.toString("utf-8");
}
