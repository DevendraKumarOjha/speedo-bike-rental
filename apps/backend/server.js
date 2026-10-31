require('dotenv').config();

const express = require('express');
const cors = require('cors');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');

const dataStore = require('./dataStore');

const app = express();
const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

const isProduction = process.env.NODE_ENV === 'production';
const ADMIN_MOBILE =
  process.env.ADMIN_LOGIN_MOBILE || (isProduction ? '' : '8888888888');
const ADMIN_LOGIN_PASSWORD =
  process.env.ADMIN_LOGIN_PASSWORD || (isProduction ? '' : '00000000');
const SUPER_ADMIN_ACCOUNTS = isProduction
  ? [
      {
        mobile: process.env.SUPER_ADMIN_LOGIN_MOBILE || '',
        password: process.env.SUPER_ADMIN_LOGIN_PASSWORD || '',
      },
    ]
  : [{ mobile: '9024280547', password: '00000000' }];
const SUPER_ADMIN_COMMISSION_RATE = Number(
  process.env.SUPER_ADMIN_COMMISSION_RATE || 0.10
);
if (
  !Number.isFinite(SUPER_ADMIN_COMMISSION_RATE) ||
  SUPER_ADMIN_COMMISSION_RATE < 0 ||
  SUPER_ADMIN_COMMISSION_RATE > 1
) {
  throw new Error('SUPER_ADMIN_COMMISSION_RATE must be between 0 and 1');
}
const INDIAN_MOBILE_REGEX = /^[6-9]\d{9}$/;
const configuredTokenSecret =
  process.env.JWT_SECRET || process.env.SESSION_SECRET;
const PASSWORD_LENGTH = 8;
const PASSWORD_REGEX = /^\d{8}$/;
const validatePassword = (password) => {
  return typeof password === 'string' && PASSWORD_REGEX.test(password);
};

if (isProduction) {
  const missingCredentials = [
    ['ADMIN_LOGIN_MOBILE', ADMIN_MOBILE],
    ['ADMIN_LOGIN_PASSWORD', ADMIN_LOGIN_PASSWORD],
    ['SUPER_ADMIN_LOGIN_MOBILE', SUPER_ADMIN_ACCOUNTS[0].mobile],
    ['SUPER_ADMIN_LOGIN_PASSWORD', SUPER_ADMIN_ACCOUNTS[0].password],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missingCredentials.length > 0) {
    throw new Error(
      `Configure production privileged credentials: ${missingCredentials.join(', ')}`
    );
  }

  if (
    !process.env.JWT_SECRET ||
    process.env.JWT_SECRET.length < 32 ||
    process.env.JWT_SECRET === 'replace-with-a-long-random-secret'
  ) {
    throw new Error('Configure a unique JWT_SECRET of at least 32 characters');
  }

  if (
    !process.env.SESSION_SECRET ||
    process.env.SESSION_SECRET.length < 32 ||
    process.env.SESSION_SECRET === 'replace-this-for-production'
  ) {
    throw new Error('Configure a unique SESSION_SECRET of at least 32 characters');
  }

  if (
    !INDIAN_MOBILE_REGEX.test(ADMIN_MOBILE) ||
    !INDIAN_MOBILE_REGEX.test(SUPER_ADMIN_ACCOUNTS[0].mobile)
  ) {
    throw new Error('Configure valid Indian mobile numbers for privileged accounts');
  }

  if (
    !validatePassword(ADMIN_LOGIN_PASSWORD) ||
    !validatePassword(SUPER_ADMIN_ACCOUNTS[0].password) ||
    ADMIN_LOGIN_PASSWORD === '00000000' ||
    SUPER_ADMIN_ACCOUNTS[0].password === '00000000'
  ) {
    throw new Error(
      'Production privileged account passwords must be different from the default and exactly eight numeric digits'
    );
  }
}
const JWT_SECRET =
  configuredTokenSecret || 'bike-rental-local-secret';
let bikes;
let bookings;
let payments;
let users;
let wallets;
let settlementHistory;
const BCRYPT_MAX_PASSWORD_BYTES = 72;
const REGISTRATION_ROLES = ['USER', 'ADMIN'];

const getPublicUser = (user) => {
  const { passwordHash, ...publicUser } = user;
  return publicUser;
};

const createAuthToken = (user) =>
  jwt.sign(
    {
      id: user.id,
      mobile: user.mobile,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

const authenticate = (req, res, next) => {
  const authorization = req.get('authorization') || '';
  const [scheme, token] = authorization.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({
      message: 'Sign in to access this resource',
    });
  }

  try {
    const claims = jwt.verify(token, JWT_SECRET);
    const user = users.find(
      (candidate) =>
        candidate.id === claims.id &&
        candidate.mobile === claims.mobile &&
        candidate.role === claims.role
    );

    if (!user) {
      return res.status(401).json({
        message: 'Your account session is no longer valid',
      });
    }

    req.user = getPublicUser(user);
    return next();
  } catch (error) {
    return res.status(401).json({
      message: 'Your session is invalid or has expired. Please sign in again.',
    });
  }
};

const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      message: 'You do not have permission to access this resource',
    });
  }

  return next();
};

