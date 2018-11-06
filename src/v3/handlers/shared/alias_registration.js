import { error } from '../../utils.js';

export default function alias_registration(node, info, statements, type) {
	if (node.value.name !== node.key.name) {
		if (info.declarations.has(node.key.name)) {
			error(`${type} name conflicts with existing declaration`, node.start);
		}

		statements.push(`const ${node.key.name} = ${node.value.name};`);
	}
}