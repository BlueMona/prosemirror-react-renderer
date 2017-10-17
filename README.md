# prosemirror-react-renderer

An alternative to ProseMirror's DOMSerializer that converts documents into React
elements instead of DOM fragments.


## Quick Start

```jsx
import { makeReactRenderer } from 'prosemirror-react-renderer'

const Renderer = makeReactRenderer(myProseMirrorSchema)

ReactDOM.render(
    <Renderer fragment={proseMirrorDoc.content} onClickLink={this.onClickLink} extraProp='foo' />,
    rootElement
)
```


## API


### `makeReactRenderer<TProps = {}>(schema : Schema, componentName? : string)`<br>
### &nbsp;&nbsp;&nbsp;&nbsp;`: React.Component<TProps & { fragment : ProseMirror.Fragment }>`

Create a `Renderer` component from the given ProseMirror schema.


### `<Renderer />`

#### Props:

`fragment : ProseMirror.Fragment`

Any additional props will be passed through to nodes or marks in the schema that
declare a `toReact` method, so you can use them to inject dependencies for
dynamic content (callbacks, etc.)


## Caveats

- ProseMirror [`toDOM`](https://prosemirror.net/docs/ref/#model.NodeSpec.toDOM)
  methods that directly return a DOM fragment (rather than a string or an output
  spec array) are not supported.

- Adjacent nodes with identical marks are also not currently merged as in DOMSerializer,
  so the React representation of a document may not be unique (a property offered by ProseMirror
  core.) PRs welcome!


## Known Issues

- Fragment elements aren't given React `key` values. This will be resolved before release.


## License

MIT
