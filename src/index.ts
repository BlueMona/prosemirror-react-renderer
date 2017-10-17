import * as React from 'react'
import {
  Schema,
  Node,
  Mark,
  Fragment,
  NodeType,
  NodeSpec,
  MarkType,
  MarkSpec,
} from 'prosemirror-model'

import { DOMNode } from 'prosemirror-model/dom'

// #region Types

/** Mirrors PM's `DOMOutputSpec`, but a bit more accurate for our usage here. */
type OutputSpec = string | DOMNode | OutputSpecArray;

// Little hack: we need to use an interface to extend the type alias since
// aliases can't be circular (since they're aggressively unrolled.)
interface OutputSpecArray extends TOutputSpecArray {}
type TOutputSpecArray = [
    keyof React.ReactHTML,
    OutputSpec | 0 | { [attrName : string] : string } | undefined,
    OutputSpec | 0 | undefined
]

/**
 * Similar to PM's
 * [`toDOM`](https://prosemirror.net/docs/ref/#model.NodeSpec.toDOM) method, these
 * `ElementFactory` types receive the ProseMirror `Node` and `Mark` respectively; the
 * difference is that they output a React element instead of a PM `DOMOutputSpec`.
 */
type NodeElementFactory = (node : Node, children : React.ReactNode, rendererProps : any) => JSX.Element
type MarkElementFactory = (mark : Mark, inline : boolean, children : React.ReactNode, rendererProps : any) => JSX.Element

/**
 * Node and Mark types are as in ProseMirror, but optionally augmented with a
 * `toReact` method that will be used in favour of the `toDOM` method if it's
 * present in a spec.
 */
interface ReactNodeType extends NodeType {
    spec : NodeSpec & { toReact? : NodeElementFactory }
}
interface ReactMarkType extends MarkType {
    spec : MarkSpec & { toReact? : MarkElementFactory }
}
// #endregion


// Helpers for narrowing types in `elementFromDOMSpec`.
const isDOMNode = (structure : OutputSpec) : structure is DOMNode => (structure as any).nodeType != null
const isDOMAttrsObj = (attrs : OutputSpec | 0 | { [attr: string]: string } | undefined) : attrs is { [attr: string]: string } => (
    (typeof attrs == "object") &&
    (attrs as any).nodeType == null &&
    !Array.isArray(attrs)
)

/**
 * Given a ProseMirror `DOMOutputSpec` and optionally children (as valid React
 * nodes), return a React element (and whether the children were rendered.)
 */
function elementFromDOMSpec(spec : OutputSpec, children? : React.ReactNode, didRenderContent = false)
    : { elem : React.ReactNode, didRenderContent : boolean }
{
    if (isDOMNode(spec)) {
        throw new Error(
            "React ProseMirror renderer doesn't support specs that return a DOM fragment! Check your schema."
        )
    }

    // Specs can simply be a string literal, which correspondingly renders as a string node.
    if (typeof spec == "string") return { elem: spec, didRenderContent: false}

    let props : React.HTMLProps<any> | undefined
    let innerSpecs : (OutputSpec | 0)[]

    const maybeAttrs = spec[1]
    if (isDOMAttrsObj(maybeAttrs)) {
        // DOM attributes let us set 'class' directly whereas React requires
        // 'className', so we rename it before assigning it over.
        const { 'class': className, ...otherAttrs } = maybeAttrs
        props = { className, ...otherAttrs }

        innerSpecs = (spec as any[]).slice(2)
    }
    else {
        innerSpecs = (spec as any[]).slice(1)
    }

    const innerContent : React.ReactNode[] = []
    innerSpecs.forEach((innerSpec, i) => {
        // A spec element 0 indicates our "content hole", where the children of
        // this node are to be inserted. There can be only one in a spec, and it
        // must be the lone child of its parent node.
        if(innerSpec === 0) {
            if(didRenderContent) {
                throw new Error('Only one content hole allowed in an output spec!')
            }
            if(i !== 0 || i < innerSpecs.length - 1) {
                throw new Error('Content hole must be only child of its parent node!')
            }
            innerContent.push(children)
            didRenderContent = true
        }
        else {
            const {
                elem,
                didRenderContent: innerDidRenderContent
            } = elementFromDOMSpec(innerSpec, children, didRenderContent)

            if(didRenderContent && innerDidRenderContent) {
                throw new Error('Only one content hole allowed in an output spec!')
            }

            didRenderContent = didRenderContent || innerDidRenderContent
            innerContent.push(elem)
        }
    })

    return {
        // HACK: one might reasonably expect createElement to accept an empty
        // array as its children parameter, but in some circumstances this seems
        // to make react-dom@16's renderToString freak out with a very unhelpful
        // error message, so we need to pass undefined.
        elem: React.createElement(spec[0], props, innerContent.length > 0 ? innerContent : undefined),
        didRenderContent
    }
}


