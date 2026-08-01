declare const _default: () => {
    port: number;
    databaseDriver: string;
    databaseUrl: string | undefined;
    databasePath: string | undefined;
    jwt: {
        secret: string | undefined;
        expiresIn: string;
        refreshExpiresIn: string;
    };
};
export default _default;
