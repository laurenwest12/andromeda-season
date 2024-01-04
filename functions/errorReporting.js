const { email, emailPass } = require('../config');
const nodemailer = require('nodemailer');
const xl = require('excel4node');
const fs = require('fs');

const getXlxs = (arr) => {
  //Create a new Excel sheet
  let wb = new xl.Workbook();
  ws = wb.addWorksheet('Errors');

  //Add headers
  ws.cell(1, 1).string('Style');
  ws.cell(1, 2).string('idStyle');
  ws.cell(1, 3).string('Type');
  ws.cell(1, 4).string('Error');

  //Loop through the error array to add to the worksheet
  for (let i = 0; i < arr.length; ++i) {
    let error = arr[i];
    let row = i + 2;

    if (error.Style) {
      ws.cell(row, 1).string(error.Style);
    }

    if (error.idStyle) {
      ws.cell(row, 2).string(error.idStyle.toString());
    }

    if (error.field) {
      ws.cell(row, 3).string(error.field.toString());
    }

    if (error.err) {
      ws.cell(row, 4).string(error.err);
    }
  }

  //Save the error file to the current directory
  wb.write('AndromedaErrorReport.xlsx');
};

const sendErrorReport = async (type) => {
  let transporter = nodemailer.createTransport({
    host: 'smtp-mail.outlook.com',
    secure: false,
    port: 587,
    auth: {
      user: email,
      pass: emailPass,
    },
  });

  await transporter.sendMail({
    from: '"Lauren West" <lwest@echodesign.com>',
    to: `${email}`,
    subject: `Andromeda ${type} Error Report`,
    text: `Attached are the errors from the Andromeda ${type} update.`,
    attachments: [
      {
        filename: 'AndromedaErrorReport.xlsx',
        path: './AndromedaErrorReport.xlsx',
        contentType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    ],
  });

  fs.unlinkSync('./AndromedaErrorReport.xlsx');
};

module.exports = {
  getXlxs,
  sendErrorReport,
};
