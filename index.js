// process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0;
const { andromedaAuthorization } = require('./authorization');
const { sendErrorEmail } = require('./functions/errorReporting');
const { getSQLServerData, executeProcedure } = require('./sql');
const { updateLivePeriod, forceDownCostSheet } = require('./andromeda');

// const server = app.listen(6009, async () => {
const main = async () => {
  console.log('Andromeda Live Season is running...');
  try {
    // Authorize connection to Andromeda API
    await andromedaAuthorization();

    // Live Season
    // Run procedure to generate the live season for each style and find any that don't match
    // This is done by checking in StyleProfile for the season that is marked MostCurrentSeasonFlag = 'Yes' and comapring that season to the value in LiveSeason in Andromeda
    await executeProcedure('[Andromeda-DownFrom].[dbo].[PopulateLiveSeason]');
    const season = await getSQLServerData(
      'SELECT * FROM [Andromeda-DownFrom].[dbo].[LiveSeason]'
    );
    // Update the LiveSeason field
    const seasonErrs = await updateLivePeriod(season, 'cat170', 'LiveSeason');

    // Live Finance Period
    // Run procedure to generate the live financial period for each style and find any that don't match
    // This is done by checking in StyleProfile for the season that is marked MostCurrentSeasonFlag = 'Yes' and comapring that season to the value in LiveFinancialPeriod in Andromeda
    await executeProcedure('PopulateLiveFinancialPeriod');
    const financial = await getSQLServerData(
      `SELECT * FROM LiveFinancialPeriod`
    );
    // Update the Live Financial Period in Andromeda
    const financialErrs = await updateLivePeriod(
      financial,
      'cat450',
      'LiveFinancialPeriod'
    );

    // Live NuOrder Period
    // Run the procedure to generate the live nuorder period for each style and find any that don't match
    // This is done by checking in StyleProfileDetail for the season that is marked LiveNuOrderPeriod and changed it if it does not match what is in the Andromeda field for LiveNuOrderPeriod on that style
    await executeProcedure('PopulateLiveNuOrderPeriod');
    const nuorder = await getSQLServerData(`SELECT * FROM LiveNuOrderPeriod`);
    // Update the Live NuOrder Period in Andromeda
    const nuorderErrs = await updateLivePeriod(
      nuorder,
      'cat451',
      'SeasonalSetting'
    );

    // Live Production Period
    // Run the procedure to generate the live production period for each style and find any that don't match
    // This is done by checking in StyleProfileDetail for the season that is marked LiveProductionPeriod and changed it if it does not match what is in the Andromeda field for LiveProductionPeriod on that style
    await executeProcedure('PopulateLiveProductionPeriod');
    const production = await getSQLServerData(
      'SELECT * FROM LiveProductionPeriod'
    );
    // Update the Live Production Period in Andromeda
    const productionErrs = await updateLivePeriod(
      production,
      'cat452',
      'LiveProductionPeriod'
    );

    // If the live production period or live financial period have changed, force the cost sheet to come back from from Andromeda so that it can process through the ERP.
    const forceErrs = await forceDownCostSheet();

    // If there are any errors, send an email with the errors
    const errors = [
      ...seasonErrs,
      ...financialErrs,
      ...nuorderErrs,
      ...productionErrs,
      ...forceErrs,
    ];

    if (errors.flat().length) {
      await sendErrorEmail(errors.flat());
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
