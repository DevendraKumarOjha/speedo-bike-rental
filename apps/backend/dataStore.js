const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, 'data');
const dataFile = path.join(dataDir, 'app-data.json');

const defaultState = {
  users: [],
  bikes: [],
  bookings: [],
  payments: [],
  wallets: {
    superAdmin: {
      mobile: '9999999999',
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
