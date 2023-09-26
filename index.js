const express = require('express');
const app = express();

const { type } = require('./config');
const { andromedaAuthorization } = require('./authorization');
const { getStartTime } = require('./functions/getStartTime');
const { getXlxs, sendErrorReport } = require('./functions/errorReporting');
const { getSQLServerData, executeProcedure } = require('./sql');
const { updateLiveSeason } = require('./andromeda');

const server = app.listen(6009, async () => {
	console.log('Andromeda season is running...');
	let authorizationResult = await andromedaAuthorization();

	if (authorizationResult.indexOf('Error') === -1) {
		console.log('Authorization complete');

		const processErr = await executeProcedure('PopulateLiveSeason');

		if (processErr.indexOf('Error') !== -1) {
			process.kill(process.pid, 'SIGTERM');
		} else {
			const liveSeason = await getSQLServerData(
				`SELECT * FROM LiveSeason`
			);

			const updateErrs = await updateLiveSeason(liveSeason);

			if (updateErrs.length > 0) {
				getXlxs(updateErrs);
				await sendErrorReport(type);
			}

			process.kill(process.pid, 'SIGTERM');
		}
	} else {
		process.kill(process.pid, 'SIGTERM');
	}
});

process.on('SIGTERM', () => {
	server.close(() => {
		console.log('Process terminated');
	});
});

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
