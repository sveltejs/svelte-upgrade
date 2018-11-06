import { walk } from 'estree-walker';
import is_reference from 'is-reference';
import { create_scopes } from './scopes.js';

export default function rewrite_computed(node, info, template_scope) {
	let { map, scope } = create_scopes(node);

	walk(node, {
		enter(node, parent) {
			if (map.has(node)) {
				scope = map.get(node);
			}

			if (is_reference(node, parent)) {
				if (!scope.has(node.name) && info.computed.has(node.name)) {
					info.code.appendLeft(node.end, '()');
				}
			}
		},

		leave(node) {
			if (map.has(node)) {
				scope = scope.parent;
			}
		}
	});
}