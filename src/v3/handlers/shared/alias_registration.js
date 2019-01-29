import add_declaration from './add_declaration.js';

export default function alias_registration(node, info, statements, type) {
	if (node.value.type === 'Identifier' && node.value.name === node.key.name) {
		return;
	}

	add_declaration(node.key, info);

	const rhs = info.code.slice(node.value.start, node.value.end);
	statements.push(`const ${node.key.name} = ${rhs};`);
}