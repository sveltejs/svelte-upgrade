export default function handleComponents(node, info) {
	const { declarations, blocks } = info;
	const statements = [];

	node.properties.forEach(component => {
		if (component.value.type === 'Literal') {
			statements.push(`import ${component.key.name} from '${component.value.value}';`);
		} else {
			if (component.value.name !== component.key.name) {
				if (declarations.has(component.key.name)) {
					error(`component name conflicts with existing declaration`, component.start);
				}

				statements.push(`const ${component.key.name} = ${component.value.name};`);
			}
		}
	});

	if (statements.length > 0) {
		blocks.push(statements.join('\n'));
	}
}