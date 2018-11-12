import rewrite_this from './rewrite_this.js';
import alias_registration from './alias_registration.js';
import add_declaration from './add_declaration.js';

export default function handle_registrants(registrants, info, type) {
	const { blocks, code, indent } = info;
	const statements = [];

	registrants.forEach(registrant => {
		const { key, value } = registrant;

		if (value.type === 'FunctionExpression') {
			const { params, body } = value;

			rewrite_this(body, info);

			const str = code.slice(body.start, body.end)
				.replace(info.indent_regex, '')
				.replace(info.indent_regex, '');

			const args = params.length > 0
				? `(${code.slice(params[0].start, params[params.length - 1].end)})`
				: '()';

			add_declaration(key, info);
			blocks.push(`function ${key.name}${args} ${str}`);
		} else if (value.type === 'Identifier') {
			alias_registration(registrant, info, statements, type);
		} else {
			const str = code.slice(value.start, value.end)
				.replace(info.indent_regex, '')
				.replace(info.indent_regex, '');

			blocks.push(`const ${key.name} = ${str};`);
		}
	});

	if (statements.length > 0) {
		blocks.push(`${statements.join(`\n${indent}`)}`);
	}
}