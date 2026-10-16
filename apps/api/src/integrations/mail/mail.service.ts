import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { AppConfig } from '../../config/configuration';

/** Sends via SMTP_URL when configured; otherwise logs the message (development). */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transport?: nodemailer.Transporter;
  private from: string;

  constructor(config: ConfigService) {
    const cfg = config.get<AppConfig>('app')!;
    this.from = cfg.mail.from;
    if (cfg.mail.smtpUrl) this.transport = nodemailer.createTransport(cfg.mail.smtpUrl);
  }

  async send(to: string, subject: string, text: string) {
    if (!this.transport) {
      this.logger.log(`[mail disabled] to=${to} subject="${subject}" body="${text}"`);
      return;
    }
    await this.transport.sendMail({ from: this.from, to, subject, text });
  }
}
