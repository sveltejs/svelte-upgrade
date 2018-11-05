import { error } from '../utils.js';

export default function handle_oncreate(node, code, blocks, indent_regex) {
	if (node.type === 'FunctionExpression') {
		const body = code.slice(node.body.start, node.body.end).replace(indent_regex, '');
		blocks.push(`onmount(() => ${body});`);
	}

	else {
		throw new Error(`TODO non-function-expression oncreate`);
	}
}