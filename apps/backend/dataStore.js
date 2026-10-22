const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const defaultState = {
  users: [],
  bikes: [],
  bookings: [],
  payments: [],
  settlements: [],
  wallets: {
    superAdmin: {
      mobile: '9024280547',
      balance: 0,
      totalCommission: 0,
      totalGrossReceived: 0,
      totalPaidToAdmins: 0,
    },
    admins: {},
  },
};

const legacyDataFile = process.env.APP_DATA_FILE
  ? path.resolve(process.env.APP_DATA_FILE)
  : path.join(__dirname, 'data', 'app-data.json');
const accountTables = {
  USER: 'user_accounts',
  ADMIN: 'admin_accounts',
  SUPER_ADMIN: 'super_admin_accounts',
};
const accountTableNames = Object.values(accountTables);
const recordTables = {
  bookings: 'user_bookings',
  payments: 'user_payments',
  settlements: 'admin_settlements',
};
const allDataTables = [
  ...accountTableNames,
  'admin_bikes',
  ...Object.values(recordTables),
  'admin_wallets',
  'super_admin_wallets',
];

const normalizeState = (storedState) => ({
  ...defaultState,
  ...storedState,
  users: storedState.users || [],
  bikes: storedState.bikes || [],
  bookings: storedState.bookings || [],
  payments: storedState.payments || [],
  settlements: storedState.settlements || [],
  wallets: {
    ...defaultState.wallets,
    ...storedState.wallets,
    superAdmin: {
      ...defaultState.wallets.superAdmin,
      ...(storedState.wallets?.superAdmin || {}),
    },
    admins: storedState.wallets?.admins || {},
  },
});

const parseJson = (value, description) => {
  try {
    return JSON.parse(value);
  } catch (error) {
    throw new Error(`Unable to read ${description}: ${error.message}`);
  }
};

const requiredConfig = ['MYSQL_USER', 'MYSQL_DATABASE'];
const missingConfig = requiredConfig.filter(
  (key) => !process.env[key]
);
if (missingConfig.length > 0) {
  throw new Error(
    `Configure the following MySQL environment variables: ${missingConfig.join(', ')}`
  );
}

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: Number(process.env.MYSQL_CONNECTION_LIMIT || 10),
  queueLimit: 0,
  charset: 'utf8mb4',
});

let state;
let saveQueue = Promise.resolve();

const readJsonRows = async (table, positionColumn = true) => {
  const order = positionColumn ? ' ORDER BY position' : '';
  const [rows] = await pool.query(
    `SELECT data FROM \`${table}\`${order}`
  );
  return rows.map(({ data }) =>
    parseJson(data, `MySQL ${table} record`)
  );
};

const readBikes = async () => {
  const [rows] = await pool.query(
    'SELECT data, admin_mobile FROM admin_bikes ORDER BY position'
  );

  return rows.map(({ data, admin_mobile: adminMobile }) => ({
    ...parseJson(data, 'MySQL admin bike record'),
    adminMobile,
  }));
};

const readAccounts = async () => {
  const [rows] = await pool.query(`
    SELECT data, position FROM (
      SELECT data, position FROM user_accounts
      UNION ALL
      SELECT data, position FROM admin_accounts
      UNION ALL
      SELECT data, position FROM super_admin_accounts
    ) AS accounts
    ORDER BY position
  `);

  return rows.map(({ data }) =>
    parseJson(data, 'MySQL account record')
  );
};

const readTableExists = async (table) => {
  const [rows] = await pool.execute(
    `SELECT 1 FROM information_schema.tables
      WHERE table_schema = DATABASE() AND table_name = ?`,
    [table]
  );
  return rows.length > 0;
};

const readLegacyDatabaseState = async () => {
  const legacyTables = ['app_users', 'app_bikes', 'app_records', 'app_settings'];
  const existingTables = Object.fromEntries(
    await Promise.all(
      legacyTables.map(async (table) => [
        table,
        await readTableExists(table),
      ])
    )
  );

  if (!Object.values(existingTables).some(Boolean)) {
    return null;
  }

  const [users, bikes, records, settings] = await Promise.all([
    existingTables.app_users ? readJsonRows('app_users') : [],
    existingTables.app_bikes ? readJsonRows('app_bikes') : [],
    existingTables.app_records
      ? pool
          .query('SELECT collection, data FROM app_records ORDER BY position')
          .then(([rows]) =>
            rows.map(({ collection, data }) => ({
              collection,
              record: parseJson(data, `legacy ${collection} record`),
            }))
          )
      : [],
    existingTables.app_settings
      ? pool
          .query('SELECT `key`, value FROM app_settings')
          .then(([rows]) =>
            Object.fromEntries(
              rows.map(({ key, value }) => [
                key,
                parseJson(value, `legacy MySQL setting "${key}"`),
              ])
            )
          )
      : {},
  ]);

  const hasRecords =
    users.length + bikes.length + records.length > 0;
  if (!hasRecords && !settings.wallets) {
    return null;
  }

  return normalizeState({
    users,
    bikes,
    bookings: records
      .filter(({ collection }) => collection === 'bookings')
      .map(({ record }) => record),
    payments: records
      .filter(({ collection }) => collection === 'payments')
      .map(({ record }) => record),
    settlements: records
      .filter(({ collection }) => collection === 'settlements')
      .map(({ record }) => record),
    wallets: settings.wallets,
  });
};

