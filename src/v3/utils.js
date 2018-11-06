import { walk } from 'estree-walker';

export function find_declarations(body, declarations) {
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

export function error(message, pos) {
	const e = new Error(message);
	e.pos = pos;

	// TODO add code frame

	throw e;
}