const provisionPrivilegedAccount = async (
  mobile,
  role,
  password
) => {
  if (!password) {
    console.warn(
      `${role} password login is not configured; set its backend environment password`
    );
    return false;
  }

  if (!INDIAN_MOBILE_REGEX.test(mobile)) {
    throw new Error(`${role} login mobile must be a valid Indian mobile number`);
  }

  if (!validatePassword(password)) {
    throw new Error(
      `${role} password must be exactly ${PASSWORD_LENGTH} numeric digits`
    );
  }

  const existingUser = users.find(
    (user) => user.mobile === mobile
  );
  const passwordHash = await bcrypt.hash(password, 12);

  if (existingUser) {
    existingUser.role = role;
    existingUser.passwordHash = passwordHash;
  } else {
    users.push({
      id: Date.now(),
      mobile,
      role,
      passwordHash,
    });
  }

  return true;
};

const provisionPrivilegedAccounts = async () => {
  const superAdminMobiles =
    SUPER_ADMIN_ACCOUNTS.map((account) => account.mobile);

  if (new Set(superAdminMobiles).size !== superAdminMobiles.length) {
    throw new Error('Super Admin login mobiles must be unique');
  }

  if (superAdminMobiles.includes(ADMIN_MOBILE)) {
    throw new Error(
      'Admin and super-admin login mobiles must be different'
    );
  }

  const accountResults = await Promise.all([
    provisionPrivilegedAccount(
      ADMIN_MOBILE,
      'ADMIN',
      ADMIN_LOGIN_PASSWORD
    ),
    ...SUPER_ADMIN_ACCOUNTS.map((account) =>
      provisionPrivilegedAccount(
        account.mobile,
        'SUPER_ADMIN',
        account.password
      )
    ),
  ]);

  if (accountResults.some(Boolean)) {
    wallets.superAdmin.mobile = SUPER_ADMIN_ACCOUNTS[0].mobile;
    await saveData();
  }
};

const getAdminWallet = (mobile) => {
  if (!wallets.admins[mobile]) {
    wallets.admins[mobile] = {
      mobile,
      balance: 0,
      totalEarned: 0,
      totalSettled: 0,
      pendingSettlement: 0,
    };
  }

  return wallets.admins[mobile];
};

const roundAmount = (amount) =>
  Math.round(amount * 100) / 100;

const saveData = () => dataStore.saveState();

const getUserRole = (mobile) => {
  if (SUPER_ADMIN_ACCOUNTS.some((account) => account.mobile === mobile)) {
    return 'SUPER_ADMIN';
  }

  if (mobile === ADMIN_MOBILE) {
    return 'ADMIN';
  }

  return 'USER';
};

const getBookingBike = (booking) =>
  bikes.find(
    bike =>
      bike.id === booking.bikeId
  );

const getBookingPayment = (booking) =>
  payments.find(
    payment =>
      payment.id === booking.paymentId
  );

const getBikePublicData = (bike) => ({
  imageUrl: '',
  hotelImageUrl: '',
  category: 'Sports',
  rating: 4.5,
  distanceKm: 1.2,
  ...Object.fromEntries(
    Object.entries(bike).filter(
      ([key]) => key !== 'adminMobile'
    )
  ),
});

const getUserBookingData = (booking) => {
  const {
    adminMobile,
    superAdminCommission,
    adminAmount,
    ...userBooking
  } = booking;

  return userBooking;
};

const calculateBookingAmounts = (amount) => {
  const grossAmount =
    roundAmount(Number(amount));
  const superAdminCommission =
    roundAmount(
      grossAmount *
        SUPER_ADMIN_COMMISSION_RATE
    );
  const adminAmount =
    roundAmount(
      grossAmount -
        superAdminCommission
    );

  return {
    grossAmount,
    superAdminCommission,
    adminAmount,
  };
};

const getUnsettledAdminPayouts = (completedOnly = false) =>
  roundAmount(
    bookings
      .filter(
        (booking) =>
          booking.settlementStatus === 'PENDING' &&
          (!completedOnly || booking.status === 'COMPLETED')
      )
      .reduce(
        (sum, booking) => sum + Number(booking.adminAmount || 0),
        0
      )
  );