/**
 * We gather the `toDOM` (or `toReact` if present) methods in a ProseMirror schema
 * and normalize them for use in our renderer.
 */
interface NodeSpecObject { [nodeName : string] : NodeElementFactory }

function makeNodeSpecObject(nodes : { [name : string] : ReactNodeType }) : NodeSpecObject {
    const result : NodeSpecObject = {};
    for (const name in nodes) {
        const toReact = nodes[name].spec.toReact
        if(toReact) {
            result[name] = toReact;
        }
        else {
            const toDOM = nodes[name].spec.toDOM;
            if (toDOM) {
                result[name] = (node : Node, children : JSX.Element[]) => {
                    const { elem, didRenderContent } = elementFromDOMSpec(toDOM(node) as OutputSpec, children)
                    if (process.env.NODE_ENV !== 'production') {
                        if(node.isLeaf && didRenderContent) {
                            console.error('Rendered content in a leaf node!')
                        }
                        else if(!node.isLeaf && children.length > 0 && !didRenderContent) {
                            console.error('No content rendered in content node!')
                        }
                        if(!elem) {
                            console.error('No element rendered!')
                        }
                    }
                    return elem as JSX.Element
                }
            }
        }
    }
    if (!result.text) result.text = node => node.text as any

    return result
}

interface MarkSpecObject { [markName : string] : MarkElementFactory }

function makeMarkSpecObject(marks : { [name : string] : ReactMarkType }) : MarkSpecObject {
    const result : MarkSpecObject = {};
    for (const name in marks) {
        const toReact = marks[name].spec.toReact
        if(toReact) {
            result[name] = toReact;
        }
        else {
            const toDOM = marks[name].spec.toDOM;
            if (toDOM) {
                result[name] = (mark : Mark, inline : boolean, children : JSX.Element[]) => {
                    const spec = toDOM(mark, inline) as OutputSpecArray
                    if (process.env.NODE_ENV !== 'production') {
                        if(!Array.isArray(spec)) {
                            console.error('Mark spec returned a non-array!')
                        }
                        else if(spec.some(specElement => Array.isArray(specElement))) {
                            console.error('Mark spec array has nested elements!')
                        }
                        if(spec.includes(0)) {
                            console.error('Spec has a content hole (0)! This is invalid for mark specs.')
                        }
                    }

                    // HACK: mark specs (implicitly) seem to have some
                    // constraints and differences that complicate applying them
                    // in the same way as a mark spec: they can't be nested, and
                    // they don't use a content hole like node specs. for
                    // simplicity, we append one to the end of the spec array --
                    // this lets us use the same code as for nodes and should
                    // match the behaviour in ProseMirror's DOMSerializer.
                    spec.push(0)
                    const { elem, didRenderContent } = elementFromDOMSpec(spec, children)

                    if (process.env.NODE_ENV !== 'production') {
                        if(children.length > 0 && !didRenderContent) {
                            console.error('No content rendered in mark!')
                        }
                        if(!elem) {
                            console.error('No element rendered!')
                        }
                    }
                    return elem as JSX.Element
                }
            }
        }
    }
    return result
}


export interface ReactRendererProps {
    fragment : Fragment
}

export function makeReactRenderer<TProps = {}>(schema : Schema, componentName? : string) {
    const nodeSpecs = makeNodeSpecObject(schema.nodes as { [nodeName : string] : ReactNodeType })
    const markSpecs = makeMarkSpecObject(schema.marks as { [markName : string] : ReactMarkType })

    // TODO: ProseMirror's DOMSerializer tries to coalesce marks, but we're not doing that yet.
    function renderMarks(node : Node, renderedContent : JSX.Element, props : any) : JSX.Element {
        // Build up a JSX element by applying our marks around the inner content, one-by-one.
        return node.marks.reduceRight(
            (p, c) => markSpecs[c.type.name](c, node.isInline, p, props),
            renderedContent
        )
    }

    function renderFragment(props : TProps & ReactRendererProps) {
        const { fragment, ...passthroughProps } = props as any
        // HACK: ProseMirror typings don't expose Fragment.contents
        return ((fragment as any).content as Node[]).map((node, i) => {
            const renderedContent = nodeSpecs[node.type.name](
                node,
                renderFragment({ fragment: node.content, ...passthroughProps }),
                passthroughProps
            )
            return renderMarks(node, renderedContent, passthroughProps)
        }) as any // HACK: SFC typings don't let us return element arrays yet
    }

    (renderFragment as React.SFC<TProps & ReactRendererProps>).displayName = componentName || 'ReactRenderer'
    return renderFragment as React.SFC<TProps & ReactRendererProps>
}
