import { extname } from "path";

import { TransformedSource } from "@jest/transform";
import { Loader, transformSync } from "esbuild";

// interface TransformerConfig {}

export default { process };

function process(
	sourceText: string,
	sourcePath: string
	// options: TransformOptions<TransformerConfig>
): TransformedSource {
	const { code, map } = transformSync(sourceText, {
		format: "cjs",
		loader: getLoader(sourcePath),
		sourcemap: "inline",
		sourcefile: sourcePath,
	});

	return {
		code,
		map,
	};
}

/**
 * Determines which esbuild loader to use based on the file name
 */
function getLoader(fileName: string): Loader {
	const fileExtension = extname(fileName);

	switch (fileExtension) {
		case ".js":
		case ".cjs":
		case ".mjs":
			return "js";
		case ".jsx":
			return "jsx";
		case ".ts":
		case ".mts":
		case ".cts":
			return "ts";
		case ".tsx":
			return "tsx";
		case ".json":
			return "json";
	}

	throw new Error(`Unknown file extension "${fileExtension}".`);
}
