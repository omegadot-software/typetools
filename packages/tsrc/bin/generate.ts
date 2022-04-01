#!/usr/bin/env ts-node

import { relative, resolve } from "path";

import { mkdirp, readUTF8File, stat, writeFile } from "@omegadot/fs";
import program from "commander";
import { BaseError, Config, formatError } from "ts-json-schema-generator";
import { createGenerator } from "ts-json-schema-generator/dist/factory/generator";
import { VError } from "verror";

program
	.name("ts-runtime-checks")
	// .description('')
	// .version('1')
	.requiredOption("-d, --dir <string>", "Path to directory where types are located")
	.requiredOption(
		"-o, --outDir <string>",
		"Path to directory where generated files should be written"
	)
	.parse(process.argv);

if (program.args.length === 0) throw new Error("Must specify at least one type");

async function template(templateName: string) {
	const template = await readUTF8File([__dirname, "../templates", templateName]);
	return new Function("type", `return \`${template}\``) as (type: {
		name: string;
		relativePath: string;
	}) => string;
}

// Generate files for all types per default
const files: string[] = program.args //(program.args.length > 0 ? program.args : ['*'])
	// Convert type names to file names
	.map((file) => (file.endsWith(".ts") ? file : `${file}.ts`));

// The directory where the types are located (absolute path)
const typesDir = resolve(process.cwd(), program.dir);

// The directory where the generated files will be written to (absolute path)
const outDir = resolve(process.cwd(), program.outDir);

// Potential solution to hard coded path: find-up package
// const tsconfig = resolve(__dirname, "../../../config/tsconfig.json");

(async () => {
	const genAssert = await template("assert.txt");
	const genCast = await template("cast.txt");
	const genIs = await template("is.txt");
	const genValidate = await template("validate.txt");

	// Get directory entries and include only those with a .ts extension
	const typeList =
		// (await readdir(typesDir))
		// .filter(file => file.endsWith('.ts'))
		files.map((file) => {
			// Per convention, each file contains a type/interface of the same name.
			// The list of types for which runtime checks should be generated can thus be inferred from the list of
			// files without the file extension.
			const typeName = file.slice(0, -3);

			const path = resolve(typesDir, file);

			process.stdout.write(`Processing type "${typeName}"`);

			const config: Config = {
				path,
				type: typeName,
				expose: "export",
				jsDoc: "none",
				topRef: true,
				skipTypeCheck: true, // Faster
			};

			try {
				return {
					// Absolute path to the ts file
					path,
					// Path to the ts file containing the type relative to the generated file
					relativePath: relative(outDir, resolve(typesDir, typeName)),
					// Per convention, each file contains a type/interface of the same name.
					// The list of types for which runtime checks should be generated can thus be inferred from the list of
					// files without the file extension.
					name: typeName,
					schema: JSON.stringify(createGenerator(config).createSchema(typeName), null, 2),
				};
			} catch (error) {
				if (error instanceof BaseError) {
					process.stderr.write(formatError(error));
					process.exit(1);
				} else {
					throw error;
				}
			}
		});

	// Create output directory structure
	try {
		await mkdirp([outDir, "schema"]);
	} catch (e: any) {
		throw new VError(e, `Could not create output dir`);
	}

	await Promise.all([
		// Generate JSON schemas
		...typeList.map((type) =>
			writeFile([outDir, "schema", `${type.name}.schema.json`], type.schema)
		),
		// Generate assert functions
		...typeList.map((type) => writeFile([outDir, `assert${type.name}.ts`], genAssert(type))),
		// Generate cast functions
		...typeList.map((type) => writeFile([outDir, `cast${type.name}.ts`], genCast(type))),
		// Generate is functions
		...typeList.map((type) => writeFile([outDir, `is${type.name}.ts`], genIs(type))),

		// Generate validate functions.
		// Only generated if they do not already exist.
		...typeList.map(async (type) => {
			const outPath = resolve(outDir, `validate${type.name}.ts`);

			try {
				const fileStats = await stat(outPath);
				if (fileStats.isDirectory()) {
					// eslint-disable-next-line @typescript-eslint/return-await
					return Promise.reject(new Error(`"${outPath}" is a directory`));
				}
				return;
			} catch (e: any) {
				// Proceed with file generation if a file does not exist error is encountered.
				// Rethrow all other errors.
				if (typeof e.code !== "string" || e.code.indexOf("ENOENT") === -1) throw e;
			}

			return writeFile(outPath, genValidate(type));
		}),
	]);
})();