const applyBookingFinancialDelta = (
  booking,
  newGrossAmount
) => {
  const currentGrossAmount =
    Number(booking.grossAmount || 0);

  const currentAdminAmount =
    Number(booking.adminAmount || 0);

  const currentCommission =
    Number(
      booking.superAdminCommission || 0
    );

  const nextAmounts =
    calculateBookingAmounts(newGrossAmount);

  const grossDelta =
    roundAmount(
      nextAmounts.grossAmount -
        currentGrossAmount
    );
  const adminDelta =
    roundAmount(
      nextAmounts.adminAmount -
        currentAdminAmount
    );
  const commissionDelta =
    roundAmount(
      nextAmounts.superAdminCommission -
        currentCommission
    );

  wallets.superAdmin.balance =
    roundAmount(
      wallets.superAdmin.balance +
        grossDelta
    );
  wallets.superAdmin.totalGrossReceived =
    roundAmount(
      wallets.superAdmin.totalGrossReceived +
        grossDelta
    );
  wallets.superAdmin.totalCommission =
    roundAmount(
      wallets.superAdmin.totalCommission +
        commissionDelta
    );

  const adminWallet =
    getAdminWallet(booking.adminMobile);

  adminWallet.totalEarned =
    roundAmount(
      adminWallet.totalEarned +
        adminDelta
    );

  if (
    booking.settlementStatus ===
    'PENDING'
  ) {
    adminWallet.pendingSettlement =
      roundAmount(
        adminWallet.pendingSettlement +
          adminDelta
      );
  }

  booking.grossAmount =
    nextAmounts.grossAmount;
  booking.superAdminCommission =
    nextAmounts.superAdminCommission;
  booking.adminAmount =
    nextAmounts.adminAmount;

  return {
    grossDelta,
    adminDelta,
    commissionDelta,
  };
};

const reversePendingBookingFinancials =
  (booking) => {
    wallets.superAdmin.balance =
      roundAmount(
        wallets.superAdmin.balance -
          booking.grossAmount
      );
    wallets.superAdmin.totalGrossReceived =
      roundAmount(
        wallets.superAdmin.totalGrossReceived -
          booking.grossAmount
      );
    wallets.superAdmin.totalCommission =
      roundAmount(
        wallets.superAdmin.totalCommission -
          booking.superAdminCommission
      );

    const adminWallet =
      getAdminWallet(booking.adminMobile);

    adminWallet.totalEarned =
      roundAmount(
        adminWallet.totalEarned -
          booking.adminAmount
      );
    adminWallet.pendingSettlement =
      roundAmount(
        Math.max(
          0,
          adminWallet.pendingSettlement -
            booking.adminAmount
        )
      );

    booking.grossAmount = 0;
    booking.superAdminCommission = 0;
    booking.adminAmount = 0;
    booking.settlementStatus = 'CANCELLED';
  };

app.use(cors());

app.use(express.json());

if (!isProduction) {
  app.use('/api', (req, res, next) => {
    res.on('finish', () => {
      console.info(`[API] ${req.method} ${req.path} -> ${res.statusCode}`);
    });
    next();
  });
}

app.use('/api/admin', authenticate, requireRole('ADMIN'));
app.use('/api/super-admin', authenticate, requireRole('SUPER_ADMIN'));
app.use('/api/payments', authenticate, requireRole('USER'));
app.use('/api/bookings', authenticate, requireRole('USER'));
app.use('/api/profile', authenticate);

app.use(
  session({
    secret:
      process.env.SESSION_SECRET ||
      'bike-rental-local-secret',
    resave: false,
    saveUninitialized: true,
  })
);

app.get('/', (req, res) => {
  res.json({
    message: 'Bike Rental API Running',
  });
});

const sendHealthCheck = (_req, res) => {
  res.json({
    success: true,
    status: 'ok',
    service: 'bike-rental-api',
    database: 'connected',
  });
};

app.get('/health', sendHealthCheck);
app.get('/api/health', sendHealthCheck);
app.get('/api/test', sendHealthCheck);

const otpDisabled = (_req, res) =>
  res.status(410).json({
    message: 'OTP authentication is temporarily disabled. Use your mobile number and password.',
  });

app.post('/api/auth/send-otp', otpDisabled);
app.post('/api/auth/verify-otp', otpDisabled);

