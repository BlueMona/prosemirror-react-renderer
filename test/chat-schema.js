// @ts-check

/* eslint no-warning-comments: "warn" */

const os = require('os');

// `Node` used for typechecking:
// eslint-disable-next-line no-unused-vars
const { Schema, DOMSerializer, Node } = require('prosemirror-model');

const { emojiByCanonicalShortname } = require('./emoji');

const pngFolder = './static/emoji/png/';


// Adapted from https://github.com/ProseMirror/prosemirror-schema-basic
const chatSchema = new Schema({
    nodes: {
        doc: { content: 'block+' },
        paragraph: {
            content: 'inline*',
            group: 'block',
            parseDOM: [{ tag: 'p' }],
            toDOM() { return ['p', 0]; }
        },
        blockquote: {
            content: 'block+',
            group: 'block',
            defining: true,
            parseDOM: [{ tag: 'blockquote' }],
            toDOM() { return ['blockquote', 0]; }
        },
        code_block: {
            content: 'text*',
            marks: '',
            group: 'block',
            code: true,
            defining: true,
            parseDOM: [{ tag: 'pre', preserveWhitespace: 'full' }],
            toDOM() { return ['pre', ['code', 0]]; }
        },
        text: { group: 'inline' },
        hard_break: {
            inline: true,
            group: 'inline',
            selectable: false,
            parseDOM: [{ tag: 'br' }],
            toDOM() { return ['br']; }
        },
        mention: {
            inline: true,
            group: 'inline',
            selectable: true,
            marks: '',
            attrs: {
                username: {}
            },
            parseDOM: [
                {
                    tag: 'span',
                    getAttrs(/** @type {HTMLSpanElement} */e) {
                        const username = e.dataset.username;
                        if (
                            username &&
                            e.classList.contains('mention') &&
                            e.classList.contains('clickable') &&
                            e.textContent === `@${username}`
                        ) return { username };

                        return false;
                    }
                }
            ],
            toDOM(node) {
                return [
                    'span',
                    {
                        class: 'mention clickable',
                        'data-username': node.attrs.username,
                        // TODO: inject method dependency, don't depend on global
                        onclick: `openContact("${node.attrs.username}")`
                    },
                    `@${node.attrs.username}`
                ];
            }
        },
        emoji: {
            inline: true,
            group: 'inline',
            draggable: true,
            attrs: {
                shortname: {}
            },
            parseDOM: [
                {
                    tag: 'img',
                    getAttrs(/** @type {HTMLImageElement} */e) {
                        if (
                            e.className === 'emojione' &&
                            e.alt && (e.alt in emojiByCanonicalShortname) &&
                            e.title &&
                            e.src && e.src.startsWith(pngFolder)
                        ) return { shortname: e.alt };

                        return false;
                    }
                }
                // TODO: handle unicode emoji
                // (probably after paste?)
            ],
            toDOM(node) {
                const emoji = emojiByCanonicalShortname[node.attrs.shortname];
                if (!emoji) {
                    console.warn(`emoji data not found for ${node.attrs.shortname}`);
                    return [
                        'img',
                        {
                            class: 'emojione',
                            alt: ':grey_question:',
                            title: '❔',
                            src: './static/emoji/png/2754.png'
                        }
                    ];
                }

                return [
                    'img',
                    {
                        class: 'emojione',
                        alt: String.fromCodePoint(Number.parseInt(emoji.unicode, 16)),
                        title: node.attrs.shortname,
                        src: `${pngFolder}${emoji.unicode}.png`
                    }
                ];
            }
        }
    },
    marks: {
        em: {
            parseDOM: [{ tag: 'i' }, { tag: 'em' }, { style: 'font-style=italic' }],
            toDOM() { return ['em']; }
        },
        strong: {
            parseDOM: [
                { tag: 'strong' },
                // This works around a Google Docs misbehavior where
                // pasted content will be inexplicably wrapped in `<b>`
                // tags with a font-weight normal.
                // @ts-ignore
                { tag: 'b', getAttrs: node => node.style.fontWeight !== 'normal' && null },
                // @ts-ignore
                { style: 'font-weight', getAttrs: value => /^(bold(er)?|[5-9]\d{2,})$/.test(value) && null }
            ],
            toDOM() { return ['strong']; }
        },
        code: {
            parseDOM: [{ tag: 'code' }],
            toDOM() { return ['code']; }
        }
    }
});

module.exports = {
    chatSchema
};
