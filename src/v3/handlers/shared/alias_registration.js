import { error } from '../../utils.js';

export default function alias_registration(node, info, statements, type) {
	if (node.value.type === 'Identifier' && node.value.name === node.key.name) {
		return;
	}

	if (info.declarations.has(node.key.name)) {
		error(`${type} name conflicts with existing declaration`, node.start);
	}

	const rhs = info.code.slice(node.value.start, node.value.end);
	statements.push(`const ${node.key.name} = ${rhs};`);
}