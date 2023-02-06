import { mkdirTmp } from "@omegadot/fs";

import { storageEngineTestSuite } from "./storageEngineTestSuite";
import { FileSystemStorageEngine } from "../FileSystemStorageEngine";

describe("FileSystemStorageEngine", () => {
	storageEngineTestSuite(
		"FileSystemStorageEngine",
		async () => new FileSystemStorageEngine(await mkdirTmp())
	);
});
