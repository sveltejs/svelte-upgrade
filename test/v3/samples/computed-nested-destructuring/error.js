module.exports = {
	message: "svelte-upgrade cannot currently process non-identifier computed property arguments",
	pos: 132,
	frame: `
		 8:       },
		 9:
		10:       len: ({ coords: { x, y } }) => {
		                  ^
		11:         return Math.sqrt(x * x + y * y);
		12:       }`
};