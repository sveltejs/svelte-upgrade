import rewrite_this from './shared/rewrite_this.js';

export default function handle_onstate_onupdate(node, info, name) {
	const { code, blocks, imported_functions, indent, indent_regex } = info;

	imported_functions.add(name);

	if (node.type === 'FunctionExpression') {
		rewrite_this(node.body, info);

		const body = code.slice(node.body.start, node.body.end)
			.replace(indent_regex, '');

		blocks.push(`// [svelte-upgrade warning]\n${indent}// beforeUpdate and afterUpdate handlers behave\n${indent}// differently to their v2 counterparts\n${indent}${name}(${node.async ? `async ` : ``}() => ${body});`);
	}

	else {
		const body = code.slice(node.start, node.end).replace(indent_regex, '');
		blocks.push(`${name}(${body});`);
	}

	info.manual_edits_required = true;
}