import { walk } from 'estree-walker';
import rewrite_set from './rewrite_set.js';
import rewrite_get from './rewrite_get.js';

// TODO rename this function, it does more than rewrite `this`
export default function rewrite_this(node, info, is_event_handler, replacement = '__this') {
	const { code, methods } = info;

	walk(node, {
		enter(child, parent) {
			if (/^Function/.test(child.type)) {
				this.skip();
			}

			if (child.type === 'VariableDeclarator') {
				if (child.init) {
					if (child.init.type === 'CallExpression') {
						if (is_method(child.init.callee, 'get')) {
							rewrite_get(child, parent, info);
							return this.skip();
						}
					}

					if (is_this_property(child.init) && child.init.property.name === 'refs') {
						throw new Error(`TODO handle 'const { ... } = this.refs'`);
					}
				}
			}

			else if (child.type === 'CallExpression') {
				if (is_method(child.callee, 'set', is_event_handler)) {
					rewrite_set(child, info);
					return this.skip();
				}

				// TODO optimise get
			}

			else if (is_this_property(child)) {
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
								return this.skip();

							default:
								code.overwrite(child.object.start, child.object.end, replacement);
						}

						info.uses_this = true;
						info.uses_this_properties.add(child.property.name);
					}
				}
			}

			else if (child.type === 'MemberExpression') {
				if (is_this_property(child.object) && child.object.property.name === 'refs') {
					if (child.property.computed) {
						throw new Error(`TODO handle standalone this.refs`);
					}

					code.remove(child.object.start, child.property.start);
					this.skip();
				}
			}
		}
	});
}

function is_this_property(node) {
	return (
		node.type === 'MemberExpression' &&
		node.object.type === 'ThisExpression' &&
		!node.property.computed
	);
}

function is_method(callee, name, is_event_handler) {
	if (is_event_handler) {
		return callee.type === 'Identifier' && callee.name === name;
	}

	return (
		is_this_property(callee) &&
		callee.property.name === name &&
		!callee.property.computed
	);
}