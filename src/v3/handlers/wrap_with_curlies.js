export default function wrap_with_curlies(node, info) {
	// disregard shorthand
	const match = /^(\w+):(\w+)/.exec(info.code.original.slice(node.start, node.end));
	if (node.start + match[0].length === node.end) return;

	const expression = node.expression || node.value;

	if (!expression) return;

	const { code } = info;

	code.appendLeft(expression.start, '{');
	code.prependRight(expression.end, '}');
}