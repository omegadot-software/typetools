import { ErrorObject } from "ajv";

export function normalizeAJVError(e: ErrorObject) {
	const params = Object.keys(e.params)
		.map((param) => `${param}: ${(e.params as any)[param] as string}`)
		.join(", ");

	return new Error(
		`Configuration ${e.dataPath.length ? `field ${e.dataPath.slice(1)}` : ""} ${
			e.message
		} (${params})`
	);
}

export default normalizeAJVError;
