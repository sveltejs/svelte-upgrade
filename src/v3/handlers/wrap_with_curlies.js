export default function wrap_with_curlies(node, info) {
	if (!node.expression) return;

	const { code } = info;

	code.appendLeft(node.expression.start, '{');
	code.prependRight(node.expression.end, '}');
}