import React from 'react'
import ReactDOM from 'react-dom'

import { EditorState } from 'prosemirror-state'
import { EditorView } from 'prosemirror-view'
import { Schema, DOMParser } from 'prosemirror-model'
import { schema } from 'prosemirror-schema-basic'
import { addListNodes } from 'prosemirror-schema-list'
import { exampleSetup } from 'prosemirror-example-setup'

import './editor.css'

import { makeReactRenderer } from 'prosemirror-react-renderer'

const reactRoot = document.getElementById('react-root')

// Mix the nodes from prosemirror-schema-list into the basic schema to
// create a schema with list support.
const mySchema = new Schema({
    nodes: addListNodes(schema.spec.nodes, 'paragraph block*', 'block'),
    marks: schema.spec.marks
})

const view = new EditorView(document.querySelector('#editor'), {
    state: EditorState.create({
        doc: DOMParser.fromSchema(mySchema).parse(document.querySelector('#content')),
        plugins: exampleSetup({ schema: mySchema })
    }),
    dispatchTransaction(transaction) {
        const newState = view.state.apply(transaction)
        view.updateState(newState)
        ReactDOM.render(<App fragment={newState.doc.content} />, reactRoot)
    }
})

const Renderer = makeReactRenderer(mySchema)

class App extends React.Component {
    render() {
        return (
            <div className="App ProseMirror" style={{ border: '1px solid #000', backgroundColor: '#DDD', padding: 5 }}>
                <header className="App-header">
                    <h1 className="App-title">React output:</h1>
                </header>
                <div style={{ backgroundColor: '#FFF', padding: 5 }}>
                    <Renderer fragment={this.props.fragment} />
                </div>
            </div>
        )
    }
}

ReactDOM.render(<App fragment={view.state.doc.content} />, reactRoot)
