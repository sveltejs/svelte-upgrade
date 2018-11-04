import fs from 'fs';
import path from 'path';
import sade from 'sade';
import glob from 'glob';
import prompts from 'prompts';
import tc from 'turbocolor';
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

[2, 3].forEach(v => {
	prog.command(`v${v} <input>`)
		.describe(`upgrade <input> file/directory to v${v} syntax`)
		.option(`-o, --output`, `Write new files, instead of overwriting input files`)
		.option(`-f, --force`, `Don't ask before overwriting files`)
		.example(`v${v} MyComponent.html`)
		.example(`v${v} MyComponent.html -o My-Component.v${v}.html`)
		.example(`v${v} src`)
		.action(async (input, opts) => {
			try {
				const stats = fs.statSync(input);

				const upgrade = v === 2
					? await import('./v2/index.js')
					: await import('./v3/index.js');

				let output = opts.output || input;

				if (stats.isDirectory()) {
					const files = glob.sync('**/*.+(html|htmlx|svelte)', { cwd: input });
					input = files.map(file => path.join(input, file));
					output = files.map(file => path.join(output, file));
				} else {
					input = [input];
					output = [output];
				}

				if (!opts.force) {
					const existing = output.filter(file => fs.existsSync(file));
					if (existing.length > 0) {
						console.error(tc.cyan(`This will overwrite the following files:`));
						console.error(tc.gray(existing.join('\n')))

						const response = await prompts({
							type: 'confirm',
							name: 'value',
							message: `Overwrite ${existing.length} ${existing.length === 1 ? 'file' : 'files'}?`,
							initial: true
						});

						if (response.value === false) {
							console.error(tc.cyan('Aborted'));
							return;
						}
					}
				}

				input.forEach((src, i) => {
					const dest = output[i];

					try {
						const upgraded = upgrade.upgradeTemplate(fs.readFileSync(src, 'utf-8'));

						mkdirp(path.dirname(dest));
						fs.writeFileSync(dest, upgraded);
					} catch (err) {
						console.error(tc.bold.red(`Error transforming ${src}:`));
						console.error(tc.red(err.message));

						if (err.frame) {
							console.error(err.frame);
						}
					}
				});

				console.error(tc.cyan(`Wrote ${output.length} ${output.length === 1 ? 'file' : 'files'}`))
			} catch (err) {
				console.error(tc.red(err.message));
			}
		});
});



prog.parse(process.argv);
