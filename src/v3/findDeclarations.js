import { walk } from 'estree-walker';

export function findDeclarations(body) {
	const declarations = new Set();

	walk(body, {
		enter(node, parent) {
			if (node.type === 'ImportDeclaration') {
				node.specifiers.forEach(specifier => {
					declarations.add(specifier.local.name);
				});
			}

			else if (node.type === 'ClassDeclaration') {

			}

			else if (node.type === 'FunctionDeclaration') {

			}

			else if (node.type === 'VariableDeclaration') {

			}
		}
	});

	return declarations;
}