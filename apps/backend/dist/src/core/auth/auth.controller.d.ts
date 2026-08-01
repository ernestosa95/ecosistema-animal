import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
export declare class AuthController {
    private readonly auth;
    constructor(auth: AuthService);
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
}
