import { walk } from 'estree-walker';
import { extract_names } from './scopes';
import { locate } from 'locate-character';

export function find_declarations(body, declarations) {
	walk(body, {
		enter(node, parent) {
			if (node.type === 'ImportDeclaration') {
				node.specifiers.forEach(specifier => {
					declarations.add(specifier.local.name);
				});
			}

			else if (node.type === 'ClassDeclaration') {
				declarations.add(node.id.name);
			}

			else if (node.type === 'FunctionDeclaration') {
				declarations.add(node.id.name);
			}

			else if (node.type === 'VariableDeclaration') {
				node.declarations.forEach(declarator => {
					extract_names(declarator.id).forEach(name => {
						declarations.add(name);
					});
				});
			}
		}
	});

	return declarations;
}

function repeat(str, i) {
	let result = '';
	while (i--) result += str;
	return result;
}

function tabs_to_spaces(str) {
	return str.replace(/^\t+/, match => match.split('\t').join('  '));
}

export function get_code_frame(source, pos) {
	const { line, column } = locate(source, pos);

	const lines = source.split('\n');

	const frameStart = Math.max(0, line - 2);
	const frameEnd = Math.min(line + 3, lines.length);

	const digits = String(frameEnd + 1).length;

	return lines
		.slice(frameStart, frameEnd)
		.map((str, i) => {
			const isErrorLine = frameStart + i === line;

			let lineNum = String(i + frameStart + 1);
			while (lineNum.length < digits) lineNum = ` ${lineNum}`;

			if (isErrorLine) {
				const indicator =
					repeat(' ', digits + 2 + tabs_to_spaces(str.slice(0, column)).length) + '^';
				return `${lineNum}: ${tabs_to_spaces(str)}\n${indicator}`;
			}

			return `${lineNum}: ${tabs_to_spaces(str)}`;
		})
		.join('\n');
}