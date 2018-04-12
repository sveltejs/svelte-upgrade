import * as fs from 'fs';
import { test } from 'tape-modern';
import { upgradeTemplate } from '../src/index';

fs.readdirSync('test/samples').forEach(dir => {
	if (dir[0] === '.') return;

	test(dir, t => {
		const source = fs.readFileSync(`test/samples/${dir}/input.html`, 'utf-8');
		const expected = fs.readFileSync(`test/samples/${dir}/output.html`, 'utf-8');

		const actual = upgradeTemplate(source);

		t.equal(actual, expected);
	});
});