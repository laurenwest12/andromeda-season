const axios = require('axios');
const { andromedaAuthorization } = require('./authorization');
const { url } = require('./config');
const { getSQLServerData, submitQuery } = require('./sql');

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
    // For every 100 records, request a new session
    if (i % 100 === 0) {
      await andromedaAuthorization();
      console.log('New session requested');
    }

    // Extract the style and the id of that style in Andromeda
    const { Style, idStyle } = data[i];

    // Get the field value from the data
    const season = data[i][field];

    // Initialize the Andromeda body with the field to update
    let body = { Entity: {} };
    body.Entity[cat] = season.trim();

    try {
      // Update the style in Andromeda
      const res = await axios.post(
        `${url}/bo/DevelopmentStyle/${idStyle}`,
        body
      );

      // If the request is not successful, push the error to the errors array
      if (!res.data.IsSuccess) {
        console.log('Andromeda error', res?.data?.Result)
        errs.push({
          Style,
          idStyle,
          field,
          err: res.data.Result,
        });
      }
    } catch (error) {
      // If there is an unexpected error, push the error to the errors array
      console.log('Catch erorr', Style, idStyle, error.message);
      errs.push({
        Style,
        idStyle,
        field,
        err: error.message,
      });

      if (error.message === 'Request failed with status code 404') {
        await deleteStyle(idStyle)
      }
    }
  }
  return errs;
};

const forceDownCostSheet = async () => {
  const errors = [];
  // If the live production period changed in this run, join onto the CostSheet for the live production season and force it down from Andromeda
  const production = await getSQLServerData(`SELECT [LiveProductionPeriod]
	,S.[Style]
	,S.[idStyle]
	,C.[idCost]
FROM [dbo].[LiveProductionPeriod] S
INNER JOIN [Andromeda-DownFrom].[dbo].[CostSheetHeaderImportArchive] C
on S.idStyle = C.idStyle
and C.MostRecent = 'Yes'
and C.Season = LiveProductionPeriod
and C.ERPReady = 'Yes'`);

  // If the live financial period changed in this run, join onto the CostSheet for the live financial season and force it down from Andromeda
  const finance = await getSQLServerData(`SELECT [LiveFinancialPeriod]
  ,S.[Style]
  ,S.[idStyle]
  ,C.[idCost]
  FROM [dbo].[LiveFinancialPeriod] S
  INNER JOIN [Andromeda-DownFrom].[dbo].[CostSheetHeaderImportArchive] C
  on S.idStyle = C.idStyle
  and C.MostRecent = 'Yes'
  and C.Season = LiveFinancialPeriod
  and C.ERPReady = 'Yes'`);

  const data = [...production, ...finance];

  for (let sheet of data) {
    const { idStyle, Style, idCost } = sheet;
    try {
      // For any cost sheets that need to be forced down, update the IsExportReady field to true. The value will already have been true in Andromeda as shown in queries above, however this will force the cost sheet to come back from Andromeda so that it can process through the ERP.
      const res = await axios.post(`${url}/bo/CostSheet/${idCost}`, {
        isexportready: true,
      });

      // If the request is not successful, push the error to the errors array
      if (!res?.data?.IsSuccess) {
        errors.push({
          Style,
          idStyle,
          field: 'Force Down Cost Sheet',
          err: res?.data?.Result,
        });
      }
    } catch (err) {
      errors.push({
        Style,
        idStyle,
        field: 'Force Down Cost Sheet',
        err: err?.message,
      });
    }
  }
  // Return any errors
  return errors;
};

const deleteStyle = async (idStyle) => {
  try {
    console.log(idStyle)
    // Delete style related data
    await submitQuery(`INSERT INTO [Andromeda-DownFrom].[dbo].[StyleDeleted] SELECT *, CURRENT_TIMESTAMP FROM [Andromeda-DownFrom].[dbo].[StyleImportArchive] WHERE idStyle = ${idStyle}`)
    await getSQLServerData(
      `DELETE FROM [Andromeda-DownFrom].[dbo].[StyleImportArchive] WHERE idStyle = ${idStyle}`
    );
    await getSQLServerData(
      `DELETE FROM [ECDB].[dbo].[StyleProfileDetail] WHERE id_style = ${idStyle}`
    );

    // Delete style color related data
    await submitQuery(`INSERT INTO [Andromeda-DownFrom].[dbo].[StyleColorDeleted] SELECT *, CURRENT_TIMESTAMP FROM [Andromeda-DownFrom].[dbo].[StyleColorImportArchive] WHERE idStyle = ${idStyle}`)
    await getSQLServerData(
      `DELETE FROM [Andromeda-DownFrom].[dbo].[StyleColorImportArchive] WHERE idStyle = ${idStyle}`
    );
    await getSQLServerData(
      `DELETE FROM [ECDB].[dbo].[StyleColorProfileDetail] WHERE id_style = ${idStyle}`
    );
  } catch (err) {
    console.log(err)
    return err;
  }
};

module.exports = {
  getAndromedaData,
  updateLivePeriod,
  forceDownCostSheet,
};
