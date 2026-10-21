require('dotenv').config();

const express = require('express');
const cors = require('cors');
const session = require('express-session');

const otpProvider = require('./otpProvider');
const dataStore = require('./dataStore');

const app = express();

const ADMIN_MOBILE = '9986328111';
const SUPER_ADMIN_MOBILE = '9999999999';
const SUPER_ADMIN_COMMISSION_RATE = 0.10;
const INDIAN_MOBILE_REGEX = /^[6-9]\d{9}$/;
const OTP_MODE =
  process.env.OTP_MODE ||
  'mock';

const bikes = dataStore.state.bikes;
const bookings = dataStore.state.bookings;
const payments = dataStore.state.payments;
const users = dataStore.state.users;
const wallets = dataStore.state.wallets;

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

const saveData = () => {
  dataStore.saveState();
};

const getUserRole = (mobile) => {
  if (mobile === SUPER_ADMIN_MOBILE) {
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
  ...bike,
});

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
    message: 'OTP Backend Running',
  });
});
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'Backend reachable',
    otpMode: OTP_MODE,
  });
});

// SEND OTP
app.post('/api/auth/send-otp', async (req, res) => {
  try {
    const mobile =
      String(req.body.mobile || '').trim();

    if (!mobile) {
      return res.status(400).json({
        message: 'Mobile number required',
      });
    }

    if (!INDIAN_MOBILE_REGEX.test(mobile)) {
      return res.status(400).json({
        message:
          'Please enter a valid 10 digit Indian mobile number',
      });
    }

    const otpResult = await otpProvider.sendOtp(mobile);

    const response = {
      message:
        OTP_MODE === 'msg91'
          ? 'MSG91 accepted the OTP request. SMS delivery may take a short time.'
          : 'OTP sent successfully',
      otpMode: OTP_MODE,
    };

    if (OTP_MODE === 'mock') {
      response.otp = otpResult.otp;
      response.message =
        'Mock OTP generated successfully';
    }

    res.json(response);

  } catch (error) {
    console.error('Unable to send OTP:', error.message);
    res.status(500).json({
      message:
        OTP_MODE === 'msg91'
          ? 'Unable to send OTP right now. Please try again.'
          : 'OTP service is not configured correctly.',
    });
  }
});


// VERIFY OTP
app.post('/api/auth/verify-otp', async (req, res) => {
  try {

    const mobile =
      String(req.body.mobile || '').trim();
    const otp =
      String(req.body.otp || '').trim();

    if (!INDIAN_MOBILE_REGEX.test(mobile)) {
      return res.status(400).json({
        message:
          'Please enter a valid 10 digit Indian mobile number',
      });
    }

    const isValidOtp = await otpProvider.verifyOtp(mobile, otp);

    if (!isValidOtp) {
      return res.status(400).json({
        message: 'Invalid or expired OTP',
      });
    }

    let user = users.find(
      (u) => u.mobile === mobile
    );

   if (!user) {

  user = {
    id: Date.now(),
    mobile,
    role: getUserRole(mobile),
  };

  users.push(user);
  saveData();
}
console.log(
  'USER LOGIN:',
  user
);

    req.session.user = user;

    res.json({
      message: 'Login successful',
      user,
    });

  } catch (error) {
    console.error('OTP verification failed:', error.message);
    res.status(500).json({
      message:
        OTP_MODE === 'msg91'
          ? 'Unable to verify OTP right now. Please try again.'
          : 'OTP verification is unavailable right now.',
    });
  }
});

