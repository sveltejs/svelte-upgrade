import handle_registrants from './shared/handle_registrants.js';

export default function handle_actions(node, info) {
	handle_registrants(node.properties, info, 'action');
}