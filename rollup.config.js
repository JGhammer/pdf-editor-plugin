import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import postcss from 'rollup-plugin-postcss';

const external = ['vue', 'react', 'react-dom', 'pdfjs-dist', 'pdf-lib', 'quill'];

const commonPlugins = [
  postcss({
    extract: 'style.css',
    minimize: true
  }),
  resolve(),
  commonjs(),
];

export default [
  {
    input: 'src/index.ts',
    output: [
      {
        file: 'dist/index.js',
        format: 'cjs',
        exports: 'named',
        sourcemap: true
      },
      {
        file: 'dist/index.esm.js',
        format: 'esm',
        exports: 'named',
        sourcemap: true
      }
    ],
    plugins: [
      ...commonPlugins,
      typescript({
        tsconfig: './tsconfig.json',
        declaration: true,
        declarationDir: 'dist',
        rootDir: 'src'
      })
    ],
    external
  },
  {
    input: 'src/vue3-entry.ts',
    output: [
      {
        file: 'dist/vue3.js',
        format: 'esm',
        sourcemap: true
      }
    ],
    plugins: [
      ...commonPlugins,
      typescript({
        tsconfig: './tsconfig.json',
        declaration: true,
        declarationDir: 'dist',
        rootDir: 'src'
      })
    ],
    external
  },
  {
    input: 'src/vue2-entry.ts',
    output: [
      {
        file: 'dist/vue2.js',
        format: 'esm',
        sourcemap: true
      }
    ],
    plugins: [
      ...commonPlugins,
      typescript({
        tsconfig: './tsconfig.json',
        declaration: true,
        declarationDir: 'dist',
        rootDir: 'src'
      })
    ],
    external
  },
  {
    input: 'src/react-entry.ts',
    output: [
      {
        file: 'dist/react.js',
        format: 'esm',
        sourcemap: true
      },
      {
        file: 'dist/react.cjs.js',
        format: 'cjs',
        exports: 'named',
        sourcemap: true
      }
    ],
    plugins: [
      ...commonPlugins,
      typescript({
        tsconfig: './tsconfig.json',
        declaration: true,
        declarationDir: 'dist',
        rootDir: 'src'
      })
    ],
    external
  }
];