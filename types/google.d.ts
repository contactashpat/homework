export type GoogleCredentialResponse = {
  credential: string;
  select_by?: string;
  clientId?: string;
};

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (config: {
            client_id: string;
            callback: (response: GoogleCredentialResponse) => void;
            ux_mode?: "popup" | "redirect";
            auto_select?: boolean;
          }) => void;
          renderButton: (parent: HTMLElement, options?: Record<string, unknown>) => void;
          prompt: () => void;
        };
      };
    };
  }
}

export {};
