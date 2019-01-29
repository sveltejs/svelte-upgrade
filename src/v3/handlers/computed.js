import { walk } from 'estree-walker';
import { create_scopes } from '../scopes';
import is_reference from 'is-reference';

export default function handle_computed(node, info) {
	const { props, code, blocks, indent } = info;

	node.properties.forEach(computed => {
		const { name } = computed.key;

		let chunks = [];

		const uses_whole_state = (
			computed.value.params[0].type !== 'ObjectPattern' ||
			computed.value.params[0].properties.some(x => x.type === 'RestElement')
		);

		if (uses_whole_state) {
			chunks.push(
				`// [svelte-upgrade warning]\n${indent}// this function needs to be manually rewritten`
			);

			info.manual_edits_required = true;
		} else {
			computed.value.params[0].properties.forEach(param => {
				console.log(param);
				if (param.type !== 'Property' || param.key !== param.value) {
					info.error(`svelte-upgrade cannot currently process non-identifier computed property arguments`, param.start);
				}
			});
		}

		chunks.push(`export let ${computed.key.name};`);

		const implicit_return = (
			computed.value.type === 'ArrowFunctionExpression' &&
			computed.value.body.type !== 'BlockStatement'
		);

		if (implicit_return) {
			const expression = code.slice(computed.value.body.start, computed.value.body.end);
			chunks.push(`$: ${name} = ${expression};`);
		} else {
			const body = code.slice(computed.value.body.start, computed.value.body.end)
				.replace(info.indent_regex, '')
				.replace(info.indent_regex, '')
				.replace(`return`, `${name} =`);

			chunks.push(`$: ${body}`);
		}

		blocks.push(chunks.join(`\n${indent}`));
	});
}