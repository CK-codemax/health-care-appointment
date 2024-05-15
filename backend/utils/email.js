const nodemailer = require('nodemailer');

const newEmail = async options => {
  // 1) Create a transporter
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    //secure: false, 
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD
    }
  });

  // 2) Define the email options
  const mailOptions = {
    from: 'No Reply <noreply@health-care.com',
    to: options.email,
    subject: options.subject,
    text: options.message
    // html:
  };

  console.log(mailOptions);

  // 3) Actually send the email
  //await transporter.sendMail(mailOptions);
  try {
    await transporter.sendMail(mailOptions);
    console.log('Email sent successfully!');
  } catch (error) {
    console.error('Error sending email:', error);
  }
};

module.exports = newEmail;
