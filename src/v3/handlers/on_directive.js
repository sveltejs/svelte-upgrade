import rewrite_this from './shared/rewrite_this.js';
import { walk } from 'estree-walker';

const voidElementNames = /^(?:area|base|br|col|command|embed|hr|img|input|keygen|link|meta|param|source|track|wbr)$/;

export default function handle_on_directive(node, info, parent) {
	if (!node.expression) return;

	const { code } = info;
	const { arguments: args, callee, start, end } = node.expression;

	if (args.length === 0 || (args.length === 1 && args[0].name === 'event')) {
		code.remove(callee.end, end);
	} else {
		const uses_event = find_event(node.expression);

		const this_replacement = voidElementNames.test(parent.name)
			? `event.target`
			: `event.currentTarget`;

		rewrite_this(node.expression, info, true, this_replacement);

		code.prependRight(start, uses_event ? `event => ` : `() => `);
	}

	let a = start;
	while (code.original[a - 1] !== '=') a -= 1;
	const has_quote = a !== start;

	const needs_quote = !has_quote && (
		/\s/.test(code.slice(start, end)) ||
		args.length > 0
	);

	code.appendLeft(start, needs_quote ? '"{' : '{');
	code.prependRight(end, needs_quote ? '}"' : '}');
}

function find_event(expression) {
	let found = false;

	walk(expression, {
		enter(node) {
			if (node.type === 'Identifier' && node.name === 'event') {
				found = true;
			}
		}
	});

	return found;
}