app.post('/api/auth/login', async (req, res) => {
  try {
    const mobile = String(req.body.mobile || '').trim();
    const password = req.body.password;

    if (
      !INDIAN_MOBILE_REGEX.test(mobile) ||
      typeof password !== 'string' ||
      password.length === 0 ||
      Buffer.byteLength(password, 'utf8') > BCRYPT_MAX_PASSWORD_BYTES
    ) {
      return res.status(401).json({
        message: 'Invalid mobile number or password',
      });
    }

    const user = users.find(
      (candidate) => candidate.mobile === mobile
    );

    if (
      !user?.passwordHash ||
      !(await bcrypt.compare(password, user.passwordHash))
    ) {
      return res.status(401).json({
        message: 'Invalid mobile number or password',
      });
    }

    const publicUser = getPublicUser(user);
    req.session.user = publicUser;

    return res.json({
      message: 'Login successful',
      user: publicUser,
      token: createAuthToken(user),
    });
  } catch (error) {
    console.error('Password login failed:', error.message);
    return res.status(500).json({
      message: 'Unable to log in right now. Please try again.',
    });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const mobile = String(req.body.mobile || '').trim();
    const role = String(req.body.role || '').trim().toUpperCase();
    const password = req.body.password;

    if (!INDIAN_MOBILE_REGEX.test(mobile)) {
      return res.status(400).json({
        message: 'Please enter a valid 10 digit Indian mobile number',
      });
    }

    if (!REGISTRATION_ROLES.includes(role)) {
      return res.status(400).json({
        message: 'Select a valid account type',
      });
    }

    if (!validatePassword(password)) {
      return res.status(400).json({
        message: 'Password must be exactly 8 numeric digits',
      });
    }

    const existingUser = users.find(
      (candidate) => candidate.mobile === mobile
    );

    if (existingUser?.passwordHash) {
      return res.status(409).json({
        message: 'An account already exists for this mobile number. Please sign in.',
      });
    }

    if (existingUser && existingUser.role !== role) {
      return res.status(409).json({
        message: 'This mobile number is already registered for a different account type.',
      });
    }

    const mobileRole = getUserRole(mobile);

    if (mobileRole !== 'USER' && mobileRole !== role) {
      return res.status(409).json({
        message: 'This mobile number is reserved for a different account type',
      });
    }

    const user = existingUser || {
      id: Date.now(),
      mobile,
      role,
    };
    user.role = role;
    user.passwordHash = await bcrypt.hash(password, 12);

    if (!existingUser) {
      users.push(user);
    }
    await saveData();

    const publicUser = getPublicUser(user);
    req.session.user = publicUser;

    return res.status(201).json({
      message: 'Registration successful',
      user: publicUser,
      token: createAuthToken(user),
    });
  } catch (error) {
    console.error('Account registration failed:', error.message);
    return res.status(500).json({
      message: 'Unable to register right now. Please try again.',
    });
  }
});

app.post('/api/admin/bikes', asyncHandler(async (req, res) => {
  try {

    const {
      bikeName,
      bikeNumber,
      city,
      hotelName,
      pricePerHour,
      imageUrl,
      hotelImageUrl,
      category,
    } = req.body;
    const adminMobile = req.user.mobile;

    if (
      !bikeName ||
      !bikeNumber ||
      !city ||
      !hotelName ||
      !Number(pricePerHour)
    ) {
      return res.status(400).json({
        message:
          'Bike name, number, city, hotel, price and admin mobile are required',
      });
    }

    const bike = {
      id: Date.now(),
      bikeName: String(bikeName).trim(),
      bikeNumber: String(bikeNumber).trim(),
      city: String(city).trim(),
      hotelName: String(hotelName).trim(),
      pricePerHour: Number(pricePerHour),
      adminMobile,
      imageUrl: String(imageUrl || '').trim(),
      hotelImageUrl: String(hotelImageUrl || '').trim(),
      category: String(category || 'Sports').trim(),
      rating: 4.5,
      distanceKm: 1.2,
      status: 'AVAILABLE',
      createdAt: new Date(),
    };

    bikes.push(bike);
    getAdminWallet(adminMobile);
    await saveData();

    res.json({
      message: 'Bike Added Successfully',
      bike,
    });

  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
}));
app.get('/api/bikes', (req, res) => {
  res.json(
    bikes.map(getBikePublicData)
  );
});
app.get(
  '/api/admin/bikes/:mobile',
  (req, res) => {

    const mobile =
      req.params.mobile;

    if (mobile !== req.user.mobile) {
      return res.status(403).json({
        message: 'You can only access your own bikes',
      });
    }

    const adminBikes =
      bikes.filter(
        bike =>
          bike.adminMobile ===
          mobile
      );

    res.json(
      adminBikes.map(getBikePublicData)
    );
  }
);

app.put('/api/admin/bikes/:id', asyncHandler(async (req, res) => {
  const bikeId =
    Number(req.params.id);

  const bike =
    bikes.find(
      item =>
        item.id === bikeId
    );

  if (!bike) {
    return res.status(404).json({
      message: 'Bike not found',
    });
  }

  if (bike.adminMobile !== req.user.mobile) {
    return res.status(403).json({
      message: 'You can only update your own bikes',
    });
  }

  const editableFields = [
    'bikeName',
    'bikeNumber',
    'city',
    'hotelName',
    'imageUrl',
    'hotelImageUrl',
    'category',
  ];

  editableFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      bike[field] =
        String(req.body[field]).trim();
    }
  });

  if (req.body.pricePerHour !== undefined) {
    const price =
      Number(req.body.pricePerHour);

    if (!price || price <= 0) {
      return res.status(400).json({
        message: 'Price must be greater than 0',
      });
    }

    bike.pricePerHour = price;
  }

  bike.updatedAt = new Date();
  await saveData();

  res.json({
    message: 'Bike updated successfully',
    bike: getBikePublicData(bike),
  });
}));

