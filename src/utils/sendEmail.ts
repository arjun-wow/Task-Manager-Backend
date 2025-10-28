import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

const sendEmail = async (options: EmailOptions) => {
  // 1. Create transporter with Brevo SMTP
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp-relay.brevo.com',
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    secure: false, // Brevo uses STARTTLS on 587
  });

  // 2. Mail options
  const mailOptions = {
    from: process.env.EMAIL_FROM || `"WeManage" <${process.env.EMAIL_USER}>`,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
  };

  // 3. Send email
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', info.messageId);
    return info;
  } catch (error) {
    console.error('❌ Error sending email:', error);
    throw new Error('Email could not be sent due to transport error.');
  }
};

export default sendEmail;
