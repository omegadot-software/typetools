const fs = require("fs");

const config = {
	root: true,
	reportUnusedDisableDirectives: true,
	parserOptions: {
		tsConfigRootDir: __dirname,
		project: ["./tsconfig.json"],
	},
	env: {
		browser: true,
		node: true,
		es6: true,
		"jest/globals": true,
	},
	ignorePatterns: [
		// build and node_modules ignored by default, no need to include them here
		"cypress/cypress-examples/*.js",
		"src/parser/parser.ts",
		// Cypress snapshots (generated file)
		"snapshots.js",
		"**/node_modules/",
		"**/dist/",
	],
	plugins: ["@typescript-eslint", "prettier", "jest", "import"],
	extends: [
		"eslint:recommended",
		"plugin:@typescript-eslint/eslint-recommended",
		"plugin:@typescript-eslint/recommended",
		// Linting with type information https://github.com/typescript-eslint/typescript-eslint/blob/master/docs/getting-started/linting/TYPED_LINTING.md
		"plugin:@typescript-eslint/recommended-requiring-type-checking",
		"plugin:jest/recommended",
		"plugin:jest/style",
		"plugin:import/typescript",
		// Enables eslint-plugin-prettier and eslint-config-prettier. This will display prettier errors
		// as ESLint errors. Make sure this is always the last configuration in the extends array.
		"plugin:prettier/recommended",
	],
	overrides: [
		{
			files: ["scripts/*.js"],
			rules: {
				// Ok to print to console in scripts
				"no-console": "off",
			},
		},
		{
			files: ["*.js"],
			rules: {
				// Avoid false positives in js files
				"@typescript-eslint/restrict-template-expressions": "off",
				"@typescript-eslint/no-unsafe-assignment": "off",
				"@typescript-eslint/no-unsafe-return": "off",
				"@typescript-eslint/no-unsafe-member-access": "off",
				"@typescript-eslint/no-unsafe-call": "off",
			},
		},
		{
			files: ["*.tsx"],
			rules: {
				"class-methods-use-this": "off",
			},
		},
		{
			files: ["*.ts", "*.tsx"],
			rules: {
				"import/first": "error",
				"import/order": [
					"error",
					{
						alphabetize: { order: "asc" },
						groups: ["builtin", "external", ["sibling", "parent"]],
						"newlines-between": "always",
					},
				],
			},
		},
	],
	rules: {
		"class-methods-use-this": "error",
		// Doesn't work with cypress tests
		"jest/expect-expect": "off",
		"prefer-template": "error",
		"no-console": "error",
		"no-return-assign": "error",
		"no-useless-constructor": "off", // ESLint rule needs to be turned off to use the typescript specific one below
		"@typescript-eslint/consistent-type-assertions": ["error", { assertionStyle: "never" }],
		"@typescript-eslint/consistent-type-definitions": ["error", "interface"],
		"@typescript-eslint/explicit-function-return-type": "off",
		"@typescript-eslint/explicit-module-boundary-types": "off",
		"@typescript-eslint/naming-convention": [
			"error",
			{
				selector: "interface",
				format: ["PascalCase"],
				prefix: ["I"],
			},
			{
				selector: "typeParameter",
				format: ["PascalCase"],
				prefix: ["T", "U", "V", "W", "K"],
			},
		],
		"@typescript-eslint/no-empty-function": "off",
		"@typescript-eslint/no-empty-interface": "off",
		"@typescript-eslint/no-explicit-any": "off",
		"@typescript-eslint/no-floating-promises": "error",
		"@typescript-eslint/no-namespace": ["error", { allowDeclarations: true }],
		"@typescript-eslint/no-unnecessary-type-assertion": "off",
		"@typescript-eslint/no-use-before-define": "off",
		"@typescript-eslint/no-useless-constructor": "error",
		"@typescript-eslint/no-unused-vars": "error",
		"@typescript-eslint/no-var-requires": "off",
		"@typescript-eslint/prefer-as-const": "error",
		"@typescript-eslint/prefer-for-of": "error",
		"@typescript-eslint/prefer-nullish-coalescing": "error",
		"@typescript-eslint/prefer-optional-chain": "error",
		"@typescript-eslint/restrict-template-expressions": [
			"error",
			{
				allowNumber: true,
				allowBoolean: true,
				allowNullable: true,
			},
		],
		"@typescript-eslint/return-await": "error",
		"@typescript-eslint/strict-boolean-expressions": [
			"error",
			{
				allowNullableBoolean: true,
				allowNullableString: true,
			},
		],
		"@typescript-eslint/unified-signatures": "error",
		"react/prop-types": "off",
	},
};

function filterExistingPaths(paths) {
	return paths.filter((path) => fs.existsSync(path));
}

config.parserOptions.project = filterExistingPaths(config.parserOptions.project);

module.exports = config;
