export default function add_declaration(node, info) {
	if (info.declarations.has(node.name)) {
		info.error(`'${node.name}' conflicts with existing declaration`, node.start);
	}

	info.declarations.add(node.name);
}