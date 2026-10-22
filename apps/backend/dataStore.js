const fs = require('fs');
const path = require('path');

const dataFile = process.env.APP_DATA_FILE
  ? path.resolve(process.env.APP_DATA_FILE)
  : path.join(__dirname, 'data', 'app-data.json');
const dataDir = path.dirname(dataFile);

const defaultState = {
  users: [],
  bikes: [],
  bookings: [],
  payments: [],
  settlements: [],
  wallets: {
    superAdmin: {
      mobile: '7777777777',
      balance: 0,
      totalCommission: 0,
      totalGrossReceived: 0,
      totalPaidToAdmins: 0,
    },
    admins: {},
  },
};

const ensureDataFile = () => {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, {
      recursive: true,
    });
  }

  if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(
      dataFile,
      JSON.stringify(defaultState, null, 2)
    );
  }
};

const loadState = () => {
  ensureDataFile();

  try {
    const rawData =
      fs.readFileSync(dataFile, 'utf8');
    const storedState =
      JSON.parse(rawData);

    return {
      ...defaultState,
      ...storedState,
      settlements: storedState.settlements || [],
      wallets: {
        ...defaultState.wallets,
        ...storedState.wallets,
        superAdmin: {
          ...defaultState.wallets.superAdmin,
          ...(storedState.wallets?.superAdmin || {}),
        },
        admins:
          storedState.wallets?.admins || {},
      },
    };
  } catch (error) {
    console.error(
      'Unable to read app data store:',
      error.message
    );

    return defaultState;
  }
};

const state = loadState();

const saveState = () => {
  ensureDataFile();

  fs.writeFileSync(
    dataFile,
    JSON.stringify(state, null, 2)
  );
};

module.exports = {
  state,
  saveState,
};
