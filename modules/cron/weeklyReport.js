const cron = require('node-cron');
const nodemailer = require('nodemailer');
const informeRouter = require('../informe/router');

// Configuración de Nodemailer (usa las credenciales que se estimen para dtorres@tcyc.cl)
// Si ya hay un transporter en otro módulo, se podría importar. Por ahora creamos uno básico:
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 465,
    secure: true,
    auth: {
        user: process.env.EMAIL_USER || 'dtorres@tcyc.cl',
        pass: process.env.EMAIL_PASS || 'tu_contraseña_de_aplicacion' 
    }
});

function generateEmailHTML(data) {
    const totalPipeline = data.crm.negociacion.reduce((sum, item) => sum + item[2], 0) +
                          data.crm.enviar_cot.reduce((sum, item) => sum + item[2], 0) +
                          data.crm.retomar_top3.reduce((sum, item) => sum + (item[2] || 0), 0);

    return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #2c3e50; border: 1px solid #eef2f5; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
        
        <!-- Header -->
        <div style="background-color: #1a3a5c; padding: 30px 20px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 24px; color: #ffffff;">Informe Comercial Gerencia CyC</h1>
            <p style="margin: 5px 0 0; color: #a8c0d6; font-size: 14px;">Semana Activa · Resumen Ejecutivo</p>
        </div>

        <!-- Body -->
        <div style="padding: 30px 20px; background-color: #ffffff;">
            
            <p style="font-size: 15px; line-height: 1.5; color: #34495e;">
                Hola equipo,<br><br>
                A continuación se presenta el resumen ejecutivo del estado comercial y de operatividad de la flota correspondiente a esta semana.
            </p>

            <!-- Metrics Box 1: Flota -->
            <div style="margin-top: 25px; padding: 20px; background-color: #f8fafc; border-left: 4px solid #27ae60; border-radius: 6px;">
                <h3 style="margin: 0 0 15px; color: #1a3a5c; font-size: 16px;">🚛 Arriendo y Flota</h3>
                <div style="display: flex; justify-content: space-between;">
                    <div>
                        <span style="font-size: 24px; font-weight: bold; color: #27ae60;">${data.flota.operatividad['Operativo']}</span><br>
                        <span style="font-size: 12px; color: #7f8c8d;">Operativos</span>
                    </div>
                    <div>
                        <span style="font-size: 24px; font-weight: bold; color: #f39c12;">${data.flota.operatividad['Taller']}</span><br>
                        <span style="font-size: 12px; color: #7f8c8d;">En Taller</span>
                    </div>
                    <div>
                        <span style="font-size: 24px; font-weight: bold; color: #e74c3c;">${data.flota.operatividad['Panne']}</span><br>
                        <span style="font-size: 12px; color: #7f8c8d;">En Panne</span>
                    </div>
                </div>
            </div>

            <!-- Metrics Box 2: Pipeline -->
            <div style="margin-top: 20px; padding: 20px; background-color: #f8fafc; border-left: 4px solid #f39c12; border-radius: 6px;">
                <h3 style="margin: 0 0 10px; color: #1a3a5c; font-size: 16px;">📊 Pipeline CRM Activo</h3>
                <p style="margin: 0; font-size: 28px; font-weight: bold; color: #f39c12;">$${totalPipeline}M</p>
                <p style="margin: 5px 0 0; font-size: 12px; color: #7f8c8d;">Valor estimado en negocios en curso</p>
            </div>

            <!-- Metrics Box 3: Cobranza -->
            <div style="margin-top: 20px; padding: 20px; background-color: #f8fafc; border-left: 4px solid #e74c3c; border-radius: 6px;">
                <h3 style="margin: 0 0 10px; color: #1a3a5c; font-size: 16px;">💳 Facturación Crítica</h3>
                <div style="display: flex; justify-content: space-between;">
                    <div>
                        <span style="font-size: 24px; font-weight: bold; color: #2563a8;">$${data.facturacion.nopag_total}M</span><br>
                        <span style="font-size: 12px; color: #7f8c8d;">Por Cobrar Total</span>
                    </div>
                    <div>
                        <span style="font-size: 24px; font-weight: bold; color: #e74c3c;">${data.facturacion.venc_count}</span><br>
                        <span style="font-size: 12px; color: #7f8c8d;">Facturas Vencidas</span>
                    </div>
                </div>
            </div>

            <!-- CTA -->
            <div style="text-align: center; margin-top: 35px; margin-bottom: 20px;">
                <a href="${process.env.APP_URL || 'http://localhost:3000'}/informe/index.html" 
                   style="background-color: #2563a8; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
                   Ver Dashboard Completo
                </a>
            </div>

        </div>

        <!-- Footer -->
        <div style="background-color: #f4f6f8; padding: 15px; text-align: center; color: #95a5a6; font-size: 11px;">
            Este correo es generado automáticamente por CYC Hub.<br>
            © ${now = new Date().getFullYear()} Transportes CYC.
        </div>
    </div>
    `;
}

async function sendWeeklyReport() {
    try {
        console.log('[CRON] Obteniendo datos para informe semanal...');
        const data = informeRouter.getReportDataInternal();
        const htmlContent = generateEmailHTML(data);

        const mailOptions = {
            from: '"Gerencia CYC" <' + (process.env.EMAIL_USER || 'dtorres@tcyc.cl') + '>',
            to: process.env.GERENCIA_EMAILS || 'gerencia@tcyc.cl, equipo@tcyc.cl', // Destinatarios
            subject: '📊 Informe Comercial CyC - Resumen Semanal',
            html: htmlContent
        };

        console.log(`[CRON] Enviando correo semanal a: ${mailOptions.to}`);
        
        // En producción des-comentar para enviar
        // const info = await transporter.sendMail(mailOptions);
        // console.log('[CRON] Correo enviado: ', info.messageId);
        
        console.log('[CRON] Simulación de correo enviado con éxito (elimina comentarios para enviar real).');

    } catch (error) {
        console.error('[CRON] Error enviando correo:', error);
    }
}

// Programar el Cron: Todos los lunes a las 15:00 hrs
// 0 15 * * 1  -> M=0, H=15, DOM=*, MON=*, DOW=1 (Lunes)
cron.schedule('0 15 * * 1', () => {
    console.log('[CRON] Ejecutando tarea: Informe Semanal (Lunes 15:00)');
    sendWeeklyReport();
});

// Función exportada si se desea forzar envío vía API/Admin
module.exports = {
    sendWeeklyReport
};