const loadDatabaseState = async () => {
  const [allAccounts, bikes, bookings, payments, settlements,
    adminWalletRows, superAdminWalletRows, settings] = await Promise.all([
      readAccounts(),
      readBikes(),
      readJsonRows(recordTables.bookings),
      readJsonRows(recordTables.payments),
      readJsonRows(recordTables.settlements),
      readJsonRows('admin_wallets'),
      readJsonRows('super_admin_wallets', false),
      pool
        .query('SELECT `key`, value FROM super_admin_settings')
        .then(([rows]) => rows),
    ]);

  const storedSettings = Object.fromEntries(
    settings.map(({ key, value }) => [
      key,
      parseJson(value, `MySQL setting "${key}"`),
    ])
  );
  const adminWallets = Object.fromEntries(
    adminWalletRows.map((wallet) => [wallet.mobile, wallet])
  );

  return {
    state: normalizeState({
      users: allAccounts,
      bikes,
      bookings,
      payments,
      settlements,
      wallets: {
        superAdmin:
          superAdminWalletRows[0] || defaultState.wallets.superAdmin,
        admins: adminWallets,
      },
    }),
    isInitialized: Boolean(storedSettings.initialized),
    hasRecords:
      allAccounts.length +
        bikes.length +
        bookings.length +
        payments.length +
        settlements.length +
        adminWalletRows.length +
        superAdminWalletRows.length >
      0,
  };
};

