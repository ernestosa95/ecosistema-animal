export interface CodigoLegible {
    especie: string;
    pais: string;
    secuencia: number;
    dv: string;
    completo: string;
}
export declare function generarCodigoLegible(especieCodigo: string, secuencia: number, pais?: string): string;
export declare function parsearCodigoLegible(codigo: string): CodigoLegible | null;
export declare function validarCodigoLegible(codigo: string): boolean;
export declare function validarMicrochipISO(microchip: string): boolean;
export declare function resolverIdentificadorExterno(microchip: string | null | undefined, codigoLegible: string | null | undefined): string | null;
