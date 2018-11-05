import * as fs from 'fs';
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
			const source = fs.readFileSync(`test/v${v}/samples/${dir}/input.html`, 'utf-8');
			const expected = fs.readFileSync(`test/v${v}/samples/${dir}/output.html`, 'utf-8');

			const actual = upgrader(source);

			t.equal(actual, expected);
		});
	});
}

if (versions.has('v2')) testVersion(2, v2);
if (versions.has('v3')) testVersion(3, v3);