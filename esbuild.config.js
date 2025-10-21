import { build } from 'esbuild'
import { readFileSync, mkdirSync } from 'fs'

// Ensure dist directory exists
try {
  mkdirSync('./dist', { recursive: true })
} catch (err) {
  // Directory already exists
}

const shared = {
  entryPoints: ['src/index.js'],
  bundle: true,
  external: ['react'],
  minify: true,
  sourcemap: false
}

// ESM build
await build({
  ...shared,
  format: 'esm',
  outfile: 'dist/index.js'
})

// CJS build
await build({
  ...shared,
  format: 'cjs',
  outfile: 'dist/index.cjs'
})

// Print sizes
const esm = readFileSync('./dist/index.js')
const cjs = readFileSync('./dist/index.cjs')

console.log('\n✓ Build complete:')
console.log(`  ESM: ${esm.length} bytes`)
console.log(`  CJS: ${cjs.length} bytes`)

// Estimate gzip size (rough approximation)
const estimateGzip = (buffer) => Math.floor(buffer.length * 0.3)

console.log(`  ESM (gzipped ~): ${estimateGzip(esm)} bytes`)
console.log(`  CJS (gzipped ~): ${estimateGzip(cjs)} bytes\n`)
