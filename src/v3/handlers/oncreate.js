import { walk } from "estree-walker";

export default function handle_oncreate_ondestroy(node, info, name) {
	const { code, blocks, lifecycle_functions, indent_regex } = info;

	lifecycle_functions.add(name);

	if (node.type === 'FunctionExpression') {
		walk(node.body, {
			enter(child) {
				if (/^Function/.test(child.type)) {
					this.skip();
				}

				if (child.type === 'MemberExpression' && child.object.type === 'ThisExpression') {
					if (!child.property.computed) {
						if (info.methods.has(child.property.name)) {
							code.remove(child.object.start, child.property.start);
							this.skip();
						}

						else {
							switch (child.property.name) {
								case 'fire':
									info.uses_dispatch = true;
									code.overwrite(child.start, child.end, `dispatch`);
									break;

								case 'get':
									// TODO optimise get

								case 'set':
									// TODO optimise set

								default:
									code.overwrite(child.object.start, child.object.end, '__this');
							}

							info.uses_this = true;
							info.uses_this_properties.add(child.property.name);
						}
					}
				}
			}
		});

		const body = code.slice(node.body.start, node.body.end).replace(indent_regex, '');
		blocks.push(`${name}(${node.async ? `async ` : ``}() => ${body});`);
	}

	else {
		throw new Error(`TODO non-function-expression ${name}`);
	}
}