app.patch('/api/admin/bikes/:id/status', asyncHandler(async (req, res) => {
  const bikeId =
    Number(req.params.id);
  const status =
    String(req.body.status || '').toUpperCase();

  const allowedStatuses = [
    'AVAILABLE',
    'UNAVAILABLE',
    'MAINTENANCE',
  ];

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({
      message:
        'Status must be AVAILABLE, UNAVAILABLE or MAINTENANCE',
    });
  }

  const bike =
    bikes.find(
      item =>
        item.id === bikeId
    );

  if (!bike) {
    return res.status(404).json({
      message: 'Bike not found',
    });
  }

  if (bike.adminMobile !== req.user.mobile) {
    return res.status(403).json({
      message: 'You can only manage your own bikes',
    });
  }

  const hasActiveBooking =
    bookings.some(
      booking =>
        booking.bikeId === bikeId &&
        ['UPCOMING', 'ACTIVE'].includes(
          booking.status
        )
    );

  if (hasActiveBooking) {
    return res.status(400).json({
      message:
        'Cannot change status while bike has an upcoming or active booking',
    });
  }

  bike.status = status;
  bike.updatedAt = new Date();
  await saveData();

  res.json({
    message: 'Bike status updated successfully',
    bike: getBikePublicData(bike),
  });
}));

app.delete('/api/admin/bikes/:id', asyncHandler(async (req, res) => {
  const bikeId =
    Number(req.params.id);

  const bikeIndex =
    bikes.findIndex(
      item =>
        item.id === bikeId
    );

  if (bikeIndex === -1) {
    return res.status(404).json({
      message: 'Bike not found',
    });
  }

  if (bikes[bikeIndex].adminMobile !== req.user.mobile) {
    return res.status(403).json({
      message: 'You can only delete your own bikes',
    });
  }

  const hasActiveBooking =
    bookings.some(
      booking =>
        booking.bikeId === bikeId &&
        ['UPCOMING', 'ACTIVE'].includes(
          booking.status
        )
    );

  if (hasActiveBooking) {
    return res.status(400).json({
      message:
        'Cannot delete bike with an upcoming or active booking',
    });
  }

  const [deletedBike] =
    bikes.splice(bikeIndex, 1);

  await saveData();

  res.json({
    message: 'Bike deleted successfully',
    bike: deletedBike,
  });
}));

app.get('/api/admin/bikes/:id/bookings', (req, res) => {
  const bikeId =
    Number(req.params.id);
  const bike = bikes.find((item) => item.id === bikeId);

  if (!bike) {
    return res.status(404).json({
      message: 'Bike not found',
    });
  }

  if (bike.adminMobile !== req.user.mobile) {
    return res.status(403).json({
      message: 'You can only view bookings for your own bikes',
    });
  }

  const bikeBookings =
    bookings
      .filter(
        booking =>
          booking.bikeId === bikeId
      )
      .sort(
        (a, b) =>
          new Date(b.bookingTime) -
          new Date(a.bookingTime)
      );

  res.json(
    bikeBookings.map(
      ({ superAdminCommission, userMobile, grossAmount, ...booking }) => booking
    )
  );
});

app.get(
  '/api/admin/earnings/:mobile',
  (req, res) => {

    const mobile =
      req.params.mobile;

    if (mobile !== req.user.mobile) {
      return res.status(403).json({
        message: 'You can only access your own earnings',
      });
    }

    const adminBookings =
      bookings.filter(
        booking =>
          booking.adminMobile === mobile
      );

    const totalEarnings =
      adminBookings.reduce(
        (sum, booking) =>
          sum + Number(booking.adminAmount || 0),
        0
      );
    const totalGrossAmount =
      adminBookings.reduce(
        (sum, booking) =>
          sum + Number(booking.grossAmount || 0),
        0
      );
    const totalPlatformCommission =
      adminBookings.reduce(
        (sum, booking) =>
          sum + Number(booking.superAdminCommission || 0),
        0
      );

    const pendingSettlementAmount =
      adminBookings
        .filter(
          booking =>
            booking.settlementStatus ===
            'PENDING' &&
            booking.status === 'COMPLETED'
        )
        .reduce(
          (sum, booking) =>
            sum + booking.adminAmount,
          0
        );

    const settledAmount =
      adminBookings
        .filter(
          booking =>
            booking.settlementStatus ===
            'SETTLED'
        )
        .reduce(
          (sum, booking) =>
            sum + booking.adminAmount,
          0
        );

    res.json({
      wallet: getAdminWallet(mobile),
      totalEarnings: roundAmount(totalEarnings),
      totalGrossAmount: roundAmount(totalGrossAmount),
      totalPlatformCommission:
        roundAmount(totalPlatformCommission),
      commissionRate: SUPER_ADMIN_COMMISSION_RATE,
      pendingSettlementAmount:
        roundAmount(pendingSettlementAmount),
      settledAmount: roundAmount(settledAmount),
      bookings: adminBookings.map(
        ({ userMobile, ...booking }) => booking
      ),
    });
  }
);

