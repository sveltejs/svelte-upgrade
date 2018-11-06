import { walk } from 'estree-walker';
import rewrite_set from './rewrite_set';

// TODO rename this function, it does more than rewrite `this`
export default function rewrite_this(node, info, is_event_handler, replacement = '__this') {
	const { code, methods } = info;

	walk(node, {
		enter(child) {
			if (/^Function/.test(child.type)) {
				this.skip();
			}

			if (child.type === 'CallExpression') {
				if (is_set(child.callee, is_event_handler)) {
					rewrite_set(child, info);
				}

				// TODO optimise get
			}

			if (child.type === 'MemberExpression' && child.object.type === 'ThisExpression') {
				if (!child.property.computed) {
					if (methods.has(child.property.name)) {
						code.remove(child.object.start, child.property.start);
						this.skip();
					}

					else {
						switch (child.property.name) {
							case 'fire':
								info.uses_dispatch = true;
								code.overwrite(child.start, child.end, `dispatch`);
								break;

							default:
								code.overwrite(child.object.start, child.object.end, replacement);
						}

						info.uses_this = true;
						info.uses_this_properties.add(child.property.name);
					}
				}
			}
		}
	});
}

function is_this_property(node) {
	return (
		node.type === 'MemberExpression' &&
		node.object.type === 'ThisExpression'
	);
}

function is_set(callee, is_event_handler) {
	if (is_event_handler) {
		return callee.type === 'Identifier' && callee.name === 'set';
	}

	return (
		is_this_property(callee) &&
		callee.property.name === 'set' &&
		!callee.property.computed
	);
}