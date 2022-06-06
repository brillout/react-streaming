import React from "react";

type UseEffectParams = Parameters<typeof React.useEffect>;
export type DependencyList = UseEffectParams[1];
