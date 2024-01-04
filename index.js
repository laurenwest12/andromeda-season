const express = require('express');
const app = express();

const { type } = require('./config');
const { andromedaAuthorization } = require('./authorization');
const { getStartTime } = require('./functions/getStartTime');
const { getXlxs, sendErrorReport } = require('./functions/errorReporting');
const { getSQLServerData, executeProcedure } = require('./sql');
const { updateLivePeriod, forceDownCostSheet } = require('./andromeda');

// const server = app.listen(6009, async () => {
const main = async () => {
  console.log('Andromeda Live Season is running...');
  const errors = [];

  try {
    await andromedaAuthorization();

    // LiveSeason
    await executeProcedure('[Andromeda-DownFrom].[dbo].[PopulateLiveSeason]');
    const season = await getSQLServerData(
      'SELECT * FROM [Andromeda-DownFrom].[dbo].[LiveSeason]'
    );
    const seasonErrs = await updateLivePeriod(season, 'cat170', 'LiveSeason');
    seasonErrs?.length && errors.push(seasonErrs);

    // Live Finance Period
    await executeProcedure('PopulateLiveFinancialPeriod');
    const financial = await getSQLServerData(
      `SELECT * FROM LiveFinancialPeriod`
    );
    // Update the live period in Andromeda
    const financialErrs = await updateLivePeriod(
      financial,
      'cat450',
      'LiveFinancialPeriod'
    );
    financialErrs?.length && errors.push(financialErrs);

    // Live NuOrder Period
    await executeProcedure('PopulateLiveNuOrderPeriod');
    const nuorder = await getSQLServerData(`SELECT * FROM LiveNuOrderPeriod`);
    const nuorderErrs = await updateLivePeriod(
      nuorder,
      'cat451',
      'SeasonalSetting'
    );
    nuorderErrs?.length && errors.push(nuorderErrs);

    // Live Production Period
    await executeProcedure('PopulateLiveProductionPeriod');
    const production = await getSQLServerData(
      'SELECT * FROM LiveProductionPeriod'
    );
    const productionErrs = await updateLivePeriod(
      production,
      'cat452',
      'LiveProductionPeriod'
    );
    productionErrs?.length && errors.push(productionErrs);

    // const forceErrs = await forceDownCostSheet();
    // const errors = [...updateErrs, ...forceErrs];

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