app.get('/api/super-admin/bikes', (req, res) => {
  const allBikes =
    bikes.map((bike) => ({
      ...bike,
      booking:
        bookings.find(
          booking =>
            booking.bikeId === bike.id
        ) || null,
    }));

  res.json(allBikes);
});

app.get('/api/super-admin/wallet', (req, res) => {
  res.json({
    wallet: wallets.superAdmin,
    commissionRate:
      SUPER_ADMIN_COMMISSION_RATE,
    pendingPayouts: getUnsettledAdminPayouts(),
    settlementReadyPayouts: getUnsettledAdminPayouts(true),
    adminWallets:
      Object.values(wallets.admins),
    bookings,
    settlements: settlementHistory,
  });
});

app.get('/api/super-admin/users', (req, res) => {
  res.json(
    users.map(({ passwordHash, ...user }) => user)
  );
});

app.get('/api/super-admin/dashboard', (req, res) => {
  res.json({
    users: users.map(({ passwordHash, ...user }) => user),
    bikes,
    bookings,
    wallet: wallets.superAdmin,
    commissionRate: SUPER_ADMIN_COMMISSION_RATE,
    pendingPayouts: getUnsettledAdminPayouts(),
    settlementReadyPayouts: getUnsettledAdminPayouts(true),
    settlements: settlementHistory,
  });
});

app.post('/api/super-admin/settle-weekly', asyncHandler(async (req, res) => {
  const pendingBookings =
    bookings.filter(
      booking =>
        booking.settlementStatus ===
        'PENDING' &&
        booking.status === 'COMPLETED'
    );

  const adminTotals = {};
  const settlementDate = new Date();

  pendingBookings.forEach((booking) => {
    const adminWallet =
      getAdminWallet(booking.adminMobile);

    adminWallet.balance =
      roundAmount(
        adminWallet.balance +
        booking.adminAmount
      );
    adminWallet.totalSettled =
      roundAmount(
        adminWallet.totalSettled +
        booking.adminAmount
      );
    adminWallet.pendingSettlement =
      roundAmount(
        Math.max(
          0,
          adminWallet.pendingSettlement -
            booking.adminAmount
        )
      );

    wallets.superAdmin.balance =
      roundAmount(
        wallets.superAdmin.balance -
        booking.adminAmount
      );
    wallets.superAdmin.totalPaidToAdmins =
      roundAmount(
        wallets.superAdmin.totalPaidToAdmins +
        booking.adminAmount
      );

    booking.settlementStatus = 'SETTLED';
    booking.settledAt = settlementDate;

    if (!adminTotals[booking.adminMobile]) {
      adminTotals[booking.adminMobile] = 0;
    }

    adminTotals[booking.adminMobile] =
      roundAmount(
        adminTotals[booking.adminMobile] +
        booking.adminAmount
      );
  });

  const settlementRecords = Object.entries(adminTotals).map(
    ([adminMobile, amount]) => ({
      id: `${settlementDate.getTime()}-${adminMobile}`,
      adminMobile,
      amount,
      bookingIds: pendingBookings
        .filter((booking) => booking.adminMobile === adminMobile)
        .map((booking) => booking.id),
      status: 'DEMO_RECORDED',
      createdAt: settlementDate,
    })
  );
  settlementHistory.push(...settlementRecords);
  await saveData();

  res.json({
    message:
      'Weekly settlement completed',
    settledBookings:
      pendingBookings.length,
    settlements: settlementRecords,
    superAdminWallet:
      wallets.superAdmin,
    adminWallets:
      Object.values(wallets.admins),
  });
}));

app.post('/api/payments/mock', asyncHandler(async (req, res) => {
  const bikeId =
    Number(req.body.bikeId);
  const userMobile = req.user.mobile;
  const requestedStatus =
    String(req.body.status || 'SUCCESS')
      .toUpperCase();

  if (!bikeId) {
    return res.status(400).json({
      message: 'Bike and amount are required',
    });
  }

  const bike =
    bikes.find(
      item =>
        item.id === bikeId
    );

  if (!bike) {
    return res.status(404).json({
      message: 'Bike not found',
    });
  }

  if (bike.status !== 'AVAILABLE') {
    return res.status(400).json({
      message: 'Bike already booked',
    });
  }

  const payment = {
    id: Date.now(),
    bikeId,
    userMobile,
    amount: roundAmount(Number(bike.pricePerHour)),
    provider: 'MOCK_LOCAL',
    status:
      requestedStatus === 'FAILED'
        ? 'FAILED'
        : 'SUCCESS',
    createdAt: new Date(),
  };

  payments.push(payment);
  await saveData();

  res.json({
    message:
      payment.status === 'SUCCESS'
        ? 'Mock payment successful'
        : 'Mock payment failed',
    payment,
  });
}));

