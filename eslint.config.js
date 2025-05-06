// eslint.config.js
import eslintJs from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import eslintPluginReact from "eslint-plugin-react";
import eslintPluginReactHooks from "eslint-plugin-react-hooks";
import eslintPluginReactRefresh from "eslint-plugin-react-refresh";
import eslintPluginJsxA11y from "eslint-plugin-jsx-a11y";
import eslintPluginImport from "eslint-plugin-import"; // For import sorting and path resolution
// Optional: If you want ESLint to run Prettier as a rule (alternative to running Prettier separately)
// import eslintPluginPrettier from "eslint-plugin-prettier";
// import eslintConfigPrettier from "eslint-config-prettier"; // Turns off ESLint rules that conflict with Prettier

export default tseslint.config(
  // 1. Global ignores
  {
    ignores: [
      "dist/**", // More specific ignore for dist folder and its contents
      "build/**",
      "out/**",
      "node_modules/**",
      "coverage/**",
      "*.config.js", // Often ESLint config itself, Vite, Tailwind, PostCSS configs
      "*.config.ts", // if they are TypeScript
      "public/**", // If you have static assets you don't want to lint
      "supabase/functions/_shared/**", // Shared Deno code might need different linting
      "supabase/functions/**/index.ts", // Deno runtime for Supabase functions
                                        // may require slightly different rules or globals if linted here.
                                        // Or better, a separate ESLint config for Deno code.
      // Add other generated files or vendor directories
    ],
  },

  // 2. Base JavaScript and TypeScript configuration for all relevant files
  {
    files: ["**/*.{js,mjs,cjs,ts,tsx}"],
    extends: [
      eslintJs.configs.recommended,
      ...tseslint.configs.strictTypeChecked, // Stricter TypeScript rules with type checking
      ...tseslint.configs.stylisticTypeChecked, // Stylistic rules with type checking
    ],
    languageOptions: {
      ecmaVersion: "latest", // Use latest ECMAScript version
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node, // Add Node.js globals if you have scripts or backend code linted here
        ...globals.es2021, // Or a more recent ES version
      },
      parserOptions: {
        project: ["./tsconfig.json", "./tsconfig.node.json"], // Crucial for type-aware linting
        tsconfigRootDir: import.meta.dirname, // Ensures correct path resolution
      },
    },
    plugins: {
      import: eslintPluginImport,
    },
    rules: {
      // General good practices
      "no-console": ["warn", { allow: ["warn", "error", "info"] }], // Allow warn/error/info
      "no-unused-vars": "off", // Handled by @typescript-eslint/no-unused-vars
      "@typescript-eslint/no-unused-vars": [
        "warn", // Warn instead of 'off' or 'error' during development
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/explicit-function-return-type": "off", // Can be verbose, enable if team prefers
      "@typescript-eslint/no-explicit-any": "warn", // Warn on 'any' type
      "@typescript-eslint/no-floating-promises": "warn", // Catch unhandled promises
      "@typescript-eslint/consistent-type-imports": "warn", // Enforce consistent type import style

      // Import plugin rules
      "import/order": [
        "warn",
        {
          groups: ["builtin", "external", "internal", ["parent", "sibling", "index"]],
          pathGroups: [ { pattern: "@/**", group: "internal" } ],
          pathGroupsExcludedImportTypes: ["builtin"],
          "newlines-between": "always",
          alphabetize: { order: "asc", caseInsensitive: true },
        },
      ],
      "import/no-unresolved": "off", // TypeScript handles this with path aliases
      "import/prefer-default-export": "off", // Named exports are often preferred
      "import/no-duplicates": "warn",
    },
  },

  // 3. React specific configuration
  {
    files: ["**/*.{tsx,jsx}"], // Only for files using JSX
    plugins: {
      react: eslintPluginReact,
      "react-hooks": eslintPluginReactHooks,
      "react-refresh": eslintPluginReactRefresh,
      "jsx-a11y": eslintPluginJsxA11y,
    },
    settings: {
      react: {
        version: "detect", // Automatically detect React version
      },
    },
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      // React rules
      ...eslintPluginReact.configs.recommended.rules,
      ...eslintPluginReact.configs["jsx-runtime"].rules, // For new JSX transform
      "react/prop-types": "off", // Not needed with TypeScript
      "react/react-in-jsx-scope": "off", // Not needed with new JSX transform
      "react/jsx-props-no-spreading": "off", // Can be useful, but sometimes too restrictive

      // React Hooks rules
      ...eslintPluginReactHooks.configs.recommended.rules,

      // React Refresh rules
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true, allowExportNames: ["loader", "action"] }, // For Remix/React Router loaders/actions
      ],

      // JSX Accessibility rules
      ...eslintPluginJsxA11y.configs.recommended.rules,
      // Customize jsx-a11y rules as needed, e.g.:
      // "jsx-a11y/anchor-is-valid": ["warn", { "components": ["Link"], "specialLink": ["to"] }], // If using React Router Link
      // "jsx-a11y/label-has-associated-control": ["warn", { "labelComponents": ["CustomLabel"], "controlComponents": ["CustomInput"], "depth": 3 }],
    },
  },

  // 4. Optional: Configuration for test files (e.g., Vitest, Jest)
  {
    files: ["**/*.{test.ts,test.tsx,spec.ts,spec.tsx}"],
    // extends: [ ... ], // e.g., eslint-plugin-jest or eslint-plugin-vitest
    languageOptions: {
      globals: {
        // ...globals.jest, // Or globals.vitest
        // vi: 'readonly', // For Vitest
        // describe: 'readonly',
        // test: 'readonly',
        // expect: 'readonly',
        // beforeEach: 'readonly',
        // afterEach: 'readonly',
      },
    },
    rules: {
      // Relax some rules for test files if necessary
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-non-null-assertion": "off", // Often use '!' in tests
    },
  },

  // 5. Optional: Prettier integration
  // This section should be LAST in the array to override other formatting rules.
  // Make sure to install eslint-plugin-prettier and eslint-config-prettier
  // {
  //   extends: [eslintConfigPrettier], // Disables ESLint rules that conflict with Prettier
  //   plugins: {
  //     prettier: eslintPluginPrettier,
  //   },
  //   rules: {
  //     "prettier/prettier": "warn", // Runs Prettier as an ESLint rule and reports differences as warnings
  //   },
  // },
);
