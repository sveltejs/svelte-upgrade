import alias_registration from "./shared/alias_registration";

export default function handle_components(node, info) {
	const { blocks } = info;
	const statements = [];

	node.properties.forEach(component => {
		if (component.value.type === 'Literal') {
			statements.push(`import ${component.key.name} from '${component.value.value}';`);
		} else {
			alias_registration(component, info, statements, 'component');
		}
	});

	if (statements.length > 0) {
		blocks.push(statements.join('\n'));
	}
}