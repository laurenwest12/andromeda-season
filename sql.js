// const sql = require('msnodesqlv8');
// const { server, database, driver } = require('./config');

// const connectionString = `server=${server};Database=${database};Trusted_Connection=Yes;Driver=${driver}`;

const sql = require('mssql');
const { server, database, sqlUser, sqlPass } = require('./config.js');

const pool = new sql.ConnectionPool({
  user: sqlUser,
  password: sqlPass,
  server,
  database,
  trustServerCertificate: true,
  requestTimeout: 500000,
  encrypt: false,
});

const connectDb = async () => {
  try {
    await pool.connect();
  } catch (err) {
    throw err;
  }
};

const getLastRunTime = async (program) => {
  try {
    await connectDb();
    const res = await pool.query(
      `SELECT TOP 1 * FROM AndromedaSchedule WHERE Program = '${program}' ORDER BY CAST(LastRunTime as datetime) DESC`
    );
    return res?.recordset;
  } catch (err) {
    throw err;
  }
};

// const getLastRunTime = async (program) => {
// 	return new Promise(async (resolve) => {
// 		try {
// 			await sql.query(
// 				connectionString,
// 				`SELECT TOP 1 * FROM AndromedaSchedule WHERE Program = '${program}' ORDER BY CAST(LastRunTime as datetime) DESC`,
// 				(err, rows) => {
// 					err ? resolve(`Error: ${err}`) : resolve(rows);
// 				}
// 			);
// 		} catch (err) {
// 			resolve(`Error: ${err}`);
// 		}
// 	});
// };

const getSQLServerData = async (query) => {
  await connectDb();
  try {
    await connectDb();
    const res = await pool.query(query);
    return res?.recordset;
  } catch (err) {
    throw err;
  }
};

// const getSQLServerData = async (query) => {
// 	return new Promise(async (resolve) => {
// 		try {
// 			await sql.query(connectionString, query, (err, rows) => {
// 				err ? resolve(`Error: ${err}`) : resolve(rows);
// 			});
// 		} catch (err) {
// 			resolve(`Error: ${err}`);
// 		}
// 	});
// };

const insertTableStatement = (table, fields, values) => {
  return `SELECT *
    INTO ${table}
    FROM (VALUES ${values}) t1 ${fields}`;
};

const insertStatement = (table, fields, values) => {
  return `INSERT INTO ${table} SELECT * FROM (VALUES ${values}) t1 ${fields}`;
};

const submitQuery = async (query) => {
  try {
    await connectDb();
    await pool.query(query);
    return `Complete`;
  } catch (err) {
    throw err;
  }
};

// const submitQuery = async (query) => {
// 	return new Promise(async (resolve) => {
// 		try {
// 			await sql.query(connectionString, query, (err, rows) => {
// 				err ? resolve(`Error: ${err.message}`) : resolve('Complete');
// 			});
// 		} catch (err) {
// 			resolve(`Error: ${err}`);
// 		}
// 	});
// };

const executeProcedure = async (proc) => {
  try {
    await connectDb();
    await pool.request().execute(proc);
    return `Complete`;
  } catch (err) {
    throw err;
  }
};

const submitAllQueries = async (fn, data, table, fields) => {
  const errors = [];
  for (let i = 0; i < data.length; ++i) {
    const values = await fn(data[i]);
    const query = insertStatement(table, fields, values);
    const res = await submitQuery(query);
    if (res.indexOf('Error') !== -1) {
      errors.push({ query, err: res, type: table });
    }
  }
  return errors;
};

module.exports = {
  getLastRunTime,
  getSQLServerData,
  executeProcedure,
  submitQuery,
  submitAllQueries,
};