app.post('/api/bookings', asyncHandler(async (req, res) => {

  const bikeId =
    Number(req.body.bikeId);
  const userMobile = req.user.mobile;
  const paymentId =
    Number(req.body.paymentId);

  if (!bikeId) {
    return res.status(400).json({
      message: 'Bike is required',
    });
  }

  if (!paymentId) {
    return res.status(400).json({
      message: 'Successful payment is required before booking',
    });
  }

  const bike = bikes.find(
    b => b.id === bikeId
  );

  if (!bike) {
    return res.status(404).json({
      message: 'Bike not found',
    });
  }

  if (bike.status !== 'AVAILABLE') {
    return res.status(400).json({
      message: 'Bike already booked',
    });
  }

  const payment =
    payments.find(
      item =>
        item.id === paymentId
    );

  if (
    !payment ||
    payment.status !== 'SUCCESS' ||
    payment.bikeId !== bikeId ||
    payment.userMobile !== userMobile
  ) {
    return res.status(400).json({
      message: 'Invalid or failed payment',
    });
  }

  bike.status = 'BOOKED';

  const grossAmount =
    Number(bike.pricePerHour);

  const bookingAmounts =
    calculateBookingAmounts(grossAmount);

  const superAdminCommission =
    bookingAmounts.superAdminCommission;

  const adminAmount =
    bookingAmounts.adminAmount;

  wallets.superAdmin.balance =
    roundAmount(
      wallets.superAdmin.balance +
      grossAmount
    );
  wallets.superAdmin.totalGrossReceived =
    roundAmount(
      wallets.superAdmin.totalGrossReceived +
      grossAmount
    );
  wallets.superAdmin.totalCommission =
    roundAmount(
      wallets.superAdmin.totalCommission +
      superAdminCommission
    );

  const adminWallet =
    getAdminWallet(bike.adminMobile);

  adminWallet.totalEarned =
    roundAmount(
      adminWallet.totalEarned +
      adminAmount
    );
  adminWallet.pendingSettlement =
    roundAmount(
      adminWallet.pendingSettlement +
      adminAmount
    );

  const booking = {
    id: Date.now(),
    bikeId,
    bikeName: bike.bikeName,
    adminMobile: bike.adminMobile,
    userMobile,
    paymentId,
    paymentStatus: payment.status,
    pricePerHour: Number(bike.pricePerHour),
    grossAmount,
    superAdminCommission,
    adminAmount,
    estimatedHours: 1,
    billableHours: 1,
    durationMinutes: 0,
    bookingTime: new Date(),
    tripStartTime: null,
    tripEndTime: null,
    cancelledAt: null,
    refundStatus: 'NOT_APPLICABLE',
    settlementStatus: 'PENDING',
    settledAt: null,
    status: 'UPCOMING',
  };

  bookings.push(booking);
  await saveData();

  res.json({
    message: 'Bike booked successfully',
    booking: getUserBookingData(booking),
  });
}));

app.get('/api/bookings/user/:mobile', (req, res) => {
  const mobile =
    String(req.params.mobile || '').trim();

  if (!INDIAN_MOBILE_REGEX.test(mobile)) {
    return res.status(400).json({
      message:
        'Please enter a valid 10 digit Indian mobile number',
    });
  }

  if (mobile !== req.user.mobile) {
    return res.status(403).json({
      message: 'You can only view your own bookings',
    });
  }

  const userBookings =
    bookings
      .filter(
        booking =>
          booking.userMobile === mobile
      )
      .map((booking) => ({
        ...getUserBookingData(booking),
        bike: (() => {
          const bike = bikes.find((item) => item.id === booking.bikeId);
          return bike ? getBikePublicData(bike) : null;
        })(),
      }))
      .sort(
        (a, b) =>
          new Date(b.bookingTime) -
          new Date(a.bookingTime)
      );

  res.json(userBookings);
});

app.post('/api/bookings/:id/start', asyncHandler(async (req, res) => {
  const bookingId =
    Number(req.params.id);

  const booking =
    bookings.find(
      item =>
        item.id === bookingId
    );

  if (!booking) {
    return res.status(404).json({
      message: 'Booking not found',
    });
  }

  if (booking.userMobile !== req.user.mobile) {
    return res.status(403).json({
      message: 'You can only start your own bookings',
    });
  }

  if (booking.status !== 'UPCOMING') {
    return res.status(400).json({
      message:
        'Only upcoming bookings can be started',
    });
  }

  booking.status = 'ACTIVE';
  booking.tripStartTime = new Date();

  await saveData();

  res.json({
    message: 'Trip started successfully',
    booking: getUserBookingData(booking),
  });
}));

