const sql = require("mssql");
let poolPromise;
const config = {
  user: "ggadmin",
  password: "b4b5AzU9pPs$$L27",
  server: "ggportal.database.windows.net",
  database: "ggdbmain01",
  options: {
    encrypt: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

function getPool() {
  if (!poolPromise) {
    poolPromise = sql.connect(config);
  }
  return poolPromise;
}

async function closePool() {
  if (poolPromise) {
    try {
      await sql.close();
      poolPromise = null;
    } catch (err) {
      console.error("Error closing the connection pool:", err);
    }
  }
}

process.on("SIGINT", async () => {
  await closePool();
  process.exit(0);
});

const getPagination = (current, pageSize, total = 0) => {
  return { current, pageSize, total };
};

module.exports = {
  getPagination,
  getPool,
};
