const { from_email, from_pass } = require('../../globalConfig');
const { toEmail, type } = require('../config');

const nodemailer = require('nodemailer');
const XLSX = require('xlsx');

const generateXlsx = async (array) => {
  // Step 1: Dynamically get all unique keys from the array
  const allKeys = Array.from(new Set(array.flatMap((obj) => Object.keys(obj))));

  // Step 2: Normalize the data (fill missing keys with empty values)
  const normalizedData = array.map((obj) => {
    const normalizedObj = {};
    allKeys.forEach((key) => {
      normalizedObj[key] = obj[key] || ''; // Fill missing keys with empty strings
    });
    return normalizedObj;
  });

  // Step 3: Create an XLSX workbook and worksheet
  const worksheet = XLSX.utils.json_to_sheet(normalizedData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Error Report');

  // Step 4: Write the workbook to a buffer
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  return buffer;
};

const sendErrorEmail = async (array) => {
  // Step 1: Generate the XLSX file
  const xlsxBuffer = await generateXlsx(array);
  // Step 2: Configure the email transporter
  const transporter = nodemailer.createTransport({
    host: 'smtp.office365.com', // Try Office 365 SMTP
    port: 587,
    secure: false,
    auth: {
      user: from_email,
      pass: from_pass,
    },
  });

  // Step 3: Send the email with the XLSX attachment
  await transporter.sendMail({
    from: from_email,
    to: toEmail,
    subject: `Andromeda ${type} Error Report`,
    text: `Attached are the errors from ${type}.`,
    attachments: [
      {
        filename: 'ErrorReport.xlsx',
        content: xlsxBuffer,
      },
    ],
  });
};

module.exports = { sendErrorEmail };
