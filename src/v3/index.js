import * as svelte from 'svelte';
import MagicString from 'magic-string';
import { walk, childKeys } from 'estree-walker';
import handle_components from './handlers/components.js';
import handle_data from './handlers/data.js';
import handle_oncreate from './handlers/oncreate.js';
import { error, find_declarations } from './utils.js';

// We need to tell estree-walker that it should always
// look for an `else` block, otherwise it might get
// the wrong idea about the shape of each/if blocks
childKeys.EachBlock = childKeys.IfBlock = ['children', 'else'];
childKeys.Attribute = ['value'];

export function upgradeTemplate(source) {
	const code = new MagicString(source);
	const result = svelte.compile(source, {
		generate: false
	});

	const indent = code.getIndentString();
	const indent_regex = new RegExp(`^${indent}`, 'gm');

	let tag;
	let namespace;
	let script_sections = [];

	if (result.ast.js) {
		const { body } = result.ast.js.content;

		const default_values = new Map();
		result.stats.props.forEach(prop => {
			default_values.set(prop, undefined);
		});

		const lifecycle_functions = new Set();

		const blocks = [];
		const imports = [];
		const default_export = body.find(node => node.type === 'ExportDefaultDeclaration');

		const declarations = find_declarations(body);

		if (default_export) {
			// TODO set up indentExclusionRanges

			default_export.declaration.properties.forEach(prop => {
				switch (prop.key.name) {
					case 'components':
						handle_components(prop.value, declarations, blocks, imports);
						break;

					case 'data':
						handle_data(prop.value, default_values, code, blocks);
						break;

					case 'oncreate': case 'onrender':
						lifecycle_functions.add('onmount');
						handle_oncreate(prop.value, code, blocks, indent_regex);

					case 'tag':
						tag = prop.value.value;
						break;

					case 'namespace':
						namespace = prop.value.value;
						break;

					default:
						throw new Error(`Not implemented: ${prop.key.name}`);
				}
			});

			let props = [];
			for (const [key, value] of default_values) {
				if (key === value) continue;
				props.push(`export let ${key} = ${value};`)
			}

			if (props.length > 0) blocks.push(props.join(indent + '\n'));

			code.overwrite(default_export.start, default_export.end, blocks.join('\n\n'));
		}

		code.appendLeft(result.ast.js.end, '\n\n');

		const needs_script = (
			blocks.length > 0 ||
			!!body.find(node => node !== default_export)
		);

		if (needs_script) {
			if (blocks.length === 0 && default_export) {
				const index = body.indexOf(default_export);

				let a = default_export.start;
				let b = default_export.end;

				// need to remove whitespace around the default export
				if (index === 0) {
					throw new Error(`TODO remove default export from start`);
				} else if (index === body.length - 1) {
					while (/\s/.test(source[a - 1])) a -= 1;
				} else {
					throw new Error(`TODO remove default export from middle`);
				}

				code.remove(a, b);
			}

			const { start } = body[0];
			const { end } = body[body.length - 1];

			script_sections.push(code.slice(start, end));

			code.move(result.ast.js.start, result.ast.js.end, 0);

			if (lifecycle_functions.size > 0) {
				const specifiers = Array.from(lifecycle_functions).sort().join(', ');
				imports.unshift(`import { ${specifiers} } from 'svelte';`);
			}

			if (imports.length) {
				script_sections.unshift(`${imports.join(indent + `\n`)}`);
			}
		}

		code.remove(result.ast.js.start, result.ast.js.end);
	}

	walk(result.ast.html, {
		enter(node) {
			let a = node.start;
			let b = node.end;

			switch (node.type) {

			}
		}
	});

	let upgraded = code.toString().trim();

	if (script_sections.length > 0) {
		upgraded = `<script>\n${indent}${script_sections.join(`\n\n${indent}`)}\n</script>\n\n${upgraded}`;
	}

	if (tag || namespace) { // TODO or bindings
		const attributes = [];
		if (tag) attributes.push(`tag="${tag}"`);
		if (namespace) attributes.push(`namespace="${namespace}"`);

		upgraded = `<svelte:meta ${attributes.join(' ')}/>\n\n${upgraded}`;
	}

	return upgraded;
}