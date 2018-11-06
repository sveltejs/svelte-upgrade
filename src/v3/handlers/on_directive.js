import { error } from '../utils.js';
import rewrite_this from './shared/rewrite_this.js';
import { walk } from 'estree-walker';

const voidElementNames = /^(?:area|base|br|col|command|embed|hr|img|input|keygen|link|meta|param|source|track|wbr)$/;

export default function handle_on_directive(node, info, parent) {
	if (!node.expression) return;

	const { blocks, code } = info;

	if (node.expression.arguments.length === 0) {
		code.remove(node.expression.callee.end, node.expression.end);
	} else {
		const uses_event = find_event(node.expression);

		const this_replacement = voidElementNames.test(parent.name)
			? `event.target`
			: `event.currentTarget`;

		rewrite_this(node.expression, info, true, this_replacement);

		code.prependRight(node.expression.start, uses_event ? `event => ` : `() => `);
	}

	let a = node.expression.start;
	while (code.original[a - 1] !== '=') a -= 1;
	const has_quote = a !== node.expression.start;

	const needs_quote = !has_quote && (
		/\s/.test(code.slice(node.expression.start, node.expression.end)) ||
		node.expression.arguments.length > 0
	);

	code.appendLeft(node.expression.start, needs_quote ? '"{' : '{');
	code.prependRight(node.expression.end, needs_quote ? '}"' : '}');
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