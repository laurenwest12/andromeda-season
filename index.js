const express = require('express');
const app = express();

const { type } = require('./config');
const { andromedaAuthorization } = require('./authorization');
const { getStartTime } = require('./functions/getStartTime');
const { getXlxs, sendErrorReport } = require('./functions/errorReporting');
const { getSQLServerData, executeProcedure } = require('./sql');
const { updateLiveSeason, forceDownCostSheet } = require('./andromeda');

// const server = app.listen(6009, async () => {
const main = async () => {
  console.log('Andromeda Live Season is running...');

  try {
    await andromedaAuthorization();
    await executeProcedure('PopulateLiveSeason');
    const data = await getSQLServerData(`SELECT * FROM LiveSeason`);
    const updateErrs = await updateLiveSeason(data);
    const forceErrs = await forceDownCostSheet();
    const errors = [...updateErrs, ...forceErrs];

    if (errors.flat().length) {
      getXlxs(errors.flat());
      await sendErrorReport(type);
    }
    process.exit(0);
  } catch (err) {
    console.log(err);
    process.exit(1);
  }
};

main();

// Register an unhandled exception handler
process.on('uncaughtException', async (err) => {
  // Exit the application with an error code
  process.exit(1);
});

// Register an unhandled exception handler
process.on('unhandledRejection', async (err) => {
  // Exit the application with an error code
  process.exit(1);
});
