import fs from 'fs';
import path from 'path';
import sade from 'sade';
import glob from 'glob';
import prompts from 'prompts';
import c from 'kleur';
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

const valid_extensions = new Set([
	'.html',
	'.htmlx',
	'.svelte'
]);

function get_tasks(items, in_dir, out_dir, arr = []) {
	for (const item of items) {
		const stats = fs.statSync(item);

		if (stats.isDirectory()) {
			get_tasks(
				fs.readdirSync(item).map(file => path.resolve(item, file)),
				path.join(in_dir, file),
				path.join(out_dir, file),
				arr
			);
		} else {
			if (valid_extensions.has(path.extname(item))) {
				arr.push({
					input: item,
					output: item.replace(in_dir, out_dir),
					source: fs.readFileSync(item, 'utf-8')
				});
			}
		}
	}

	return arr;
}

[2, 3].forEach(v => {
	prog.command(`v${v} <input>`)
		.describe(`upgrade <input> file/directory to v${v} syntax`)
		.option(`-o, --output`, `Write new files, instead of overwriting input files`)
		.option(`-f, --force`, `Don't ask before overwriting files`)
		.example(`v${v} MyComponent.html`)
		.example(`v${v} MyComponent.html -o My-Component.v${v}.html`)
		.example(`v${v} src`)
		.action(async function(_, opts) {
			const tasks = get_tasks(
				[_].concat(opts._).map(file => path.resolve(file)),
				path.resolve('.'),
				path.resolve(opts.output || '.')
			);

			if (opts.output && path.extname(opts.output)) {
				// --output somefile.html
				if (tasks.length > 1) {
					console.error(c.bold.red(`--output must be a directory if more than one input is provided`));
				} else {
					// special case — file to file conversion
					tasks[0].output = path.resolve(opts.output);
				}
			}

			try {
				const upgrade = v === 2
					? await import('./v2/index.js')
					: await import('./v3/index.js');

				if (!opts.force) {
					const existing = tasks
						.filter(task => fs.existsSync(task.output))
						.map(task => path.relative(process.cwd(), task.output));

					if (existing.length > 0) {
						console.error(c.cyan(`This will overwrite the following files:`));
						console.error(c.gray(existing.join('\n')));

						const response = await prompts({
							type: 'confirm',
							name: 'value',
							message: `Overwrite ${existing.length} ${existing.length === 1 ? 'file' : 'files'}?`,
							initial: true
						});

						if (response.value === false) {
							console.error(c.cyan('Aborted'));
							return;
						}
					}
				}

				let unchanged_count = 0;

				tasks.forEach(({ input, output, source }) => {
					try {
						const result = upgrade.upgradeTemplate(source);

						if (result.trim() === source.trim()) {
							unchanged_count += 1;
						}

						// we still write, even if unchanged, since the output dir
						// could be different to the input dir
						mkdirp(path.dirname(output));
						fs.writeFileSync(output, result);
					} catch (error) {
						console.error(c.bold.red(`Error transforming ${input}:`));
						console.error(c.red(error.message));

						if (error.frame) {
							console.error(error.frame);
						}
					}
				});

				let message = `Wrote ${count(tasks.length)}`;

				if (unchanged_count > 0) {
					message += `. ${count(unchanged_count)} components required no changes`;
				}

				console.error(c.cyan(message));
			} catch (err) {
				console.error(c.red(err.message));
			}
		});
});

function count(num) {
	return num === 1 ? `1 file` : `${num} files`;
}

prog.parse(process.argv);
