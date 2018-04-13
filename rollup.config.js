import json from 'rollup-plugin-json';
import pkg from './package.json';

export default {
	input: ['src/index.js', 'src/cli.js'],
	output: {
		dir: 'dist',
		format: 'cjs'	
	},
	experimentalCodeSplitting: true,
	experimentalDynamicImport: true,
	external: Object.keys(pkg.dependencies),
	plugins: [
		json()
	]
};