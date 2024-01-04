const axios = require('axios');
const { andromedaAuthorization } = require('./authorization');
const { url } = require('./config');
const { getSQLServerData } = require('./sql');

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

const updateLivePeriod = async (data, cat, field) => {
  let errs = [];
  for (let i = 0; i < data.length; ++i) {
    if (i % 1000 === 0) {
      await andromedaAuthorization();
      console.log('New session requested');
    }

    const { Style, idStyle } = data[i];
    const season = data[i][field];
    let body = { Entity: {} };
    body.Entity[cat] = season.trim();

    try {
      const res = await axios.post(
        `${url}/bo/DevelopmentStyle/${idStyle}`,
        body
      );

      if (!res.data.IsSuccess) {
        errs.push({
          Style,
          idStyle,
          field,
          err: res.data.Result,
        });
      }

      console.log(Style, idStyle);
    } catch (error) {
      console.log(Style, idStyle, error.message);
      errs.push({
        Style,
        idStyle,
        field,
        err: error.message,
      });
    }
  }
  return errs;
};

const forceDownCostSheet = async () => {
  const errors = [];
  const data = await getSQLServerData(`SELECT [LiveFinancialPeriod]
	,S.[Style]
	,S.[idStyle]
	,C.[idCost]
FROM [dbo].[LiveFinancialPeriod] S
INNER JOIN [Andromeda-DownFrom].[dbo].[CostSheetHeaderImportArchive] C
on S.idStyle = C.idStyle
and C.CostSheetName = 'LINE PLAN'
and C.MostRecent = 'Yes'
and C.Season = LiveFinancialPeriod
and C.ERPReady = 'Yes'`);

  for (let sheet of data) {
    const { idStyle, Style, idCost } = sheet;
    try {
      const res = await axios.post(`${url}/bo/CostSheet/${idCost}`, {
        isexportready: true,
      });

      if (!res?.data?.IsSuccess) {
        errors.push({
          Style,
          idStyle,
          field: 'Force Down Cost Sheet',
          err: res?.data?.Result,
        });
      }
    } catch (err) {
      console.log(err);
      errors.push({
        Style,
        idStyle,
        field: 'Force Down Cost Sheet',
        err: err?.message,
      });
    }
  }
  return errors;
};

module.exports = {
  getAndromedaData,
  updateLivePeriod,
  forceDownCostSheet,
};
