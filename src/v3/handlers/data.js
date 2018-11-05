import { walk } from 'estree-walker';

export default function handle_data(node, props, code, blocks) {
	if (!/FunctionExpression/.test(node.type)) {
		error(`can only convert 'data' if it is a function expression or arrow function expression`, node.start);
	}

	let returned;

	if (node.body.type === 'BlockStatement') {
		walk(node.body, {
			enter(child, parent) {
				if (child.type === 'ReturnStatement') {
					if (parent !== node.body) {
						error(`can only convert data with a top-level return statement`, child.start);
					}

					if (returned) {
						error(`duplicate return statement`, child.start);
					}

					const index = node.body.body.indexOf(child);
					if (index !== 0) {
						throw new Error(`TODO handle statements before return`);
					}

					returned = child.argument;
				}
			}
		});

		if (!returned) {
			error(`missing return statement`, child.start);
		}
	} else {
		returned = node.body;
		while (returned.type === 'ParenthesizedExpression') returned = returned.expression;

		if (returned.type !== 'ObjectExpression') {
			error(`can only convert an object literal`, returned.start);
		}
	}

	returned.properties.forEach(prop => {
		props.set(prop.key.name, code.original.slice(prop.value.start, prop.value.end));
	});
}