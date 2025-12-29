import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter?: nodemailer.Transporter;
  private fromAddress?: string;

  constructor() {
    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM;

    if (host && port && user && pass && from) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
      this.fromAddress = from;
    }
  }

  async sendAccountStatusEmail(params: {
    to: string;
    fullName: string;
    dni: string;
    isActive: boolean;
    tempPassword: string;
  }) {
    if (!this.transporter || !this.fromAddress) {
      return;
    }

    const statusMessage = params.isActive
      ? 'Puedes ingresar desde este instante en el sistema con las credenciales brindadas.'
      : 'Actualiza tus pagos y comunícate con el administrador de padrón de tu capítulo para que puedas ingresar al sistema con las credenciales brindadas.';
    const body = `Hola ${params.fullName},\n\nTu usuario ha sido creado o actualizado en el sistema.\nUsuario: ${params.dni}\nClave temporal: ${params.tempPassword}\n\n${statusMessage}\n\nPor favor, inicia sesión y cambia tu contraseña.\n\nGracias.`;

    await this.transporter.sendMail({
      from: this.fromAddress,
      to: params.to,
      subject: 'Estado de tu cuenta en el sistema',
      text: body,
    });
  }
}
