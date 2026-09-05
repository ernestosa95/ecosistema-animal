import { Body, Controller, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

// Más estricto que el límite global de la API (100/min, ver app.module.ts):
// estos tres son los únicos endpoints públicos donde alguien puede intentar
// fuerza bruta (login) o hacer que el backend le mande mail a costa nuestra
// en Resend (forgot-password) sin necesitar ninguna sesión previa.
const LIMITE_AUTH_SENSIBLE = { default: { limit: 5, ttl: 900_000 } }; // 5 cada 15 min por IP

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Throttle(LIMITE_AUTH_SENSIBLE)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refrescar(dto.refreshToken);
  }

  @Throttle(LIMITE_AUTH_SENSIBLE)
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.auth.solicitarResetPassword(dto.email);
    // Mensaje genérico siempre — nunca revela si el email existe o no.
    return { ok: true };
  }

  @Throttle(LIMITE_AUTH_SENSIBLE)
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.auth.resetearPassword(dto.token, dto.password);
    return { ok: true };
  }
}
