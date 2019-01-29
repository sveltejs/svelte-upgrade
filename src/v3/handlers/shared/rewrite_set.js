export default function rewrite_set(node, info) {
	if (node.arguments.length !== 1) {
		info.error(`expected a single argument`, node.start);
	}

	if (node.arguments[0].type !== 'ObjectExpression') {
		info.error(`expected an object literal`, node.arguments[0].start);
	}

	const { properties } = node.arguments[0];

	const assignments = properties
		.map(prop => {
			// special case — `x: x + 1`
			const is_increment = (
				prop.value.type === 'BinaryExpression' &&
				prop.value.right.value === 1 &&
				/[-+]/.test(prop.value.operator)
			);

			if (is_increment) {
				return `${prop.key.name} ${prop.value.operator}= 1`;
			}

			return `${prop.key.name} = ${info.code.slice(prop.value.start, prop.value.end)}`;
		})
		.join(', ');

	info.code.overwrite(node.start, node.end, assignments);
}