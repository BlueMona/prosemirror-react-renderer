/// <reference types="react" />
import * as React from 'react';
import { Schema, Fragment } from 'prosemirror-model';
export interface ReactRendererProps {
    fragment: Fragment;
}
export declare function makeReactRenderer<TProps = {}>(schema: Schema, componentName?: string): React.StatelessComponent<TProps & ReactRendererProps>;
