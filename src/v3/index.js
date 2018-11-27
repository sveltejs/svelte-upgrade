import * as svelte from 'svelte';
import MagicString from 'magic-string';
import { walk, childKeys } from 'estree-walker';
import handle_components from './handlers/components.js';
import handle_computed from './handlers/computed.js';
import handle_data from './handlers/data.js';
import handle_methods from './handlers/methods.js';
import handle_oncreate_ondestroy from './handlers/oncreate_ondestroy.js';
import handle_on_directive from './handlers/on_directive';
import wrap_with_curlies from './handlers/wrap_with_curlies';
import handle_registrants from './handlers/shared/handle_registrants.js';
import handle_preload from './handlers/preload.js';
import handle_setup from './handlers/setup.js';
import handle_store from './handlers/store.js';
import { find_declarations, get_code_frame } from './utils.js';
import { extract_names } from './scopes.js';
import rewrite_computed from './rewrite_computed.js';
import handle_onstate_onupdate from './handlers/onstate_onupdate.js';
import add_declaration from './handlers/shared/add_declaration.js';

// We need to tell estree-walker that it should always
// look for an `else` block, otherwise it might get
// the wrong idea about the shape of each/if blocks
childKeys.EachBlock = childKeys.IfBlock = ['children', 'else'];
childKeys.Attribute = ['value'];

const global_whitelist = new Set([
	'Array',
	'Boolean',
	'console',
	'Date',
	'decodeURI',
	'decodeURIComponent',
	'encodeURI',
	'encodeURIComponent',
	'Infinity',
	'Intl',
	'isFinite',
	'isNaN',
	'JSON',
	'Map',
	'Math',
	'NaN',
	'Number',
	'Object',
	'parseFloat',
	'parseInt',
	'Promise',
	'RegExp',
	'Set',
	'String',
	'undefined',
]);

class UpgradeError extends Error {}