app.post('/api/admin/bikes', (req, res) => {
  try {

    const {
      bikeName,
      bikeNumber,
      city,
      hotelName,
      pricePerHour,
      adminMobile,
      imageUrl,
      hotelImageUrl,
      category,
    } = req.body;

    if (
      !bikeName ||
      !bikeNumber ||
      !city ||
      !hotelName ||
      !adminMobile ||
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
    saveData();

    res.json({
      message: 'Bike Added Successfully',
      bike,
    });

  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});
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

app.put('/api/admin/bikes/:id', (req, res) => {
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
  saveData();

  res.json({
    message: 'Bike updated successfully',
    bike: getBikePublicData(bike),
  });
});

app.patch('/api/admin/bikes/:id/status', (req, res) => {
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
  saveData();

  res.json({
    message: 'Bike status updated successfully',
    bike: getBikePublicData(bike),
  });
});

app.delete('/api/admin/bikes/:id', (req, res) => {
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

  saveData();

  res.json({
    message: 'Bike deleted successfully',
    bike: deletedBike,
  });
});

app.get('/api/admin/bikes/:id/bookings', (req, res) => {
  const bikeId =
    Number(req.params.id);

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

  res.json(bikeBookings);
});

app.get(
  '/api/admin/earnings/:mobile',
  (req, res) => {

    const mobile =
      req.params.mobile;

    const adminBookings =
      bookings.filter(
        booking =>
          booking.adminMobile === mobile
      );

    const totalGross =
      adminBookings.reduce(
        (sum, booking) =>
          sum + booking.grossAmount,
        0
      );

    const totalCommission =
      adminBookings.reduce(
        (sum, booking) =>
          sum + booking.superAdminCommission,
        0
      );

    const totalEarnings =
      adminBookings.reduce(
        (sum, booking) =>
          sum + booking.adminAmount,
        0
      );

    const pendingSettlementAmount =
      adminBookings
        .filter(
          booking =>
            booking.settlementStatus ===
            'PENDING'
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
      totalGross: roundAmount(totalGross),
      totalCommission: roundAmount(totalCommission),
      totalEarnings: roundAmount(totalEarnings),
      pendingSettlementAmount:
        roundAmount(pendingSettlementAmount),
      settledAmount: roundAmount(settledAmount),
      bookings: adminBookings,
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
  const pendingPayouts =
    bookings
      .filter(
        booking =>
          booking.settlementStatus ===
          'PENDING'
      )
      .reduce(
        (sum, booking) =>
          sum + booking.adminAmount,
        0
      );

  res.json({
    wallet: wallets.superAdmin,
    commissionRate:
      SUPER_ADMIN_COMMISSION_RATE,
    pendingPayouts:
      roundAmount(pendingPayouts),
    adminWallets:
      Object.values(wallets.admins),
    bookings,
  });
});

app.post('/api/super-admin/settle-weekly', (req, res) => {
  const pendingBookings =
    bookings.filter(
      booking =>
        booking.settlementStatus ===
        'PENDING'
    );

  const settlements = {};

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
    booking.settledAt = new Date();

    if (!settlements[booking.adminMobile]) {
      settlements[booking.adminMobile] = 0;
    }

    settlements[booking.adminMobile] =
      roundAmount(
        settlements[booking.adminMobile] +
        booking.adminAmount
      );
  });

  saveData();

  res.json({
    message:
      'Weekly settlement completed',
    settledBookings:
      pendingBookings.length,
    settlements,
    superAdminWallet:
      wallets.superAdmin,
    adminWallets:
      Object.values(wallets.admins),
  });
});

app.post('/api/payments/mock', (req, res) => {
  const bikeId =
    Number(req.body.bikeId);
  const userMobile =
    String(req.body.userMobile || '').trim();
  const amount =
    Number(req.body.amount);
  const requestedStatus =
    String(req.body.status || 'SUCCESS')
      .toUpperCase();

  if (!bikeId || !amount) {
    return res.status(400).json({
      message: 'Bike and amount are required',
    });
  }

  if (!INDIAN_MOBILE_REGEX.test(userMobile)) {
    return res.status(400).json({
      message:
        'Please login with a valid Indian mobile number',
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
    amount: roundAmount(amount),
    provider: 'MOCK_LOCAL',
    status:
      requestedStatus === 'FAILED'
        ? 'FAILED'
        : 'SUCCESS',
    createdAt: new Date(),
  };

  payments.push(payment);
  saveData();

  res.json({
    message:
      payment.status === 'SUCCESS'
        ? 'Mock payment successful'
        : 'Mock payment failed',
    payment,
  });
});

app.post('/api/bookings', (req, res) => {

  const bikeId =
    Number(req.body.bikeId);
  const userMobile =
    String(req.body.userMobile || '').trim();
  const paymentId =
    Number(req.body.paymentId);

  if (!bikeId) {
    return res.status(400).json({
      message: 'Bike is required',
    });
  }

  if (!INDIAN_MOBILE_REGEX.test(userMobile)) {
    return res.status(400).json({
      message:
        'Please login with a valid Indian mobile number',
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
  saveData();

  res.json({
    message: 'Bike booked successfully',
    booking,
  });
});

app.get('/api/bookings/user/:mobile', (req, res) => {
  const mobile =
    String(req.params.mobile || '').trim();

  if (!INDIAN_MOBILE_REGEX.test(mobile)) {
    return res.status(400).json({
      message:
        'Please enter a valid 10 digit Indian mobile number',
    });
  }

  const userBookings =
    bookings
      .filter(
        booking =>
          booking.userMobile === mobile
      )
      .map((booking) => ({
        ...booking,
        bike:
          bikes.find(
            bike =>
              bike.id === booking.bikeId
          ) || null,
      }))
      .sort(
        (a, b) =>
          new Date(b.bookingTime) -
          new Date(a.bookingTime)
      );

  res.json(userBookings);
});

app.post('/api/bookings/:id/start', (req, res) => {
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

  if (booking.status !== 'UPCOMING') {
    return res.status(400).json({
      message:
        'Only upcoming bookings can be started',
    });
  }

  booking.status = 'ACTIVE';
  booking.tripStartTime = new Date();

  saveData();

  res.json({
    message: 'Trip started successfully',
    booking,
  });
});

app.post('/api/bookings/:id/cancel', (req, res) => {
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

  saveData();

  res.json({
    message:
      'Booking cancelled and refund processed',
    booking,
    bike,
    payment,
  });
});

app.post('/api/bookings/:id/complete', (req, res) => {
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

  saveData();

  res.json({
    message: 'Trip completed successfully',
    booking,
    pricingAdjustment,
    bike,
  });
});
// PROTECTED ROUTE
app.get('/api/profile', (req, res) => {

  if (!req.session.user) {
    return res.status(401).json({
      message: 'Unauthorized',
    });
  }

  res.json({
    user: req.session.user,
  });
});


const port = process.env.PORT || 3002;

app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port} (all network interfaces)`);
});
