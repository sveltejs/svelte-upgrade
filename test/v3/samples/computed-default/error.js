module.exports = {
	message: "svelte-upgrade cannot currently process non-identifier computed property arguments",
	pos: 72,
	frame: `
		4:   export default {
		5:     computed: {
		6:       b: ({ a = 1 }) => a * 2
		               ^
		7:     }
		8:   };`
};