export function upgradeTemplate(source) {
	const code = new MagicString(source);
	const result = svelte.compile(source, {
		generate: false
	});

	const indent = code.getIndentString();

	let tag;
	let namespace;
	let immutable;
	let script_sections = [];

	const props = new Map();
	result.stats.props.forEach(prop => {
		if (!global_whitelist.has(prop) && prop[0] !== '$') {
			props.set(prop, 'undefined');
		}
	});

	const info = {
		source,
		code,
		imported_functions: new Set(),
		props,
		blocks: [],
		shared_blocks: [],
		imports: [],
		methods: new Set(),
		computed: new Set(),
		helpers: new Set(),
		declarations: new Set(),
		indent,
		indent_regex: new RegExp(`^${indent}`, 'gm'),
		uses_this: false,
		uses_dispatch: false,
		uses_this_properties: new Set(),

		manual_edits_required: false,
		manual_edits_suggested: false,

		error(message, pos) {
			const e = new UpgradeError(message);
			e.name = 'UpgradeError';
			e.pos = pos;
			e.frame = get_code_frame(source, pos);

			throw e;
		}
	};

	const body = result.ast.js && result.ast.js.content.body;
	const default_export = body && body.find(node => node.type === 'ExportDefaultDeclaration');

	if (body) find_declarations(body, info.declarations);

	if (default_export) {
		// TODO set up indentExclusionRanges

		default_export.declaration.properties.forEach(prop => {
			// TODO could these conflict with props?

			if (prop.key.name === 'methods') {
				prop.value.properties.forEach(node => {
					info.methods.add(node.key.name);
				});
			}

			if (prop.key.name === 'computed') {
				prop.value.properties.forEach(node => {
					info.computed.add(node.key.name);
				});
			}

			if (prop.key.name === 'helpers') {
				prop.value.properties.forEach(node => {
					info.helpers.add(node.key.name);
				});
			}
		});

		default_export.declaration.properties.forEach(prop => {
			switch (prop.key.name) {
				case 'actions':
					handle_registrants(prop.value.properties, info, 'action')
					break;

				case 'animations':
					handle_registrants(prop.value.properties, info, 'animation')
					break;

				case 'components':
					handle_components(prop.value, info);
					break;

				case 'computed':
					handle_computed(prop.value, info);
					break;

				case 'data':
					handle_data(prop.value, info);
					break;

				case 'events':
					handle_registrants(prop.value.properties, info, 'event');
					break;

				case 'helpers':
					handle_registrants(prop.value.properties, info, 'helper');
					break;

				case 'immutable':
					immutable = prop.value.value;
					break;

				case 'methods':
					handle_methods(prop.value, info);
					break;

					case 'oncreate': case 'onrender':
					handle_oncreate_ondestroy(prop.value, info, 'onmount');
					break;

				case 'ondestroy': case 'onteardown':
					handle_oncreate_ondestroy(prop.value, info, 'ondestroy');
					break;

				case 'onstate':
					handle_onstate_onupdate(prop.value, info, 'onprops');
					break;

				case 'onupdate':
					handle_onstate_onupdate(prop.value, info, 'onupdate');
					break;

				case 'preload':
					handle_preload(prop.value, info);
					break;

				case 'setup':
					handle_setup(prop, info);
					break;

				case 'store':
					handle_store(prop, info);
					break;

				case 'tag':
					tag = prop.value.value;
					break;

				case 'transitions':
					handle_registrants(prop.value.properties, info, 'transition')
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

		if (prop_declarations.length > 0) {
			info.blocks.unshift(prop_declarations.join(`\n${indent}`));
		}

		code.overwrite(default_export.start, default_export.end, info.blocks.join(`\n\n${indent}`));
	}

	let scope = new Set();
	const scopes = [scope];

	const refs = new Set();

	walk(result.ast.html, {
		enter(node, parent) {
			switch (node.type) {
				case 'EachBlock':
					scope = new Set(scope);
					extract_names(node.context).forEach(name => {
						scope.add(name);
					});
					scopes.push(scope);
					break;

				case 'ThenBlock':
					if (parent.value) {
						scope = new Set(scope);
						scope.add(parent.value);
						scopes.push(scope);
					}
					break;

				case 'CatchBlock':
					if (parent.error) {
						scope = new Set(scope);
						scope.add(parent.error);
						scopes.push(scope);
					}
					break;

				case 'EventHandler':
					handle_on_directive(node, info, parent);
					break;

				case 'Action':
				case 'Binding':
				case 'Class':
				case 'Transition':
					wrap_with_curlies(node, info, parent);
					break;

				case 'MustacheTag':
				case 'RawMustacheTag':
					// TODO also need to do this for expressions in blocks, attributes and directives
					rewrite_computed(node, info, scope);
					break;

				case 'Ref':
					if (!refs.has(node.name)) {
						refs.add(node.name);
						add_declaration(node, info);
					}
			}
		},

		leave(node) {
			if (node.type === 'EachBlock' || node.type === 'ThenBlock' || node.type === 'CatchBlock') {
				scopes.pop();
				scope = scopes[scopes.length - 1];
			}
		}
	});

	const needs_script = (
		info.uses_dispatch ||
		info.blocks.length > 0 ||
		(body && !!body.find(node => node !== default_export))
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

		if (info.uses_dispatch) {
			info.imported_functions.add('createEventDispatcher');
			script_sections.push(`const dispatch = createEventDispatcher();`);
		}

		if (refs.size > 0) {
			script_sections.push(Array.from(refs).map(name => `export let ${name};`).join(`\n${indent}`));
		}

		if (body) {
			const { start } = body[0];
			const { end } = body[body.length - 1];
			script_sections.push(code.slice(start, end));
		}

		if (info.imported_functions.size > 0) {
			const specifiers = Array.from(info.imported_functions).sort().join(', ');
			info.imports.unshift(`import { ${specifiers} } from 'svelte';`);
		}

		if (info.uses_this) {
			const this_props = [];

			if (info.uses_this_properties.has('get')) {
				const props = Array.from(info.props.keys());
				this_props.push(`get: () => ({ ${props.join(', ')} })`);
			}

			const rhs = this_props.length
				? `{\n${indent}${indent}${this_props.join(`\n${indent}${indent}`)}\n${indent}}`
				: `{}`;

			script_sections.unshift(`// [svelte-upgrade suggestion]\n${indent}// manually refactor all references to __this\n${indent}const __this = ${rhs};`);
			info.manual_edits_suggested = true;
		}

		if (info.imports.length) {
			script_sections.unshift(`${info.imports.join(`\n${indent}`)}`);
		}
	}

	if (result.ast.js) {
		code.remove(result.ast.js.start, result.ast.js.end);
	}

	let upgraded = code.toString().trim();

	if (script_sections.length > 0) {
		upgraded = `<script>\n${indent}${script_sections.join(`\n\n${indent}`)}\n</script>\n\n${upgraded}`;
	}

	if (info.shared_blocks.length > 0) {
		// scope="shared" is subject to change
		upgraded = `<script scope="shared">\n${indent}${info.shared_blocks.join(`\n\n${indent}`)}\n</script>\n\n${upgraded}`;
	}

	if (tag || namespace || immutable) { // TODO or bindings
		const attributes = [];
		if (tag) attributes.push(`tag="${tag}"`);
		if (namespace) attributes.push(`namespace="${namespace}"`);
		if (immutable) attributes.push(`immutable`);

		upgraded = `<svelte:meta ${attributes.join(' ')}/>\n\n${upgraded}`;
	}

	const eof_newline = /(\r?\n)?$/.exec(source)[1] || '';

	return {
		code: upgraded.trim() + eof_newline,
		manual_edits_required: info.manual_edits_required,
		manual_edits_suggested: info.manual_edits_suggested
	};
}