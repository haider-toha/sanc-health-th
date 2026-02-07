import eslint from "@eslint/js"
import tseslint from "@typescript-eslint/eslint-plugin"
import tsparser from "@typescript-eslint/parser"
import importPlugin from "eslint-plugin-import"
import noInstanceof from "eslint-plugin-no-instanceof"
import unusedImports from "eslint-plugin-unused-imports"
import prettierConfig from "eslint-config-prettier"

export default [
    eslint.configs.recommended,
    prettierConfig,
    {
        files: ["**/*.ts"],
        languageOptions: {
            parser: tsparser,
            parserOptions: {
                ecmaVersion: 12,
                project: "./tsconfig.json",
                sourceType: "module"
            },
            globals: {
                console: "readonly",
                process: "readonly",
                __dirname: "readonly",
                __filename: "readonly",
                Buffer: "readonly",
                setTimeout: "readonly",
                clearTimeout: "readonly",
                setInterval: "readonly",
                clearInterval: "readonly"
            }
        },
        plugins: {
            "@typescript-eslint": tseslint,
            import: importPlugin,
            "no-instanceof": noInstanceof,
            "unused-imports": unusedImports
        },
        rules: {
            "no-unused-vars": "off", // Disable base rule
            "no-process-env": 0,
            "no-instanceof/no-instanceof": 2,
            "@typescript-eslint/explicit-module-boundary-types": 0,
            "@typescript-eslint/no-empty-function": 0,
            "@typescript-eslint/no-non-null-assertion": 0,
            "@typescript-eslint/no-shadow": 0,
            "@typescript-eslint/no-empty-interface": 0,
            "@typescript-eslint/no-use-before-define": ["error", "nofunc"],
            "@typescript-eslint/no-unused-vars": "off",
            "@typescript-eslint/no-floating-promises": "error",
            "@typescript-eslint/no-misused-promises": "error",
            "unused-imports/no-unused-imports": "error",
            "unused-imports/no-unused-vars": [
                "warn",
                {
                    vars: "all",
                    varsIgnorePattern: "^_",
                    args: "none", // Changed to ignore all unused args
                    argsIgnorePattern: "^_"
                }
            ],
            camelcase: 0,
            "class-methods-use-this": 0,
            "import/extensions": [2, "ignorePackages"],
            "import/no-extraneous-dependencies": ["error", { devDependencies: ["**/*.test.ts", "**/tests/**/*.ts"] }],
            "import/no-unresolved": 0,
            "import/prefer-default-export": 0,
            "keyword-spacing": "error",
            "max-classes-per-file": 0,
            "max-len": 0,
            "no-await-in-loop": 0,
            "no-bitwise": 0,
            "no-console": 0,
            "no-restricted-syntax": 0,
            "no-shadow": 0,
            "no-continue": 0,
            "no-underscore-dangle": 0,
            "no-use-before-define": 0,
            "no-useless-constructor": 0,
            "no-return-await": 0,
            "consistent-return": 0,
            "no-else-return": 0,
            "new-cap": ["error", { properties: false, capIsNew: false }]
        }
    },
    {
        ignores: [".eslintrc.cjs", "eslint.config.js", "scripts/**", "node_modules/**", "dist/**", "dist-cjs/**", "**/*.js", "**/*.cjs", "**/*.d.ts"]
    }
]
