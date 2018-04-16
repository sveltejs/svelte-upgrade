import * as svelte from 'svelte';
import MagicString from 'magic-string';
import { walk, childKeys } from 'estree-walker';

// We need to tell estree-walker that it should always
// look for an `else` block, otherwise it might get
// the wrong idea about the shape of each/if blocks
childKeys.EachBlock = childKeys.IfBlock = ['children', 'else'];
childKeys.Attribute = ['value'];

export function upgradeTemplate(source) {
	const code = new MagicString(source);
	const ast = svelte.parse(source);

	function trimStart(node) {
		let c = node.start;

		code.remove(c, c + 1);

		c = node.expression.end;
		while (source[c] !== '}') c += 1;
		code.remove(c, c + 1);
	}

	function trimEnd(node) {
		let c = node.end;

		code.remove(c - 1, c);

		while (source[c - 1] !== '{') c -= 1;
		code.remove(c - 1, c);
	}

	function trim(node) {
		trimStart(node);
		trimEnd(node);
	}

	walk(ast.html, {
		enter(node) {
			let a = node.start;
			let b = node.end;

			switch (node.type) {
				case 'MustacheTag':
					trimStart(node);
					break;

				case 'RawMustacheTag':
					code.overwrite(a + 1, node.expression.start, '@html ').remove(b - 2, b);
					break;

				case 'AwaitBlock':
					trim(node);

					if (node.pending.start !== null) {
						let c = node.then.start;
						code.overwrite(c + 1, c + 2, ':');

						while (source[c] !== '}') c += 1;
						code.remove(c, c + 1);
					}

					if (node.catch.start !== null) {
						let c = node.catch.start;
						code.overwrite(c + 1, c + 2, ':');

						while (source[c] !== '}') c += 1;
						code.remove(c, c + 1);
					}

					break;

				case 'IfBlock':
					if (!node.skip) trim(node);

					if (node.else) {
						let c = node.children[node.children.length - 1].end;
						while (source[c] !== '{') c += 1;
						code.overwrite(c + 1, c + 2, ':');

						if (node.else.children.length === 1 && node.else.children[0].type === 'IfBlock') {
							c = node.else.children[0].expression.end;
							node.else.children[0].skip = true;
						}

						while (source[c] !== '}') c += 1;
						code.remove(c, c + 1);
					}
					break;

				case 'EachBlock':
					trim(node);

					if (node.key) {
						let a = node.expression.end;
						while (source[a] !== '@') a += 1;
						code.overwrite(a, a + 1, `(${node.context}.`);

						while (!/\w/.test(source[a])) a += 1;
						while (/\w/.test(source[a])) a += 1;
						code.appendLeft(a, ')');
					}

					break;

				case 'Element':
				case 'Window':
				case 'Head':
					if (node.name === 'slot' && /{{\s*yield\s*}}/.test(source.slice(a, b))) {
						code.overwrite(a, b, '<slot></slot>');
					}

					else if (node.name[0] === ':') {
						const name = `svelte:${node.name[1].toLowerCase()}`;
						code.overwrite(a + 1, a + 3, name);

						while (source[b - 1] !== '<') b -= 1;
						if (source[b] === '/') {
							code.overwrite(b + 1, b + 3, name);
						}
					}

					if (node.name === ':Component') {
						a = node.expression.start;
						while (source[a - 1] !== '{') a -= 1;

						b = node.expression.end;
						while (source[b] !== '}') b += 1;

						const shouldQuote = /\s/.test(source.slice(a, b));
						if (shouldQuote) code.prependRight(a - 1, '"').appendLeft(b + 1, '"');
						code.prependRight(a - 1, 'this=')
					}

					break;

				case 'Text':
					let c = -1;
					while ((c = node.data.indexOf('{', c + 1)) !== -1) {
						code.overwrite(a + c, a + c + 1, '&#123;');
					}
					break;

				case 'Attribute':
					if (source[a] === ':') {
						code.overwrite(a, a + 1, '{').appendLeft(b, '}');
					}
					break;
			}
		},

		leave(node) {

		}
	});

	if (ast.js) {
		const defaultExport = ast.js.content.body.find(node => node.type === 'ExportDefaultDeclaration');
		if (defaultExport) {
			const computedProperties = defaultExport.declaration.properties.find(prop => prop.key.name === 'computed');
			if (computedProperties) {
				computedProperties.value.properties.forEach(prop => {
					const { params } = prop.value;

					if (prop.value.type === 'FunctionExpression') {
						let a = prop.value.start;
						if (!prop.method) a += 8;
						while (source[a] !== '(') a += 1;

						let b = params[0].start;
						code.overwrite(a, b, '({ ');

						a = b = params[params.length - 1].end;
						while (source[b] !== ')') b += 1;
						code.overwrite(a, b + 1, ' })');
					} else if (prop.value.type === 'ArrowFunctionExpression') {
						let a = prop.value.start;
						let b = params[0].start;

						if (a !== b) code.remove(a, b);
						code.prependRight(b, '({ ');

						a = b = params[params.length - 1].end;
						while (source[b] !== '=') b += 1;

						if (a !== b) code.remove(a, b);
						code.appendLeft(a, ' }) ');
					}
				});
			}
		}
	}

	return code.toString();
}