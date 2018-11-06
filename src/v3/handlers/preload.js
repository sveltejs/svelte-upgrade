export default function handle_preload(preload, info) {
	const { shared_blocks, code } = info;

	if (preload.type === 'Identifier') {
		shared_blocks.push(preload.name === `preload`)
			? `export { preload };`
			: `export { ${preload.name} as preload };`
	} else if (preload.type === 'FunctionExpression') {
		const body = code.slice(preload.body.start, preload.body.end)
			.replace(info.indent_regex, '');

		const args = preload.params.length > 0
			? `(${code.slice(preload.params[0].start, preload.params[preload.params.length - 1].end)})`
			: '()';

		shared_blocks.push(`export ${preload.async ? `async ` : ``}function preload${args} ${body}`)
	}
}