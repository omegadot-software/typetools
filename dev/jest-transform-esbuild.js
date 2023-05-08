"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
	for (var name in all)
		__defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
	if ((from && typeof from === "object") || typeof from === "function") {
		for (let key of __getOwnPropNames(from))
			if (!__hasOwnProp.call(to, key) && key !== except)
				__defProp(to, key, {
					get: () => from[key],
					enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable,
				});
	}
	return to;
};
var __toCommonJS = (mod) =>
	__copyProps(__defProp({}, "__esModule", { value: true }), mod);
var jest_transform_esbuild_exports = {};
__export(jest_transform_esbuild_exports, {
	default: () => jest_transform_esbuild_default,
});
module.exports = __toCommonJS(jest_transform_esbuild_exports);
var import_path = require("path");
var import_esbuild = require("esbuild");
var jest_transform_esbuild_default = { process };
function process(sourceText, sourcePath) {
	const { code, map } = (0, import_esbuild.transformSync)(sourceText, {
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
function getLoader(fileName) {
	const fileExtension = (0, import_path.extname)(fileName);
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
