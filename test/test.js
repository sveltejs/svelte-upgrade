import * as fs from 'fs';
import * as path from 'path';
import { test } from 'tape-modern';
import { v2, v3 } from '../src/index';

const args = process.argv.slice(2);

const versions = new Set(args.filter(x => /^v\d$/.test(x)));
if (versions.size === 0) {
	versions.add('v2');
	versions.add('v3');
}

const tests = new Set(args.filter(x => !/^v\d$/.test(x)));

function testVersion(v, upgrader) {
	fs.readdirSync(`test/v${v}/samples`).forEach(dir => {
		if (dir[0] === '.') return;

		if (tests.size && !tests.has(dir)) return;

		test(dir, t => {
			const source_file = `test/v${v}/samples/${dir}/input.html`;
			const output_file = `test/v${v}/samples/${dir}/output.html`;
			const error_file = `test/v${v}/samples/${dir}/error.js`;

			const source = fs.readFileSync(source_file, 'utf-8');

			let actual;
			let expected;

			try {
				actual = upgrader(source);
				if (v === 3) actual = actual.code;

				expected = fs.readFileSync(output_file, 'utf-8');
			} catch (err) {
				if (fs.existsSync(error_file)) {
					const expected_error = require(path.resolve(error_file));

					expected_error.frame = expected_error.frame
						.replace('\n', '')
						.replace(/^\t\t/gm, '');

					if (err.code !== 'ENOENT') {
						t.equal(serialize_error(err), serialize_error(expected_error));
						return;
					}
				} else {
					throw err;
				}
			}

			if (fs.existsSync(error_file)) {
				throw new Error(`expected an error, but got output instead`);
			}

			t.equal(actual, expected);
		});
	});
}

if (versions.has('v2')) testVersion(2, v2);
if (versions.has('v3')) testVersion(3, v3);

function serialize_error(err) {
	return JSON.stringify({
		message: err.message,
		pos: err.pos,
		frame: err.frame
	}, null, '  ');
}