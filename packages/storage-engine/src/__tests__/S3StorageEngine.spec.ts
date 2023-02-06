import * as dotenv from "dotenv";

import { storageEngineTestSuite } from "./storageEngineTestSuite";
import { S3StorageEngine } from "../S3StorageEngine";

if (process.env.NODE_ENV !== "production") {
	dotenv.config();
}

function env(key: string): string {
	const val = process.env[key];
	if (!val) {
		throw new Error(`Required environment variable "${key}" is not defined`);
	}
	return val;
}

describe("S3StorageEngine", () => {
	storageEngineTestSuite(
		"S3StorageEngine",
		() =>
			new S3StorageEngine({
				endpoint: env("S3_ENDPOINT"),
				region: env("S3_REGION"),
				accessKeyId: env("S3_ACCESS_KEY"),
				secretAccessKey: env("S3_SECRET_ACCESS_KEY"),
				bucket: env("S3_BUCKET"),
				prefix: "tests",
			})
	);
});
