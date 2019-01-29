export default function wrap_with_curlies(node, info) {
	let { start, end } = node;
	while (/\s/.test(info.source[end - 1])) end -= 1;

	// disregard shorthand
	const match = /^(\w+):(\w+)/.exec(info.code.original.slice(start, end));
	if (start + match[0].length === end) return;

	const expression = node.expression || node.value;

	if (!expression) return;

	const { code } = info;

	end = expression.end;
	while (/\s/.test(info.source[end - 1])) end -= 1;

	code.appendLeft(expression.start, '{');
	code.prependRight(end, '}');
}