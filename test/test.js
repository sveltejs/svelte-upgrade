import * as fs from 'fs';
import { test } from 'tape-modern';
import { v2, v3 } from '../src/index';

function testVersion(v, upgrader) {
	fs.readdirSync(`test/v${v}/samples`).forEach(dir => {
		if (dir[0] === '.') return;

		test(dir, t => {
			const source = fs.readFileSync(`test/v${v}/samples/${dir}/input.html`, 'utf-8');
			const expected = fs.readFileSync(`test/v${v}/samples/${dir}/output.html`, 'utf-8');

			const actual = upgrader(source);

			t.equal(actual, expected);
		});
	});
}

testVersion(2, v2);
testVersion(3, v3);