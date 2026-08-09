import type { DetailedHTMLProps, HTMLAttributes, Ref } from "react";
import type { CapWidget } from "cap-widget";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "cap-widget": DetailedHTMLProps<HTMLAttributes<CapWidget>, CapWidget> & {
        "data-cap-api-endpoint"?: string;
        "data-cap-worker-count"?: string;
        "data-cap-i18n-initial-state"?: string;
        "data-cap-i18n-verifying-label"?: string;
        "data-cap-i18n-solved-label"?: string;
        "data-cap-i18n-error-label"?: string;
        ref?: Ref<CapWidget>;
      };
    }
  }
}

export {};
