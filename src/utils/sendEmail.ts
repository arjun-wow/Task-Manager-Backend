    import nodemailer from 'nodemailer';

    interface EmailOptions {
      to: string;
      subject: string;
      text: string;
      html?: string;
    }

    const sendEmail = async (options: EmailOptions) => {
      const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp-relay.brevo.com',
        port: parseInt(process.env.EMAIL_PORT || '587', 10),
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
        secure: true, 
        debug: true,   
        logger: true   
      });

      const mailOptions = {
        from: process.env.EMAIL_FROM || `"WeManage" <${process.env.EMAIL_USER}>`,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      };

      try {
        console.log('Attempting to send email...'); 
        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Email sent successfully:', info.messageId);
        
        return info;
      } catch (error) {
        console.error('❌ Error sending email:', error);
        if (error instanceof Error) {
            console.error(`Error Code: ${(error as any).code}`);
            console.error(`Error Command: ${(error as any).command}`);
        }
        throw new Error('Email could not be sent due to transport error.');
      }
    };

    export default sendEmail;
    

