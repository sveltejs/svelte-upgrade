import * as svelte from 'svelte';
import MagicString from 'magic-string';
import { walk, childKeys } from 'estree-walker';
import handle_components from './handlers/components.js';
import handle_data from './handlers/data.js';
import handle_methods from './handlers/methods.js';
import handle_oncreate from './handlers/oncreate.js';
import handle_event_handler from './handlers/event_handler';
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

	let tag;
	let namespace;
	let script_sections = [];

	const props = new Map();
	result.stats.props.forEach(prop => {
		props.set(prop, 'undefined');
	});

	const info = {
		code,
		lifecycle_functions: new Set(),
		props,
		blocks: [],
		imports: [],
		methods: new Set(),
		declarations: new Set(),
		indent,
		indent_regex: new RegExp(`^${indent}`, 'gm'),
		uses_this: false,
		uses_dispatch: false,
		uses_this_properties: new Set()
	};

	if (result.ast.js) {
		const { body } = result.ast.js.content;

		const default_export = body.find(node => node.type === 'ExportDefaultDeclaration');
		find_declarations(body, info.declarations);

		if (default_export) {
			// TODO set up indentExclusionRanges

			default_export.declaration.properties.forEach(prop => {
				if (prop.key.name === 'methods') {
					prop.value.properties.forEach(method => {
						info.methods.add(method.key.name);
					});
				}
			});

			default_export.declaration.properties.forEach(prop => {
				switch (prop.key.name) {
					case 'components':
						handle_components(prop.value, info);
						break;

					case 'data':
						handle_data(prop.value, info);
						break;

					case 'methods':
						handle_methods(prop.value, info);
						break;

					case 'oncreate': case 'onrender':
						handle_oncreate(prop.value, info, 'onmount');
						break;

					case 'ondestroy': case 'onteardown':
						handle_oncreate(prop.value, info, 'ondestroy');
						break;

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

			let prop_declarations = [];
			for (const [key, value] of props) {
				if (key === value) continue;
				prop_declarations.push(`export let ${key}${value === 'undefined' ? '' : ` = ${value}`};`);
			}

			if (prop_declarations.length > 0) info.blocks.push(prop_declarations.join(`\n${indent}`));

			code.overwrite(default_export.start, default_export.end, info.blocks.join(`\n\n${indent}`));
		}

		code.appendLeft(result.ast.js.end, '\n\n');

		const needs_script = (
			info.blocks.length > 0 ||
			!!body.find(node => node !== default_export)
		);

		if (needs_script) {
			if (info.blocks.length === 0 && default_export) {
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

			if (result.ast.js.start !== 0) {
				code.move(result.ast.js.start, result.ast.js.end, 0);
			}

			if (info.lifecycle_functions.size > 0) {
				const specifiers = Array.from(info.lifecycle_functions).sort().join(', ');
				info.imports.unshift(`import { ${specifiers} } from 'svelte';`);
			}

			if (info.uses_this) {
				script_sections.unshift(`// [svelte-upgrade suggestion]\n${indent}// manually refactor all references to __this\n${indent}const __this = {};`);
			}

			if (info.imports.length) {
				script_sections.unshift(`${info.imports.join(`\n${indent}`)}`);
			}
		}

		code.remove(result.ast.js.start, result.ast.js.end);
	}

	walk(result.ast.html, {
		enter(node, parent) {
			switch (node.type) {
				case 'EventHandler':
					handle_event_handler(node, info, parent);
					break;
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