import { build, BuildOptions } from "esbuild";

for (const pkg of ["assert", "fs", "tabular-data"]) {
	buildCJS(`packages/${pkg}`);
}

function buildCJS(packagePath: string) {
	const options: BuildOptions = {
		entryPoints: [`${packagePath}/dist/src/index.js`],
		bundle: true,
		sourcemap: true,
		platform: "node",
		outdir: `${packagePath}/dist/cjs`,
	};

	build(options).catch(() => {
		process.exit(1);
	});
}
