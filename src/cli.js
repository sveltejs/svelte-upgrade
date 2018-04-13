import fs from 'fs';
import path from 'path';
import sade from 'sade';
import glob from 'glob';
import prompts from 'prompts';
import * as clorox from 'clorox';
import * as pkg from '../package.json';

const prog = sade('svelte-upgrade').version(pkg.version);

function mkdirp(dir) {
	const parent = path.dirname(dir);
	if (parent !== dir) mkdirp(parent);

	try {
		fs.mkdirSync(dir);
	} catch (err) {
		// noop
	}
}

prog.command(`v2 <input>`)
	.describe(`upgrade <input> file/directory to v2 syntax`)
	.option(`-o, --output`, `Write new files, instead of overwriting input files`)
	.option(`-f, --force`, `Don't ask before overwriting files`)
	.example(`v2 MyComponent.html`)
	.example(`v2 MyComponent.html -o My-Component.v2.html`)
	.example(`v2 src`)
	.action(async (input, opts) => {
		try {
			const stats = fs.statSync(input);

			const upgrade = await import('./index.js');

			let output = input;

			if (stats.isDirectory()) {
				const files = glob.sync('**/*.+(html|svelte)', { cwd: input });
				input = files.map(file => path.join(input, file));
				output = files.map(file => path.join(output, file));
			} else {
				input = [input];
				output = [output];
			}

			if (!opts.force) {
				const existing = output.filter(file => fs.existsSync(file));
				if (existing.length > 0) {
					console.error(`${clorox.cyan(`This will overwrite the following files:`)}`);
					console.error(`${clorox.gray(existing.join('\n'))}`)

					const response = await prompts({
						type: 'confirm',
						name: 'value',
						message: `Overwrite ${existing.length} ${existing.length === 1 ? 'file' : 'files'}?`,
						initial: true
					});

					if (response.value === false) {
						console.error(`${clorox.cyan('Aborted')}`);
						return;
					}
				}
			}

			input.forEach((src, i) => {
				const dest = output[i];
				const upgraded = upgrade.upgradeTemplate(fs.readFileSync(src, 'utf-8'));
				
				mkdirp(path.dirname(dest));
				fs.writeFileSync(dest, upgraded);
			});

			console.error(`${clorox.cyan(`Wrote ${output.length} ${output.length === 1 ? 'file' : 'files'}`)}`)
		} catch (err) {
			console.error(`${clorox.red(err.message)}`);
		}
	});

prog.parse(process.argv);