app.post('/api/bookings/:id/cancel', asyncHandler(async (req, res) => {
  const bookingId =
    Number(req.params.id);

  const booking =
    bookings.find(
      item =>
        item.id === bookingId
    );

  if (!booking) {
    return res.status(404).json({
      message: 'Booking not found',
    });
  }

  if (booking.userMobile !== req.user.mobile) {
    return res.status(403).json({
      message: 'You can only cancel your own bookings',
    });
  }

  if (booking.status !== 'UPCOMING') {
    return res.status(400).json({
      message:
        'Only upcoming bookings can be cancelled',
    });
  }

  const bike =
    getBookingBike(booking);

  const payment =
    getBookingPayment(booking);

  if (payment) {
    payment.status = 'REFUNDED';
    payment.refundedAt = new Date();
    payment.refundAmount =
      booking.grossAmount;
  }

  reversePendingBookingFinancials(booking);

  booking.status = 'CANCELLED';
  booking.cancelledAt = new Date();
  booking.refundStatus = 'REFUNDED';

  if (bike) {
    bike.status = 'AVAILABLE';
  }

  await saveData();

  res.json({
    message:
      'Booking cancelled and refund processed',
    booking: getUserBookingData(booking),
    bike: bike ? getBikePublicData(bike) : null,
    payment,
  });
}));

app.post('/api/bookings/:id/complete', asyncHandler(async (req, res) => {
  const bookingId =
    Number(req.params.id);

  const booking =
    bookings.find(
      item =>
        item.id === bookingId
    );

  if (!booking) {
    return res.status(404).json({
      message: 'Booking not found',
    });
  }

  if (booking.userMobile !== req.user.mobile) {
    return res.status(403).json({
      message: 'You can only complete your own bookings',
    });
  }

  if (booking.status === 'COMPLETED') {
    return res.status(400).json({
      message: 'Trip already completed',
    });
  }

  if (booking.status !== 'ACTIVE') {
    return res.status(400).json({
      message:
        'Only active trips can be completed',
    });
  }

  const bike =
    getBookingBike(booking);

  booking.status = 'COMPLETED';
  booking.tripEndTime = new Date();
  booking.completedAt =
    booking.tripEndTime;

  const startTime =
    new Date(
      booking.tripStartTime ||
        booking.bookingTime ||
        new Date()
    );
  const endTime =
    new Date(booking.tripEndTime);

  const durationMinutes =
    Math.max(
      1,
      Math.ceil(
        (endTime - startTime) /
          60000
      )
    );

  const billableHours =
    Math.max(
      1,
      Math.ceil(
        durationMinutes / 60
      )
    );

  const pricePerHour =
    Number(
      booking.pricePerHour ||
        bike?.pricePerHour ||
        0
    );

  const finalAmount =
    roundAmount(
      billableHours *
        pricePerHour
    );

  const pricingAdjustment =
    applyBookingFinancialDelta(
      booking,
      finalAmount
    );

  booking.durationMinutes =
    durationMinutes;
  booking.billableHours =
    billableHours;
  booking.refundStatus =
    pricingAdjustment.grossDelta < 0
      ? 'PARTIAL_REFUND_DUE'
      : 'NOT_APPLICABLE';

  if (bike) {
    bike.status = 'AVAILABLE';
  }

  await saveData();

  res.json({
    message: 'Trip completed successfully',
    booking: getUserBookingData(booking),
    updatedAmount: booking.grossAmount,
    bike: bike ? getBikePublicData(bike) : null,
  });
}));
// PROTECTED ROUTE
app.get('/api/profile', (req, res) => {
  res.json({
    user: req.user,
  });
});

app.use('/super-admin', express.static(
  path.join(__dirname, '..', 'super-admin')
));

app.use((error, _req, res, next) => {
  console.error('Request failed:', error.message);
  if (res.headersSent) {
    return next(error);
  }

  return res.status(500).json({
    message: 'Unable to complete the request right now. Please try again.',
  });
});

const port = process.env.PORT || 3002;

dataStore.ready
  .then(() => {
    bikes = dataStore.state.bikes;
    bookings = dataStore.state.bookings;
    payments = dataStore.state.payments;
    users = dataStore.state.users;
    wallets = dataStore.state.wallets;
    settlementHistory = dataStore.state.settlements;

    return provisionPrivilegedAccounts();
  })
  .then(() => {
    app.listen(port, '0.0.0.0', () => {
      console.log(
        `Server running on port ${port} (all network interfaces)`
      );
    });
  })
  .catch((error) => {
    console.error(
      'Unable to initialize the backend:',
      error.message
    );
    process.exitCode = 1;
  });
