import { error } from '../../utils.js';
import rewrite_this from './rewrite_this.js';
import alias_registration from './alias_registration.js';

export default function handle_registrants(registrants, info, type) {
	const { blocks, code } = info;
	const statements = [];

	registrants.forEach(registrant => {
		if (registrant.value.type === 'FunctionExpression') {
			const { params, body } = registrant.value;

			rewrite_this(body, info);

			const str = code.slice(body.start, body.end)
				.replace(info.indent_regex, '')
				.replace(info.indent_regex, '');

			const args = params.length > 0
				? `(${code.slice(params[0].start, params[params.length - 1].end)})`
				: '()';

			blocks.push(`function ${registrant.key.name}${args} ${str}`);
		} else if (registrant.value.type === 'Identifier') {
			alias_registration(registrant, info, statements, type);
		} else {
			error(`can only convert ${type}s that are function expressions or references`, method);
		}
	});

	if (statements.length > 0) {
		blocks.push(`${statements.join('\n')}`);
	}
}