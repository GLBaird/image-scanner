// <reference types="react" />

/*  SVG *as React component*  */
declare module '*.svg?component' {
    import * as React from 'react';
    const ReactComponent: React.FC<React.SVGProps<SVGSVGElement>>;
    export default ReactComponent;
}

/*  SVG *as URL string* (if you use the ?url variant) */
declare module '*.svg?url' {
    const src: string;
    export default src;
}
