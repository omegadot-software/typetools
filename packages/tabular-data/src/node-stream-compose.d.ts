import { Duplex, Stream } from "stream";

declare module "stream" {
	export function compose(
		...streams: (Stream | Iterable<any> | AsyncIterable<any> | Function)[]
	): Duplex;
}
