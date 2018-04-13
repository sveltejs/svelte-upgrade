# svelte-upgrade

Upgrade your Svelte templates for compatibility with version 2.

To update all the templates in the `src` directory:

```bash
npx svelte-upgrade v2 src
```

To update an individual component:

```bash
npx svelte-upgrade v2 MyComponent.html
```

To specify a different output location, instead of writing in place, use the `--output` (or `-o`) flag.

If files will be overwritten, you'll be prompted for confirmation. Use `--force` or `-f` to bypass the prompt.


## Configuring the compiler

Prior to the release of Svelte v2, it is possible to opt in to the new syntax by passing the `parser: 'v2'` option to the compiler, either directly or via your rollup-plugin-svelte or svelte-loader options.


## Svelte v2 syntax changes

### Single-curly tags

```html
<!-- before -->
<div class="item {{active ? 'highlighted' : ''}}">
  {{name}}
</div>

<!-- after -->
<div class="item {active ? 'highlighted' : ''}">
  {name}
</div>
```

### Control flow

```html
<!-- before -->
{{#if foo}}
  <p>foo</p>
{{elseif bar}}
  <p>bar</p>
{{else}}
  <p>neither foo nor bar</p>
{{/if}}

<!-- after -->
{#if foo}
  <p>foo</p>
{:elseif bar}
  <p>bar</p>
{:else}
  <p>neither foo nor bar</p>
{/if}
```

### Keyed each blocks

```html
<!-- before -->
<ul>
  {{#each cats as cat @name}}
    <li><a target='_blank' href={{cat.video}}>{{cat.name}}</a></li>
  {{/each}}
</ul>

<!-- after -->
<ul>
  {#each cats as cat key cat.name}
    <li><a target='_blank' href={cat.video}>{cat.name}</a></li>
  {/each}
</ul>
```

### Built-in elements

```html
<!-- before -->
<:Window on:resize='handleResize()'/>

<!-- after -->
<svelte:window on:resize='handleResize()'/>
```

### Dynamic components

```html
<!-- before -->
<:Component {Thing}/>

<!-- after -->
<svelte:component this={Thing}/>
```

### Shorthand properties

```html
<!-- before -->
<Foo :bar/>

<!-- after -->
<Foo {bar}/>
```

### HTML

```html
<!-- before -->
<div class='blog-post'>
  {{{post.content}}}
</div>

<!-- after -->
<div class='blog-post'>
  {@html post.content}
</div>
```

If you have strong feelings about these changes, join the discussion on [#1318](https://github.com/sveltejs/svelte/issues/1318).


## License

[LIL](LICENSE)