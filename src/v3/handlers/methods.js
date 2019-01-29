import rewrite_this from './shared/rewrite_this.js';
import add_declaration from './shared/add_declaration.js';

export default function handle_methods(node, info) {
	const { blocks, code, error, indent } = info;
	const statements = [];

	let suggested = false;

	node.properties.forEach(method => {
		if (method.value.type === 'FunctionExpression') {
			const { params, body } = method.value;

			rewrite_this(body, info);

			const str = code.slice(body.start, body.end)
				.replace(info.indent_regex, '')
				.replace(info.indent_regex, '');

			const args = params.length > 0
				? `(${code.slice(params[0].start, params[params.length - 1].end)})`
				: '()';

			const suggestion = suggested
				? ``
				: `// [svelte-upgrade suggestion]\n${info.indent}// review these functions and remove unnecessary 'export' keywords\n${info.indent}`;

			suggested = true;

			add_declaration(method.key, info);
			blocks.push(`${suggestion}export ${method.value.async ? `async ` : ``}function ${method.key.name}${args} ${str}`);
		} else if (method.value.type === 'Identifier') {
			throw new Error(`TODO identifier methods`);
		} else {
			error(`can only convert methods that are function expressions or references`, method);
		}
	});

	if (statements.length > 0) {
		blocks.push(`${statements.join(`\n${indent}`)}`);
	}

	info.manual_edits_suggested = true;
}