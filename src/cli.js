import fs from 'fs';
import path from 'path';
import sade from 'sade';
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
				path.join(in_dir, item),
				path.join(out_dir, item),
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
				console.log(1);
				const upgrade = v === 2
					? await import('./v2/index.js')
					: await import('./v3/index.js');
					console.log(2);

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

				const manual_edits_required = [];
				const manual_edits_suggested = [];
				const failed = [];

				tasks.forEach(({ input, output, source }) => {
					const relative = path.relative(process.cwd(), input);
					try {
						const result = upgrade.upgradeTemplate(source);

						const code = v === 2 ? result : result.code;

						if (code.trim() === source.trim()) {
							unchanged_count += 1;
						} else if (result.manual_edits_required) {
							manual_edits_required.push(relative);
						} else if (result.manual_edits_suggested) {
							manual_edits_suggested.push(relative);
						}

						// we still write, even if unchanged, since the output dir
						// could be different to the input dir
						mkdirp(path.dirname(output));
						fs.writeFileSync(output, code);
					} catch (error) {
						if (error.name === 'UpgradeError') {
							failed.push({ relative, error });
						} else {
							console.error(c.bold.red(`Error transforming ${relative}:`));
							console.error(c.red(error.message));
						}
					}
				});

				let message = `Wrote ${count(tasks.length)}`;

				if (unchanged_count > 0) {
					message += `. ${count(unchanged_count)} required no changes`;
				}

				console.error(c.cyan(message));

				if (failed.length > 0) {
					console.error(c.bold.red(`\nFailed to convert ${count(failed.length)}`));
					failed.forEach(failure => {
						console.error(c.bold.red(`\n${failure.error.message}`));
						console.error(failure.relative);

						if (failure.error.frame) {
							console.error(failure.error.frame);
						}
					});
				}

				if (manual_edits_required.length > 0) {
					console.error(c.bold.red(`\nManual edits required for ${count(manual_edits_required.length)}`));
					console.error(manual_edits_required.join('\n'));
				}

				if (manual_edits_suggested.length > 0) {
					console.error(c.bold.magenta(`\nManual edits suggested for ${count(manual_edits_suggested.length)}`));
					console.error(manual_edits_suggested.join('\n'));
				}
			} catch (err) {
				console.error(c.red(err.message));
			}
		});
});

function count(num) {
	return num === 1 ? `1 file` : `${num} files`;
}

prog.parse(process.argv);
