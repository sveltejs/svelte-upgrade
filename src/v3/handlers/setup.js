export default function handle_methods(node, info) {
	const { shared_blocks, code, indent } = info;

	const setup = code.slice(node.start, node.end)
		.replace(info.indent_regex, '');

	shared_blocks.push(`/*\n${indent}svelte-upgrade cannot automatically transform this code —\n${indent}it must be updated manually\n\n${indent}${setup}\n${indent}*/`);
}