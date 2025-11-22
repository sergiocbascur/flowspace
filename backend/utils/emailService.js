import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false, // true para 465, false para otros puertos
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

export async function sendVerificationEmail(email, code) {
    try {
        const mailOptions = {
            from: `"FlowSpace" <${process.env.SMTP_USER}>`,
            to: email,
            subject: 'Código de Verificación - FlowSpace',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #2563eb;">Código de Verificación</h2>
                    <p>Tu código de verificación para FlowSpace es:</p>
                    <div style="background: #f3f4f6; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
                        ${code}
                    </div>
                    <p>Este código expira en 10 minutos.</p>
                    <p style="color: #6b7280; font-size: 12px;">Si no solicitaste este código, ignora este email.</p>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Error enviando email:', error);
        return { success: false, error: error.message };
    }
}

export async function sendPasswordResetEmail(email, token) {
    try {
        const resetUrl = `${process.env.FRONTEND_URL || 'https://flowspace.farmavet-bodega.cl'}/reset?token=${token}`;
        
        const mailOptions = {
            from: `"FlowSpace" <${process.env.SMTP_USER}>`,
            to: email,
            subject: 'Recuperar Contraseña - FlowSpace',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #2563eb;">Recuperar Contraseña</h2>
                    <p>Has solicitado recuperar tu contraseña. Usa el siguiente código:</p>
                    <div style="background: #f3f4f6; padding: 20px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 3px; margin: 20px 0;">
                        ${token}
                    </div>
                    <p>O haz clic en el siguiente enlace:</p>
                    <a href="${resetUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
                        Recuperar Contraseña
                    </a>
                    <p>Este código expira en 1 hora.</p>
                    <p style="color: #6b7280; font-size: 12px;">Si no solicitaste esto, ignora este email.</p>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Error enviando email:', error);
        return { success: false, error: error.message };
    }
}

