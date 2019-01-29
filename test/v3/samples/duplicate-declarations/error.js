module.exports = {
	message: "'foo' conflicts with existing declaration",
	pos: 141,
	frame: `
		 9:     },
		10:     events: {
		11:       foo(node, callback) {
		          ^
		12:         // code goes here
		13:       }`
};