export default function rewrite_get(node, parent, info) {
	if (node.id.type === 'ObjectPattern') {
		node.id.properties.forEach(prop => {
			if (!info.props.has(prop.key.name)) {
				info.props.set(prop.key.name, 'undefined');
			}
		});

		if (node.id.properties.every(node => node.shorthand)) {
			if (parent.declarations.length !== 1) {
				throw new Error(`TODO handle this.get() among other declarators`);
			}

			let a = parent.start;
			while (/\s/.test(info.source[a - 1])) a -= 1;

			info.code.remove(a, parent.end);
			return;
		}
	}

	const { start, end } = node.init.callee.object;
	info.code.overwrite(start, end, '__this');

	info.uses_this = true;
	info.uses_this_properties.add('get');
}