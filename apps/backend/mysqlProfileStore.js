const mysql = require('mysql2/promise');

const databaseName =
  process.env.MYSQL_DATABASE || 'speedo-bike-rental';
const databaseIdentifierPattern = /^[a-zA-Z0-9_-]+$/;
let pool;

const getConnectionSettings = () => {
  const host = process.env.MYSQL_HOST || '127.0.0.1';
  const port = Number(process.env.MYSQL_PORT || 3306);
  const user = process.env.MYSQL_USER;
  const password = process.env.MYSQL_PASSWORD;

  if (!user || !password) {
    throw new Error(
      'MYSQL_USER and MYSQL_PASSWORD must be configured in apps/backend/.env'
    );
  }

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('MYSQL_PORT must be a valid TCP port');
  }

  if (!databaseIdentifierPattern.test(databaseName)) {
    throw new Error('MYSQL_DATABASE contains unsupported characters');
  }

  return { host, port, user, password };
};

const initialize = async () => {
  const settings = getConnectionSettings();
  const connection = await mysql.createConnection(settings);

  try {
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${databaseName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
  } finally {
    await connection.end();
  }

  pool = mysql.createPool({
    ...settings,
    database: databaseName,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: 'utf8mb4',
  });

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        mobile CHAR(10) NOT NULL,
        full_name VARCHAR(100) NULL,
        email VARCHAR(254) NULL,
        city VARCHAR(100) NULL,
        address VARCHAR(255) NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'USER',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY users_mobile_unique (mobile)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  } catch (error) {
    await pool.end();
    pool = undefined;
    throw error;
  }
};

const getPool = () => {
  if (!pool) {
    throw new Error('MySQL profile store has not been initialized');
  }

  return pool;
};

const findOrCreateUser = async (mobile, role) => {
  const db = getPool();

  await db.execute(
    `INSERT INTO users (mobile, role)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE role = VALUES(role)`,
    [mobile, role]
  );

  const [rows] = await db.execute(
    `SELECT id, mobile, full_name AS fullName, email, city, address, role
     FROM users
     WHERE mobile = ?`,
    [mobile]
  );

  return rows[0];
};

const findUser = async (mobile) => {
  const [rows] = await getPool().execute(
    `SELECT id, mobile, full_name AS fullName, email, city, address, role
     FROM users
     WHERE mobile = ?`,
    [mobile]
  );

  return rows[0] || null;
};

const updateProfile = async (mobile, profile) => {
  const db = getPool();
  await db.execute(
    `UPDATE users
     SET full_name = ?, email = ?, city = ?, address = ?
     WHERE mobile = ?`,
    [
      profile.fullName,
      profile.email,
      profile.city,
      profile.address,
      mobile,
    ]
  );

  return findUser(mobile);
};

module.exports = {
  initialize,
  findOrCreateUser,
  findUser,
  updateProfile,
};
