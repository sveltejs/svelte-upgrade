import { walk } from 'estree-walker';
import is_reference from 'is-reference';

export function create_scopes(expression) {
	const map = new WeakMap();

	const globals = new Set();
	let scope = new Scope(null, false);

	walk(expression, {
		enter(node, parent) {
			if (/Function/.test(node.type)) {
				if (node.type === 'FunctionDeclaration') {
					scope.declarations.add(node.id.name);
				} else {
					scope = new Scope(scope, false);
					map.set(node, scope);
					if (node.id) scope.declarations.add(node.id.name);
				}

				node.params.forEach((param) => {
					extract_names(param).forEach(name => {
						scope.declarations.add(name);
					});
				});
			} else if (/For(?:In|Of)Statement/.test(node.type)) {
				scope = new Scope(scope, true);
				map.set(node, scope);
			} else if (node.type === 'BlockStatement') {
				scope = new Scope(scope, true);
				map.set(node, scope);
			} else if (/(Function|Class|Variable)Declaration/.test(node.type)) {
				scope.addDeclaration(node);
			} else if (is_reference(node, parent)) {
				if (!scope.has(node.name)) {
					globals.add(node.name);
				}
			}
		},

		leave(node) {
			if (map.has(node)) {
				scope = scope.parent;
			}
		},
	});

	return { map, scope, globals };
}

export class Scope {
	constructor(parent, block) {
		this.parent = parent;
		this.block = block;
		this.declarations = new Set();
	}

	addDeclaration(node) {
		if (node.kind === 'var' && !this.block && this.parent) {
			this.parent.addDeclaration(node);
		} else if (node.type === 'VariableDeclaration') {
			node.declarations.forEach((declarator) => {
				extract_names(declarator.id).forEach(name => {
					this.declarations.add(name);
				});
			});
		} else {
			this.declarations.add(node.id.name);
		}
	}

	has(name) {
		return (
			this.declarations.has(name) || (this.parent && this.parent.has(name))
		);
	}
}

export function extract_names(param) {
	const names = [];
	extractors[param.type](names, param);
	return names;
}

const extractors = {
	Identifier(names, param) {
		names.push(param.name);
	},

	ObjectPattern(names, param) {
		param.properties.forEach((prop) => {
			if (prop.type === 'RestElement') {
				names.push(prop.argument.name);
			} else {
				extractors[prop.value.type](names, prop.value);
			}
		});
	},

	ArrayPattern(names, param) {
		param.elements.forEach((element) => {
			if (element) extractors[element.type](names, element);
		});
	},

	RestElement(names, param) {
		extractors[param.argument.type](names, param.argument);
	},

	AssignmentPattern(names, param) {
		extractors[param.left.type](names, param.left);
	},
};
