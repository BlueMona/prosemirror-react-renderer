// @ts-check

const { makeReactRenderer } = require('../dist')
const React = require('react')
const { renderToString } = require('react-dom/server')
const { chatSchema } = require('./chat-schema')

function renderJSON(json) {
    const doc = chatSchema.nodeFromJSON(json)
    const Renderer = makeReactRenderer(chatSchema)
    console.log(renderToString(React.createElement(Renderer, { fragment: doc.content })))
}

const fixture = {
  "type": "doc",
  "content": [
    {
      "type": "paragraph",
      "content": [
        {
          "type": "text",
          "text": "ds"
        },
        {
          "type": "text",
          "marks": [
            {
              "type": "strong"
            }
          ],
          "text": "fk"
        },
        {
          "type": "text",
          "marks": [
            {
              "type": "em"
            },
            {
              "type": "strong"
            }
          ],
          "text": "sd"
        },
        {
          "type": "text",
          "marks": [
            {
              "type": "em"
            }
          ],
          "text": " fiu"
        },
        {
          "type": "text",
          "text": "h"
        }
      ]
    }
  ]
}

renderJSON(fixture)
