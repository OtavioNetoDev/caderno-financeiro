const nodemailer = require('nodemailer');

let transporter;

function getTransporter() {
  if (!process.env.SMTP_HOST) {
    return null;
  }
  transporter =
    transporter ||
    nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    });
  return transporter;
}

// Sem SMTP configurado (desenvolvimento), o conteúdo vai para o console do servidor.
async function sendMail({ to, subject, text }) {
  const mailer = getTransporter();
  if (!mailer) {
    console.log(`\n[e-mail não configurado]\nPara: ${to}\nAssunto: ${subject}\n${text}\n`);
    return false;
  }
  await mailer.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to,
    subject,
    text,
  });
  return true;
}

module.exports = { sendMail };
