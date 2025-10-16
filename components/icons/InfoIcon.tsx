"use client";

import type { SVGProps } from "react";

export const InfoIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    {...props}
  >
    <path d="M12 2.25a9.75 9.75 0 1 0 0 19.5 9.75 9.75 0 0 0 0-19.5Zm0 5.25a1.125 1.125 0 1 1 0 2.25 1.125 1.125 0 0 1 0-2.25Zm1.5 9.375H10.5a.75.75 0 0 1 0-1.5h.375v-3H10.5a.75.75 0 0 1 0-1.5H12a.75.75 0 0 1 .75.75v3.75h.75a.75.75 0 0 1 0 1.5Z" />
  </svg>
);
