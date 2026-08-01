import { JwtService } from '@nestjs/jwt';
import { DrizzleDB } from '../../database/drizzle.provider';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
export declare class AuthService {
    private readonly db;
    private readonly jwt;
    constructor(db: DrizzleDB, jwt: JwtService);
    register(dto: RegisterDto): Promise<{
        accessToken: string;
    }>;
    login(dto: LoginDto): Promise<{
        organizaciones: {
            organizacionId: string;
            rol: "propietario" | "admin" | "capataz" | "veterinario" | "recepcion";
        }[];
        accessToken: string;
    }>;
    private emitirToken;
}
