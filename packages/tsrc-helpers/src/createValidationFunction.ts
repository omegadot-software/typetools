import Ajv from "ajv";
import draft06 from "ajv/lib/refs/json-schema-draft-06.json";

import normalizeAJVError from "./normalizeAJVError";

export interface IValidateFn {
	(obj: object): Error[];
}

export function createValidationFunction(schema: object): IValidateFn {
	const ajv = new Ajv();

	// Migration guide to using draft-04 schemas:
	// https://github.com/epoberezkin/ajv/releases/tag/5.0.0
	// ajv.addMetaSchema(draft04);
	ajv.addMetaSchema(draft06);

	const validateSchema = ajv.compile(schema);

	return function validate(obj: object) {
		// eslint-disable-next-line @typescript-eslint/no-floating-promises
		validateSchema(obj);
		if (!validateSchema.errors) return [];
		return validateSchema.errors.map(normalizeAJVError);
	};
}
