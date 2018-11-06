export default function handle_use_directive(node, info) {
	if (!node.expression) return;

	const { code } = info;

	code.appendLeft(node.expression.start, '{');
	code.prependRight(node.expression.end, '}');
}