declare module '@line/liff' {
  interface Liff {
    init(config: { liffId: string }): Promise<void>;
    isLoggedIn(): boolean;
    login(): void;
    logout(): void;
    getAccessToken(): string | null;
    getIDToken(): string | null;
    getProfile(): Promise<{
      userId: string;
      displayName: string;
      pictureUrl?: string;
      statusMessage?: string;
    }>;
    closeWindow(): void;
    openWindow(params: {
      url: string;
      external?: boolean;
    }): void;
    sendMessages(messages: any[]): Promise<void>;
    shareTargetPicker(messages: any[]): Promise<boolean>;
    isApiAvailable(apiName: string): boolean;
    isInClient(): boolean;
    getOS(): string;
    getVersion(): string;
    getLanguage(): string;
    getContext(): {
      type: string;
      userId?: string;
      groupId?: string;
      roomId?: string;
    };
  }

  const liff: Liff;
  export default liff;
}

