import rewrite_this from './shared/rewrite_this.js';

export default function handle_oncreate_ondestroy(node, info, name) {
	const { code, blocks, lifecycle_functions, indent_regex } = info;

	lifecycle_functions.add(name);

	if (node.type === 'FunctionExpression') {
		rewrite_this(node.body, info);

		const body = code.slice(node.body.start, node.body.end).replace(indent_regex, '');
		blocks.push(`${name}(${node.async ? `async ` : ``}() => ${body});`);
	}

	else {
		throw new Error(`TODO non-function-expression ${name}`);
	}
}