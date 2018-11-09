import rewrite_this from './shared/rewrite_this.js';

export default function handle_onstate_onupdate(node, info, name) {
	const { code, blocks, lifecycle_functions, indent, indent_regex } = info;

	lifecycle_functions.add(name);

	if (node.type === 'FunctionExpression') {
		rewrite_this(node.body, info);

		const body = code.slice(node.body.start, node.body.end)
			.replace(indent_regex, '');

		blocks.push(`// [svelte-upgrade warning]\n${indent}// onprops and onupdate handlers behave\n${indent}// differently to their v2 counterparts\n${indent}${name}(${node.async ? `async ` : ``}() => ${body});`);
	}

	else {
		throw new Error(`TODO non-function-expression ${name}`);
	}

	info.manual_edits_required = true;
}