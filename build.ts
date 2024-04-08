import { build, BuildOptions } from "esbuild";

for (const pkg of [
	"assert",
	"fs",
	"streams",
	"storage-engine",
	"storage-engine-fs",
	"storage-engine-r2",
	"storage-engine-s3",
	"tabular-data",
]) {
	buildCJS(`packages/${pkg}`);
}

function buildCJS(packagePath: string) {
	const options: BuildOptions = {
		entryPoints: [`${packagePath}/dist/src/index.js`],
		bundle: true,
		sourcemap: true,
		platform: "node",
		// Excludes all dependencies from the bundle
		// https://esbuild.github.io/api/#packages
		packages: "external",
		outdir: `${packagePath}/dist/cjs`,
	};

	build(options).catch(() => {
		process.exit(1);
	});
}
