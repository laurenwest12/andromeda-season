const axios = require('axios');
const { andromedaAuthorization } = require('./authorization');
const { url } = require('./config');

const getAndromedaData = async (query, start) => {
	try {
		let res;

		//Custom query example
		res = await axios.post(`${url}/search/query/${query}`, {
			getafterdate: start,
		});

		//Andromeda table example
		res = await axios.get(`${url}/bo/table`);

		const { data } = res;
	} catch (err) {
		return err;
	}
};

const updateLiveSeason = async (data) => {
	let errs = [];
	for (let i = 0; i < data.length; ++i) {
		if (i % 1000 === 0) {
			await andromedaAuthorization();
			console.log('New session requested');
		}

		const { LiveSeason, Style, idStyle } = data[i];

		try {
			const res = await axios.post(
				`${url}/bo/DevelopmentStyle/${idStyle}`,
				{
					Entity: {
						cat170: LiveSeason,
					},
				}
			);

			if (!res.data.IsSuccess) {
				errs.push({
					Style,
					idStyle,
					err: res.data.Result,
				});
			}

			console.log(Style, idStyle);
		} catch (error) {
			console.log(Style, idStyle, error.message);
			errs.push({
				Style,
				idStyle,
				err: error.message,
			});
		}
	}
	return errs;
};

module.exports = {
	getAndromedaData,
	updateLiveSeason,
};
