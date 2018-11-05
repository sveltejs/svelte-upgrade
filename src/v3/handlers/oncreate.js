export default function handle_oncreate(node, info) {
	const { code, blocks, indent_regex } = info;

	if (node.type === 'FunctionExpression') {
		const body = code.slice(node.body.start, node.body.end).replace(indent_regex, '');
		blocks.push(`onmount(() => ${body});`);
	}

	else {
		throw new Error(`TODO non-function-expression oncreate`);
	}
}