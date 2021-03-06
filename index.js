const express = require('express');
const app = express();

const { type } = require('./config');
const { andromedaAuthorization } = require('./authorization');
const { getStartTime } = require('./functions/getStartTime');
const { getXlxs, sendErrorReport } = require('./functions/errorReporting');
const { getSQLServerData } = require('./sql');
const { updateLiveSeason } = require('./andromeda');

const server = app.listen(6009, async () => {
	console.log('App is listening...');
	let authorizationResult = await andromedaAuthorization();

	if (authorizationResult.indexOf('Error') === -1) {
		console.log('Authorization complete');

		const processErr = await getSQLServerData('EXEC PopulateLiveSeason');

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
