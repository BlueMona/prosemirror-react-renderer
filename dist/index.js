"use strict";
var __assign = (this && this.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) if (e.indexOf(p[i]) < 0)
            t[p[i]] = s[p[i]];
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
var React = require("react");
// #endregion
// Helpers for narrowing types in `elementFromDOMSpec`.
var isDOMNode = function (structure) { return structure.nodeType != null; };
var isDOMAttrsObj = function (attrs) { return ((typeof attrs == "object") &&
    attrs.nodeType == null &&
    !Array.isArray(attrs)); };
/**
 * Given a ProseMirror `DOMOutputSpec` and optionally children (as valid React
 * nodes), return a React element (and whether the children were rendered.)
 */
function elementFromDOMSpec(spec, children, didRenderContent) {
    if (didRenderContent === void 0) { didRenderContent = false; }
    if (isDOMNode(spec)) {
        throw new Error("React ProseMirror renderer doesn't support specs that return a DOM fragment! Check your schema.");
    }
    // Specs can simply be a string literal, which correspondingly renders as a string node.
    if (typeof spec == "string")
        return { elem: spec, didRenderContent: false };
    var props;
    var innerSpecs;
    var maybeAttrs = spec[1];
    if (isDOMAttrsObj(maybeAttrs)) {
        // DOM attributes let us set 'class' directly whereas React requires
        // 'className', so we rename it before assigning it over.
        var className = maybeAttrs["class"], otherAttrs = __rest(maybeAttrs, ['class']);
        props = __assign({ className: className }, otherAttrs);
        innerSpecs = spec.slice(2);
    }
    else {
        innerSpecs = spec.slice(1);
    }
    var innerContent = [];
    innerSpecs.forEach(function (innerSpec, i) {
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
            var _a = elementFromDOMSpec(innerSpec, children, didRenderContent), elem = _a.elem, innerDidRenderContent = _a.didRenderContent;
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
        elem: React.createElement(spec[0], props, innerContent.length > 0 ?
            innerContent.map(function (e, i) { return React.createElement((function () { return e; }), { key: i }); }) :
            undefined),
        didRenderContent: didRenderContent
    };
}
function makeNodeSpecObject(nodes) {
    var result = {};
    var _loop_1 = function (name_1) {
        var toReact = nodes[name_1].spec.toReact;
        if (toReact) {
            result[name_1] = toReact;
        }
        else {
            var toDOM_1 = nodes[name_1].spec.toDOM;
            if (toDOM_1) {
                result[name_1] = function (node, children) {
                    var _a = elementFromDOMSpec(toDOM_1(node), children), elem = _a.elem, didRenderContent = _a.didRenderContent;
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
    };
    for (var name_1 in nodes) {
        _loop_1(name_1);
    }
    if (!result.text)
        result.text = function (node) { return node.text; };
    return result;
}
function makeMarkSpecObject(marks) {
    var result = {};
    var _loop_2 = function (name_2) {
        var toReact = marks[name_2].spec.toReact;
        if (toReact) {
            result[name_2] = toReact;
        }
        else {
            var toDOM_2 = marks[name_2].spec.toDOM;
            if (toDOM_2) {
                result[name_2] = function (mark, inline, children) {
                    var spec = toDOM_2(mark, inline);
                    if (process.env.NODE_ENV !== 'production') {
                        if (!Array.isArray(spec)) {
                            console.error('Mark spec returned a non-array!');
                        }
                        else if (spec.some(function (specElement) { return Array.isArray(specElement); })) {
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
                    var _a = elementFromDOMSpec(spec, children), elem = _a.elem, didRenderContent = _a.didRenderContent;
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
    };
    for (var name_2 in marks) {
        _loop_2(name_2);
    }
    return result;
}
function makeReactRenderer(schema, componentName) {
    var nodeSpecs = makeNodeSpecObject(schema.nodes);
    var markSpecs = makeMarkSpecObject(schema.marks);
    // TODO: ProseMirror's DOMSerializer tries to coalesce marks, but we're not doing that yet.
    function renderMarks(node, renderedContent, props) {
        // Build up a JSX element by applying our marks around the inner content, one-by-one.
        return node.marks.reduceRight(function (p, c) { return markSpecs[c.type.name](c, node.isInline, p, props); }, renderedContent);
    }
    function renderFragment(props) {
        var _a = props, fragment = _a.fragment, passthroughProps = __rest(_a, ["fragment"]);
        // HACK: ProseMirror typings don't expose Fragment.contents
        return fragment.content.map(function (node, i) {
            var renderedContent = nodeSpecs[node.type.name](node, renderFragment(__assign({ fragment: node.content }, passthroughProps)), passthroughProps);
            return React.createElement(function () { return renderMarks(node, renderedContent, passthroughProps); }, { key: i });
        }); // HACK: SFC typings don't let us return element arrays yet
    }
    renderFragment.displayName = componentName || 'ReactRenderer';
    return renderFragment;
}
exports.makeReactRenderer = makeReactRenderer;
//# sourceMappingURL=index.js.map