const createTables = async () => {
  const createAccountTable = async (table) =>
    pool.query(`
      CREATE TABLE IF NOT EXISTS \`${table}\` (
        id VARCHAR(100) NOT NULL PRIMARY KEY,
        mobile VARCHAR(32) NOT NULL,
        role VARCHAR(32) NOT NULL,
        data LONGTEXT NOT NULL,
        position INT UNSIGNED NOT NULL,
        INDEX \`${table}_mobile_idx\` (mobile)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

  await Promise.all(accountTableNames.map(createAccountTable));
  await pool.query(`
    CREATE TABLE IF NOT EXISTS admin_bikes (
      id VARCHAR(100) NOT NULL PRIMARY KEY,
      admin_mobile VARCHAR(32) NOT NULL,
      data LONGTEXT NOT NULL,
      position INT UNSIGNED NOT NULL,
      INDEX admin_bikes_admin_mobile_idx (admin_mobile)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  for (const table of Object.values(recordTables)) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`${table}\` (
        id VARCHAR(100) NOT NULL PRIMARY KEY,
        data LONGTEXT NOT NULL,
        position INT UNSIGNED NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS admin_wallets (
      mobile VARCHAR(32) NOT NULL PRIMARY KEY,
      data LONGTEXT NOT NULL,
      position INT UNSIGNED NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS super_admin_wallets (
      id VARCHAR(32) NOT NULL PRIMARY KEY,
      data LONGTEXT NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS super_admin_settings (
      \`key\` VARCHAR(64) NOT NULL PRIMARY KEY,
      value LONGTEXT NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
};

const renameLegacyUserTable = async () => {
  const [rows] = await pool.execute(
    `SELECT table_name FROM information_schema.tables
      WHERE table_schema = DATABASE() AND table_name IN (?, ?)`,
    ['users', 'user_profiles']
  );
  const tableNames = new Set(rows.map(({ TABLE_NAME, table_name }) =>
    TABLE_NAME || table_name
  ));

  if (tableNames.has('users') && tableNames.has('user_profiles')) {
    throw new Error(
      'Both users and user_profiles tables exist; resolve the duplicate user tables before starting the backend'
    );
  }

  if (tableNames.has('users')) {
    await pool.query('RENAME TABLE `users` TO `user_profiles`');
  }
};

const countRows = async (connection, table) => {
  const [rows] = await connection.query(
    `SELECT COUNT(*) AS count FROM \`${table}\``
  );
  return Number(rows[0].count);
};

const persistState = async (snapshot) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    for (const table of allDataTables) {
      await connection.query(`DELETE FROM \`${table}\``);
    }
    await connection.query('DELETE FROM super_admin_settings');

    for (const [position, user] of snapshot.users.entries()) {
      const table = accountTables[user.role];
      if (!table) {
        throw new Error(`Cannot persist account with unknown role: ${user.role}`);
      }

      await connection.execute(
        `INSERT INTO \`${table}\` (id, mobile, role, data, position)
          VALUES (?, ?, ?, ?, ?)`,
        [
          String(user.id),
          user.mobile,
          user.role,
          JSON.stringify(user),
          position,
        ]
      );
    }

    for (const [position, bike] of snapshot.bikes.entries()) {
      await connection.execute(
        'INSERT INTO admin_bikes (id, admin_mobile, data, position) VALUES (?, ?, ?, ?)',
        [
          String(bike.id),
          bike.adminMobile,
          JSON.stringify(bike),
          position,
        ]
      );
    }

    for (const [collection, table] of Object.entries(recordTables)) {
      for (const [position, record] of snapshot[collection].entries()) {
        await connection.execute(
          `INSERT INTO \`${table}\` (id, data, position) VALUES (?, ?, ?)`,
          [String(record.id), JSON.stringify(record), position]
        );
      }
    }

    for (const [position, [mobile, wallet]] of Object.entries(
      snapshot.wallets.admins
    ).entries()) {
      await connection.execute(
        'INSERT INTO admin_wallets (mobile, data, position) VALUES (?, ?, ?)',
        [mobile, JSON.stringify(wallet), position]
      );
    }

    await connection.execute(
      'INSERT INTO super_admin_wallets (id, data) VALUES (?, ?)',
      ['platform', JSON.stringify(snapshot.wallets.superAdmin)]
    );
    await connection.execute(
      'INSERT INTO super_admin_settings (`key`, value) VALUES (?, ?)',
      ['initialized', JSON.stringify(true)]
    );
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const removeLegacyTablesAfterMigration = async (expectedState) => {
  const tableExists = Object.fromEntries(
    await Promise.all(
      ['app_users', 'app_bikes', 'app_records', 'app_settings'].map(
        async (table) => [table, await readTableExists(table)]
      )
    )
  );
  const hasLegacyTables = Object.values(tableExists).some(Boolean);
  if (!hasLegacyTables) {
    return;
  }

  const expectedCounts = {
    user_accounts: expectedState.users.filter((user) => user.role === 'USER').length,
    admin_accounts: expectedState.users.filter((user) => user.role === 'ADMIN').length,
    super_admin_accounts: expectedState.users.filter((user) => user.role === 'SUPER_ADMIN').length,
    admin_bikes: expectedState.bikes.length,
    user_bookings: expectedState.bookings.length,
    user_payments: expectedState.payments.length,
    admin_settlements: expectedState.settlements.length,
    admin_wallets: Object.keys(expectedState.wallets.admins).length,
    super_admin_wallets: 1,
  };

  for (const [table, expectedCount] of Object.entries(expectedCounts)) {
    if ((await countRows(pool, table)) !== expectedCount) {
      throw new Error(
        `MySQL migration verification failed for ${table}; legacy tables were kept`
      );
    }
  }

  for (const table of ['app_records', 'app_settings', 'app_users', 'app_bikes']) {
    if (tableExists[table]) {
      await pool.query(`DROP TABLE \`${table}\``);
    }
  }
};

const saveState = () => {
  if (!state) {
    return Promise.reject(new Error('MySQL database is not ready'));
  }

  const snapshot = JSON.parse(JSON.stringify(state));
  const saveOperation = saveQueue.then(() => persistState(snapshot));
  saveQueue = saveOperation.catch(() => {});
  return saveOperation;
};

const ready = (async () => {
  await createTables();
  await renameLegacyUserTable();

  const loaded = await loadDatabaseState();
  if (loaded.isInitialized) {
    state = loaded.state;
    return;
  }

  if (loaded.hasRecords) {
    throw new Error(
      'The named MySQL tables contain data but are not initialized; refusing to overwrite them'
    );
  }

  const legacyState = await readLegacyDatabaseState();
  if (legacyState) {
    state = legacyState;
  } else if (process.env.APP_IMPORT_LEGACY_DATA === 'true') {
    if (!fs.existsSync(legacyDataFile)) {
      throw new Error(
        `APP_IMPORT_LEGACY_DATA is enabled, but the source file was not found: ${legacyDataFile}`
      );
    }

    state = normalizeState(
      parseJson(
        fs.readFileSync(legacyDataFile, 'utf8'),
        `legacy data file ${legacyDataFile}`
      )
    );
  } else {
    state = loaded.state;
  }

  await saveState();
  await removeLegacyTablesAfterMigration(state);
})();

module.exports = {
  ready,
  get state() {
    if (!state) {
      throw new Error('MySQL database is not ready');
    }
    return state;
  },
  saveState,
};
