"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const React = require("react");
// #endregion
// Helpers for narrowing types in `elementFromDOMSpec`.
const isDOMNode = (structure) => structure.nodeType != null;
const isDOMAttrsObj = (attrs) => ((typeof attrs == "object") &&
    attrs.nodeType == null &&
    !Array.isArray(attrs));
/**
 * Given a ProseMirror `DOMOutputSpec` and optionally children (as valid React
 * nodes), return a React element (and whether the children were rendered.)
 */
function elementFromDOMSpec(spec, children, didRenderContent = false) {
    if (isDOMNode(spec)) {
        throw new Error("React ProseMirror renderer doesn't support specs that return a DOM fragment! Check your schema.");
    }
    // Specs can simply be a string literal, which correspondingly renders as a string node.
    if (typeof spec == "string")
        return { elem: spec, didRenderContent: false };
    let props;
    let innerSpecs;
    const maybeAttrs = spec[1];
    if (isDOMAttrsObj(maybeAttrs)) {
        // DOM attributes let us set 'class' directly whereas React requires
        // 'className', so we rename it before assigning it over.
        const { 'class': className, ...otherAttrs } = maybeAttrs;
        props = { className, ...otherAttrs };
        innerSpecs = spec.slice(2);
    }
    else {
        innerSpecs = spec.slice(1);
    }
    const innerContent = [];
    innerSpecs.forEach((innerSpec, i) => {
        // A spec element 0 indicates our "content hole", where the children of
        // this node are to be inserted. There can be only one in a spec, and it
        // must be the lone child of its parent node.
        if (innerSpec === 0) {
            if (didRenderContent) {
                throw new Error('Only one content hole allowed in an output spec!');
            }
            if (i !== 0 || i < innerSpecs.length - 1) {
                throw new Error('Content hole must be only child of its parent node!');
            }
            innerContent.push(children);
            didRenderContent = true;
        }
        else {
            const { elem, didRenderContent: innerDidRenderContent } = elementFromDOMSpec(innerSpec, children, didRenderContent);
            if (didRenderContent && innerDidRenderContent) {
                throw new Error('Only one content hole allowed in an output spec!');
            }
            didRenderContent = didRenderContent || innerDidRenderContent;
            innerContent.push(elem);
        }
    });
    return {
        // HACK: one might reasonably expect createElement to accept an empty
        // array as its children parameter, but in some circumstances this seems
        // to make react-dom@16's renderToString freak out with a very unhelpful
        // error message, so we need to pass undefined.
        elem: React.createElement(spec[0], props, innerContent.length > 0 ? innerContent : undefined),
        didRenderContent
    };
}
function makeNodeSpecObject(nodes) {
    const result = {};
    for (const name in nodes) {
        const toReact = nodes[name].spec.toReact;
        if (toReact) {
            result[name] = toReact;
        }
        else {
            const toDOM = nodes[name].spec.toDOM;
            if (toDOM) {
                result[name] = (node, children) => {
                    const { elem, didRenderContent } = elementFromDOMSpec(toDOM(node), children);
                    if (process.env.NODE_ENV !== 'production') {
                        if (node.isLeaf && didRenderContent) {
                            console.error('Rendered content in a leaf node!');
                        }
                        else if (!node.isLeaf && children.length > 0 && !didRenderContent) {
                            console.error('No content rendered in content node!');
                        }
                        if (!elem) {
                            console.error('No element rendered!');
                        }
                    }
                    return elem;
                };
            }
        }
    }
    if (!result.text)
        result.text = node => node.text;
    return result;
}
function makeMarkSpecObject(marks) {
    const result = {};
    for (const name in marks) {
        const toReact = marks[name].spec.toReact;
        if (toReact) {
            result[name] = toReact;
        }
        else {
            const toDOM = marks[name].spec.toDOM;
            if (toDOM) {
                result[name] = (mark, inline, children) => {
                    const spec = toDOM(mark, inline);
                    if (process.env.NODE_ENV !== 'production') {
                        if (!Array.isArray(spec)) {
                            console.error('Mark spec returned a non-array!');
                        }
                        else if (spec.some(specElement => Array.isArray(specElement))) {
                            console.error('Mark spec array has nested elements!');
                        }
                        if (spec.includes(0)) {
                            console.error('Spec has a content hole (0)! This is invalid for mark specs.');
                        }
                    }
                    // HACK: mark specs (implicitly) seem to have some
                    // constraints and differences that complicate applying them
                    // in the same way as a mark spec: they can't be nested, and
                    // they don't use a content hole like node specs. for
                    // simplicity, we append one to the end of the spec array --
                    // this lets us use the same code as for nodes and should
                    // match the behaviour in ProseMirror's DOMSerializer.
                    spec.push(0);
                    const { elem, didRenderContent } = elementFromDOMSpec(spec, children);
                    if (process.env.NODE_ENV !== 'production') {
                        if (children.length > 0 && !didRenderContent) {
                            console.error('No content rendered in mark!');
                        }
                        if (!elem) {
                            console.error('No element rendered!');
                        }
                    }
                    return elem;
                };
            }
        }
    }
    return result;
}
function makeReactRenderer(schema, componentName) {
    const nodeSpecs = makeNodeSpecObject(schema.nodes);
    const markSpecs = makeMarkSpecObject(schema.marks);
    // TODO: ProseMirror's DOMSerializer tries to coalesce marks, but we're not doing that yet.
    function renderMarks(node, renderedContent, props) {
        // Build up a JSX element by applying our marks around the inner content, one-by-one.
        return node.marks.reduceRight((p, c) => markSpecs[c.type.name](c, node.isInline, p, props), renderedContent);
    }
    function renderFragment(props) {
        const { fragment, ...passthroughProps } = props;
        // HACK: ProseMirror typings don't expose Fragment.contents
        return fragment.content.map((node, i) => {
            const renderedContent = nodeSpecs[node.type.name](node, renderFragment({ fragment: node.content, ...passthroughProps }), passthroughProps);
            return renderMarks(node, renderedContent, passthroughProps);
        }); // HACK: SFC typings don't let us return element arrays yet
    }
    renderFragment.displayName = componentName || 'ReactRenderer';
    return renderFragment;
}
exports.makeReactRenderer = makeReactRenderer;
//# sourceMappingURL=index.js.map