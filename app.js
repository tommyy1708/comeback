const express = require('express');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const Redis = require('ioredis');
const redis = new Redis({
  host: '127.0.0.1',
  port: 6379,
  maxRetriesPerRequest: 50,
});
const {
  getUsers,
  verifyJwt,
  updateToken,
  getClientData,
  getUserByName,
  getUserByEmail,
  addingNewClient,
  updateInventory,
  addSpendOnClient,
  getTotalCost,
  getAllInventory,
  getQuotesData,
  addInventoryData,
  getOrderBetweenDate,
  updateProductsDetail,
  getAllOrderHistory,
  getDataAddInventoryByKey,
  getDataFromAddInventory,
  updateAddInventory,
  addingNewToInventory,
  getInventoryData,
  getProductsDetail,
  getOrderByNumber,
  addingDataToOrderData,
  getSupplierUsers,
  updateTokenHairSupplier,
  getCategory,
  supplierVerifyJwt,
  getSupplierCategoryList,
  supplierGetUserInfo,
  addToSupplierOrder,
  getSupplierOrderList,
  getSupplierUserInfo,
  getSupplierOrderByDate,
  postUser,
  getSupplierAnnouncement,
  updateSupplierAnnouncement,
  getSupplierUserList,
  postProduct,
  getProduct,
  deleteProduct,
  deleteCustomer,
  deleteCategory,
  postCategory,
  adminChange,
  DeleteSupplierAnnouncement,
  GetUserInfoById,
  updateSupplierOrderStatus,
  postBanner,
  getBanner,
  checkSupplierPause,
  pauseChange,
  updateCSV,
} = require('./server.js');
const path = require('path');
const multer = require('multer');
const csvParser = require('csv-parser');
const fs = require('fs');
dotenv.config();
const app = express();
const cors = require('cors');
const ServerPort = process.env.SERVER_PORT;
const ServerAddress = process.env.SERVER_ADDRESS;

app.use(cors());

//allow app using json format in the createNote function
app.use(express.json());

//clean cache function
const cleanCache = (key) => {
  redis.del(key, (err, reply) => {
    if (err) {
      console.error('Error cleaning cache:', err);
    } else {
      console.log('Cache cleaned:', reply);
    }
  });
};

// check cache function
const checkCache = (req, res, next) => {
  const { id } = req.params;

  redis.get(`categoryList:${id}`, (err, data) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Internal Server Error');
    }
    if (data !== null) {
      console.log('cache hit');
      return res.send(JSON.parse(data));
    }

    next();
  });
};

app.use('/assets/images', express.static('public/assets/images'));
// Function checkRole is part of role-based access control(RBAC)
const checkRole = (requiredRole) => (req, res, next) => {
  const userRoles = req.user.roles;
  if (userRoles.includes(requiredRole)) {
    next();
  } else {
    res.status(403).json({ message: 'Permission denied' });
  }
};

// Start Set up multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/assets/images'); // Set the destination folder for image uploads
  },
  filename: function (req, file, cb) {
    const timestamp = Date.now();
    const filename = `${timestamp}_${file.originalname}`;
    cb(null, filename); // Keep the original filename
  },
});

const upload = multer({ storage: storage });

// hair-supplier upload API endpoint for image upload
app.post('/api/images', upload.single('file'), (req, res) => {
  try {
    // Assuming you want to return the uploaded image URL
    const imageUrl = `http://${ServerAddress}:${ServerPort}/assets/images/${req.file.filename}`;
    const imageName = req.file.filename;
    const ogName = req.file.originalname;

    res.send({
      errCode: 0,
      message: 'Upload Success',
      data: {
        url: imageUrl,
        name: imageName,
        originName: ogName,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Image upload failed' });
  }
});

// End Set up multer for file upload

app.post(
  `/api/upload-csv`,
  upload.single('file'),
  async (req, res) => {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    try {
      res.json({
        url: file.path,
        message: 'File uploaded',
      });
    } catch (error) {
      console.error('Error processing file:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

app.post(`/api/update-csv`, async (req, res) => {
  const url = req.body.fileUrl;
  const data = [];
  fs.createReadStream(url, { encoding: 'utf-8' })
    .pipe(
      csvParser({
        skipLines: 1,
        headers: [
          'item_code',
          'item',
          'stock',
          'price',
          'cost',
          'category',
          'quantity',
        ],
      })
    )
    .on('data', (row) => {
      // Check for empty fields in each row
      Object.entries(row).forEach(([key, value]) => {
        if (!value || value.trim() === '') {
          console.log(`Empty value found in column '${key}'`);
        }
      });
      data.push(row);
    })
    .on('end', async () => {
      console.log('data = ', data);
      const response = await updateCSV(data);
      if (!response) {
        return res.send({
          errCode: 1,
          message: `update database failed`,
        });
      } else {
        cleanCache('category:*');
        // Respond with success message
        return res.json({
          errCode: 0,
          message: `update database success`,
        });
      }
    });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});
//  config email
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL,
  auth: {
    user: process.env.EMAIL_USERNAME,
    pass: process.env.EMAIL_PASS,
  },
});
// store email-verificationCode pairs
const verificationCodes = new Map();

app.post('/api/password-retrieval', async (req, res) => {
  const { email } = req.body;
  const response = await getUserByEmail(email);
  if (!response) {
    return res.send({
      errCode: 1,
      message: `We don't have this email in the system`,
    });
  } else {
    const passWord = response.passWord;
    // const verificationCode = crypto
    //   .randomBytes(3)
    //   .toString('hex')
    //   .toUpperCase();

    // verificationCodes.set(email, verificationCode);

    // Send the password via email
    const mailOptions = {
      from: process.env.EMAIL_USERNAME,
      to: email,
      subject: 'Password Retrieval',
      text: `Your password is: ${passWord}`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        res.status(500).send({
          errCode: 1,
          message: 'Error sending',
        });
      } else {
        res.status(200).send({
          errCode: 0,
          message: 'Password sent to your email successfully',
        });
      }
    });
  }
});

//verify token
app.get(`/api/verify`, async (req, res) => {
  const authorizeHeader = req.header('Authorization');
  try {
    if (!authorizeHeader || !authorizeHeader.startsWith('Bearer ')) {
      return res.send({
        errCode: 1,
        status: false,
        message: 'no authorization Bearer received',
      });
    }

    const token = authorizeHeader.slice(7);

    jwt.verify(token, 'laoniu');

    res.send({
      errCode: 0,
      status: true,
    });
    5;
  } catch (err) {
    res.send({
      errCode: 1,
      status: false,
      message: err.message,
    });
  }
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const result = await getUsers(username);

  if (result && result.length > 0) {
    let passWord = result[0].password.toString();
    let userName = result[0].username.toString();
    let token = jwt.sign({ userName }, 'laoniu', { expiresIn: '1h' });
    if (password === passWord) {
      let latestUserData = await updateToken(token, username);
      res.send({
        errCode: 0,
        message: 'Success',
        userInfo: [
          {
            userName: latestUserData[0].username,
            token: latestUserData[0].token,
          },
        ],
      });
    } else {
      res.send({
        errCode: 1,
        message: 'Password wrong!',
      });
    }
  } else {
    res.send({
      errCode: 2,
      message: 'No user',
    });
  }
  return;
});

app.post(`/api/shopping-cart`, async (req, res) => {
  try {
    const { cartData } = req.body;
    const data = JSON.parse(cartData);

    const result = await addingDataToOrderData(
      data.order_number,
      data.items,
      data.date,
      data.client,
      data.discount,
      data.totalAmount,
      data.subtotal,
      data.tax,
      data.total,
      data.casher,
      data.method,
      data.total_cost,
      data.profit,
      data.status
    );
    if (!result) {
      res.send({
        errCode: 1,
        message: 'Database wrong',
      });
    } else {
      res.send({
        errCode: 0,
        message: 'Success',
      });
    }
  } catch (err) {
    res.send({
      errCode: 1,
      message: err,
    });
  }
});

app.get('/api/products/:id', async (req, res) => {
  const item_code = req.params.id;
  const productDetail = await getProductsDetail(item_code);
  if (productDetail.length > 0) {
    res.send({
      errCode: 0,
      productDetail,
    });
  } else {
    res.send({
      errCode: 1,
      message: 'Something wrong',
    });
  }
});

app.get('/api/order_history/order_detail/:id', async (req, res) => {
  const id = req.params.id;
  const orderDetail = await getOrderByNumber(id);
  if (orderDetail) {
    res.send({
      errCode: 0,
      orderDetail,
    });
  } else {
    res.send({
      errCode: 1,
      message: 'Something wrong',
    });
  }
});

app.get('/api/order_history', async (req, res) => {
  const allOrderData = await getAllOrderHistory();
  if (!allOrderData) {
    res.send({
      errCode: 1,
      message: 'Database wrong',
    });
  } else {
    res.status(200).send({
      errCode: 0,
      allOrderData,
    });
  }
});

app.get('/api/sale', async (req, res) => {
  const inventoryData = await getInventoryData();
  res.status(200).send({
    errCode: 0,
    data: inventoryData,
  });
});

app.get('/api/users', async (req, res) => {
  const users = await getUsers();
  res.send({
    errCode: 0,
    data: users,
  });
});

app.put('/api/products/update', async (req, res) => {
  try {
    const idAndData = req.body;
    const itemCode = idAndData.id;
    const itemData = idAndData.data;
    let oldData = await getProductsDetail(itemCode);
    //update data right here;
    let newData = { ...oldData[0], ...itemData };
    let result = await updateProductsDetail(newData);

    res.send({
      errCode: 0,
      message: 'success',
    });
  } catch (err) {
    res.send({
      errCode: 1,
      message: err,
    });
  }
});

//update stock of items
app.post('/api/shopping-cart/update', async (req, res) => {
  const { data, token } = req.body;
  let result = await verifyJwt(token);
  if (!result) {
    return res.send({
      errCode: 1,
      message: 'Token Expired',
    });
  } else {
    data.forEach((element) => {
      updateInventory(element.amount, element.item_code);
    });
    await getInventoryData();
    res.send({
      errCode: 0,
      message: 'updated',
    });
  }
});

app.post('/api/client', async (req, res) => {
  try {
    let result = await addingNewClient(req.body);
    res.send({
      errCode: 0,
      message: 'Success',
    });
  } catch (error) {
    res.send({
      errCode: 1,
      message: error,
    });
  }
});

app.get('/api/client', async (req, res) => {
  try {
    let data = await getClientData();
    res.send({
      errCode: 0,
      data: data,
      message: 'Success',
    });
  } catch (err) {
    res.send({
      errCode: 1,
      message: err,
    });
  }
});

// Api for AddSpendOnClient
app.post('/api/shopping-cart/client_update/', async (req, res) => {
  try {
    let returnData = await addSpendOnClient(req.body);
    res.send({
      errCode: 0,
      result: returnData,
      message: 'Success',
    });
  } catch (error) {
    res.send({
      errCode: 1,
      message: error,
    });
  }
});

//Api for add new inventory
app.post('/api/add-inventory', async (req, res) => {
  await addInventoryData(req.body);
  try {
    res.send({
      errCode: 0,
      message: 'Success',
    });
  } catch (error) {
    res.send({
      errCode: 1,
      message: error,
    });
  }
});

//Api for get all data from inventory
app.get('/api/get-all-inventory', async (req, res) => {
  const result = await getAllInventory();
  try {
    if (result) {
      res.send({
        errCode: 0,
        data: result,
      });
    }
  } catch (error) {
    res.send({
      errCode: 1,
      message: error,
    });
  }
});

//Api for got data from add_inventory_list
app.get('/api/add-inventory/:id', async (req, res) => {
  try {
    let item_code = req.params.id;
    let result = await getDataFromAddInventory(item_code);

    res.send({
      errCode: 0,
      data: result[0],
      message: 'Success',
    });
  } catch (error) {
    res.send({
      errCode: 1,
      message: 'Something wrong',
    });
  }
});

//Api for asynchronous data
app.put('/api/add-inventory', async (req, res) => {
  try {
    const idAndData = req.body;
    const itemId = idAndData.item_code;
    let oldData = await getProductsDetail(itemId);

    const addQty = idAndData.qty;
    const addCost = idAndData.cost;
    const oldQty = oldData[0].qty;
    const oldCost = oldData[0].cost;
    const newQty = parseInt(oldQty) + parseInt(addQty);
    const preTotal = parseInt(oldQty) * parseFloat(oldCost);
    const newTotal = parseFloat(addCost) * parseInt(addQty);
    const newCost =
      (parseFloat(preTotal) + parseFloat(newTotal)) /
      parseInt(newQty);
    let newData = {
      ...oldData[0],
      cost: newCost.toFixed(2),
      qty: newQty,
    };
    await updateProductsDetail(newData);
    res.send({
      errCode: 0,
      message: 'success',
    });
  } catch (err) {
    res.send({
      errCode: 1,
      message: err,
    });
  }
});

//Api for modify add_inventory_data
app.put('/api/add-inventory-modify', async (req, res) => {
  try {
    const idAndData = req.body;
    const itemId = idAndData.item_code;
    const key = idAndData.data.key;
    let response = await getDataAddInventoryByKey(key);
    const oldQty = response[0].qty;
    const newQty = idAndData.data.qty;
    const updataQty = oldQty - newQty;

    await updateInventory(updataQty, itemId);
    let response2 = await updateAddInventory(updataQty, key);

    res.send({
      errCode: 0,
      message: 'Success',
    });
  } catch (error) {
    res.send({
      errCode: 1,
      message: error,
    });
  }
});

app.put(`/api/supplier-admin-change`, async (req, res) => {
  if (!req.header('Authorization')) {
    return 'token wrong';
  }
  const token = req.header('Authorization').slice(7);
  const check = await supplierVerifyJwt(token);

  if (!check) {
    return res.send({
      errCode: 1,
      message: 'Something wrong',
    });
  } else {
    const params = req.body;
    const response = await adminChange(params);

    try {
      if (response) {
        res.send({
          errCode: 0,
          message: 'Change Success',
        });
      }
    } catch (error) {
      res.send({
        errCode: 1,
        message: error,
      });
    }
  }
});

app.put(`/api/supplier-pause-change`, async (req, res) => {
  if (!req.header('Authorization')) {
    return 'token wrong';
  }
  const token = req.header('Authorization').slice(7);
  const check = await supplierVerifyJwt(token);

  if (!check) {
    return res.send({
      errCode: 1,
      message: 'Something wrong',
    });
  } else {
    const params = req.body;
    const response = await pauseChange(params);

    try {
      if (response) {
        res.send({
          errCode: 0,
          message: 'Change Success',
        });
      }
    } catch (error) {
      res.send({
        errCode: 1,
        message: error,
      });
    }
  }
});

//get total cost
app.get('/api/total-cost', async (req, res) => {
  try {
    let totalCost = await getTotalCost();
    res.send({
      errCode: 0,
      data: totalCost[0],
      message: 'Success',
    });
  } catch (error) {
    res.send({
      errCode: 1,
      message: error,
    });
  }
});
app.post('/api/add-new-product', async (req, res) => {
  const data = req.body;

  const response = await addingNewToInventory(data);

  let result = JSON.stringify(response);

  res.send({
    errCode: 0,
    message: 'Add new product Success',
  });
});

app.get('/api/get-reports', async (req, res) => {
  const params = req.query;
  const begin = params.begin;
  const end = params.end;
  const a_o_response = await getOrderBetweenDate(begin, end);
  if (a_o_response) {
    res.send({
      errCode: 0,
      message: 'Inquire Success',
      data: a_o_response,
    });
  } else {
    res.send({
      errCode: 1,
      message: 'Something wrong',
    });
  }
});

app.get('/api/quote_history', async (req, res) => {
  const aQuotesData = await getQuotesData();
  if (!aQuotesData) {
    res.send({
      errCode: 1,
      message: 'Database wrong',
    });
  } else {
    res.send({
      errCode: 0,
      aQuotesData,
    });
  }
});

app.listen(8000, () => {
  console.log(`Example app listening on port 8000`);
});

// hair supplier Apis
app.post('/api/supplier-login', async (req, res) => {
  const { email, password } = req.body;

  const aAccountInfo = await getSupplierUsers(email);

  if (!aAccountInfo) {
    return res.send({
      errCode: 1,
      message: 'User not exists',
    });
  }

  const isPause = await checkSupplierPause(email);

  if (!isPause) {
    return res.send({
      errCode: 1,
      message: 'User not exists',
    });
  }
  if (isPause[0].pause === 1) {
    return res.send({
      errCode: 2,
      message: 'Account is paused. Please contact support.',
    });
  }

  const sPassWord = aAccountInfo.passWord.toString();

  if (aAccountInfo && password === sPassWord) {
    let token = jwt.sign(aAccountInfo, `${process.env.SECRET}`, {
      expiresIn: '24h',
    });

    //update token to account and return newest account info
    const updateLoginInfo = await updateTokenHairSupplier(
      token,
      email
    );

    if (!updateLoginInfo) {
      res.send({
        errCode: 1,
        message: 'Database error',
      });
    } else {
      res.send({
        errCode: 0,
        message: 'Success',
        userToken: updateLoginInfo.token.toString(),
      });
    }
  } else {
    res.send({
      errCode: 1,
      message: 'Wrong Password',
    });
  }
});

app.get('/api/supplier-category', async (req, res) => {
  if (!req.header('Authorization')) {
    return;
  }
  const token = req.header('Authorization').slice(7);
  const check = await supplierVerifyJwt(token);
  if (!check) {
    res.send({
      errCode: 1,
      message: 'Something wrong',
    });
  } else {
    const category = await getCategory();

    res.send({
      errCode: 0,
      message: 'Success',
      data: category,
    });
  }
});

app.get(
  '/api/supplier-category/:id',
  checkCache,
  async (req, res) => {
    if (!req.header('Authorization')) {
      return;
    }
    const token = req.header('Authorization').slice(7);
    const check = await supplierVerifyJwt(token);
    if (!check) {
      res.send({
        errCode: 1,
        message: 'Something wrong',
      });
    } else {
      const category = req.params.id;

      console.log('cache not hit');
      const aCategoryList = await getSupplierCategoryList(category);
      if (!aCategoryList) {
        res.send({
          errCode: 1,
          message: 'server wrong',
        });
      } else {
        let cacheData = {
          errCode: 0,
          message: 'Success',
          data: aCategoryList,
        };
        redis.setex(
          `categoryList:${category}`,
          3600,
          JSON.stringify(cacheData)
        );
        res.send(cacheData);
      }
    }
  }
);

app.put('/api/passwordUpdate', async (req, res) => {
  const params = req.body;

  const userInfo = await supplierGetUserInfo(params);
  if (!userInfo) {
    res.send({
      errCode: 1,
      message: 'server wrong',
    });
  } else {
    res.send({
      data: 'Success',
      errCode: 0,
      message: 'Success',
    });
  }
});

app.post(`/api/supplier-addNewOrder`, async (req, res) => {
  //verify token
  if (!req.header('Authorization')) {
    return;
  }
  const token = req.header('Authorization').slice(7);
  const check = await supplierVerifyJwt(token);
  if (!check) {
    res.send({
      errCode: 1,
      message: 'Something wrong',
    });
  } else {
    const category = req.params.id;
  }

  //processing order
  const { cartData, userId } = req.body;

  const decodeCarData = JSON.parse(cartData);

  function createTable(decodeCarData) {
    const items = decodeCarData.items.map(
      (item) => `
    <tr>
      <td>${item.item}</td>
      <td>${item.price}</td>
      <td>${item.quantity}</td>
      <td>${item.cost}</td>
    </tr>
  `
    );

    return `
    <table border="1">
      <thead>
        <tr>
          <th>Item</th>
          <th>Price ($)</th>
          <th>Quantity</th>
          <th>Total Cost ($)</th>
        </tr>
      </thead>
      <tbody>
        ${items.join('')}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="3"><strong>Total Amount</strong></td>
          <td>${decodeCarData.totalAmount}</td>
        </tr>
        <tr>
          <td colspan="3"><strong>Subtotal</strong></td>
          <td>${decodeCarData.subtotal}</td>
        </tr>
      </tfoot>
    </table>
  `;
  }

  const tableHtml = createTable(decodeCarData);

  const userInfo = await GetUserInfoById(userId);

  const mailOptions = {
    from: process.env.EMAIL_USERNAME,
    to: userInfo[0].email,
    subject: `Thank you for shopping with us. Here\'s your order #:${decodeCarData.order_number}`,
    html: `We're going to processing your order within 1-3 business days : ${tableHtml}`,
  };

  transporter.sendMail(mailOptions, (error, info) => {});
  const result = await addToSupplierOrder(
    JSON.parse(cartData),
    userId
  );

  if (!result) {
    res.send({
      errCode: 1,
      message: 'Database wrong',
    });
  } else {
    res.send({
      errCode: 0,
      message: 'Success',
    });
  }
});

app.put(`/api/supplier-received`, async (req, res) => {
  //verify token
  if (!req.header('Authorization')) {
    return;
  }
  const token = req.header('Authorization').slice(7);
  const check = await supplierVerifyJwt(token);
  if (!check) {
    res.send({
      errCode: 1,
      message: 'Something wrong',
    });
  } else {
    const params = req.body;
    const order_number = params.orderNumber;
    const userId = params.userId;

    const emailContent = `
        <h1>Your Order is Being Processed</h1>
      <p>Order number : ${order_number}</p>
      <p>We're currently processing your order and will contact you soon by phone call or email with further details.</p>
      <p>Thank you for your patience!</p>
    `;

    const userInfo = await GetUserInfoById(userId);

    const mailOptions = {
      from: process.env.EMAIL_USERNAME,
      to: userInfo[0].email,
      subject: `Your Order is Being Processed. order #:${order_number}`,
      html: `${emailContent}`,
    };

    transporter.sendMail(mailOptions, (error, info) => {});
    const result = await updateSupplierOrderStatus(order_number);

    if (!result) {
      res.send({
        errCode: 1,
        message: 'Database wrong',
      });
    } else {
      res.send({
        errCode: 0,
        message: 'Success',
      });
    }
  }
});

app.get(`/api/supplier-orders`, async (req, res) => {
  if (!req.header('Authorization')) {
    return;
  }
  const token = req.header('Authorization').slice(7);
  const check = await supplierVerifyJwt(token);
  if (!check) {
    return res.send({
      errCode: 1,
      message: 'Something wrong',
    });
  } else {
    const aOrderList = await getSupplierOrderList();
    if (!aOrderList) {
      return res.send({
        errCode: 1,
        message: 'Error from server',
      });
    } else {
      return res.send({
        errCode: 0,
        message: 'Success',
        data: JSON.stringify(aOrderList),
      });
    }
  }
});

app.get(`/api/supplier-user`, async (req, res) => {
  if (!req.header('Authorization')) {
    return;
  }
  const token = req.header('Authorization').slice(7);
  const check = await supplierVerifyJwt(token);

  if (!check) {
    return res.send({
      errCode: 1,
      message: 'Something wrong',
    });
  } else {
    const id = req.query.userId;
    const response = await getSupplierUserInfo(id);
    let userInfo = {
      email: response[0].email,
      address: response[0].address,
      passWord: response[0].passWord,
      phone: response[0].phone,
      shipping_address: response[0].shipping_address,
      mobile_number: response[0].mobile_number,
    };
    return res.send({
      errCode: 0,
      message: 'Success',
      data: userInfo,
    });
  }
});

app.post(`/api/supplier-user`, async (req, res) => {
  if (!req.header('Authorization')) {
    return;
  }
  const token = req.header('Authorization').slice(7);
  const check = await supplierVerifyJwt(token);

  if (!check) {
    return res.send({
      errCode: 1,
      message: 'Something wrong',
    });
  } else {
    const { params } = req.body;
    const response = await postUser(params);

    if (!response) {
      return res.send({
        errCode: 1,
        message: 'Add new failed',
      });
    } else {
      return res.send({
        errCode: 0,
        message: 'Customer added successfully!',
      });
    }
  }
});

app.post(`/api/supplier-product`, async (req, res) => {
  if (!req.header('Authorization')) {
    return;
  }
  const token = req.header('Authorization').slice(7);
  const check = await supplierVerifyJwt(token);

  if (!check) {
    return res.send({
      errCode: 1,
      message: 'Something wrong',
    });
  } else {
    const { params } = req.body;
    const response = await postProduct(params);

    if (!response) {
      return res.send({
        errCode: 1,
        message: 'Add new product failed',
      });
    } else {
      // Clean the cache for the specific category
      cleanCache(`category:${params.category}`);
      return res.send({
        errCode: 0,
        message: 'New Product add successfully!',
      });
    }
  }
});

app.get(`/api/supplier-product`, async (req, res) => {
  if (!req.header('Authorization')) {
    return;
  }
  const token = req.header('Authorization').slice(7);
  const check = await supplierVerifyJwt(token);

  if (!check) {
    return res.send({
      errCode: 1,
      message: 'Something wrong',
    });
  } else {
    const itemCode = req.query.keyWord;

    const response = await getProduct(itemCode);

    if (!response) {
      return res.send({
        errCode: 1,
        message: 'No Data about this item',
      });
    } else {
      return res.send({
        errCode: 0,
        message: 'Get Product Success',
        data: response,
      });
    }
  }
});

app.delete(`/api/supplier-product/:itemCode`, async (req, res) => {
  if (!req.header('Authorization')) {
    return;
  }
  const token = req.header('Authorization').slice(7);
  const check = await supplierVerifyJwt(token);

  if (!check) {
    return res.send({
      errCode: 1,
      message: 'Something wrong',
    });
  } else {
    const itemCode = req.params.itemCode;

    const response = await deleteProduct(itemCode);

    if (!response) {
      return res.send({
        errCode: 1,
        message: 'Something wrong',
      });
    } else {
      return res.send({
        errCode: 0,
        message: 'Delete Product Success',
      });
    }
  }
});
app.delete(`/api/supplier-user/:id`, async (req, res) => {
  if (!req.header('Authorization')) {
    return;
  }
  const token = req.header('Authorization').slice(7);
  const check = await supplierVerifyJwt(token);

  if (!check) {
    return res.send({
      errCode: 1,
      message: 'Something wrong',
    });
  } else {
    const id = req.params.id;

    const response = await deleteCustomer(id);

    if (!response) {
      return res.send({
        errCode: 1,
        message: 'Something wrong',
      });
    } else {
      return res.send({
        errCode: 0,
        message: 'Delete Customer Success',
      });
    }
  }
});
app.delete(
  `/api/supplier-category/:categoryName`,
  async (req, res) => {
    if (!req.header('Authorization')) {
      return;
    }
    const token = req.header('Authorization').slice(7);
    const check = await supplierVerifyJwt(token);

    if (!check) {
      return res.send({
        errCode: 1,
        message: 'Something wrong',
      });
    } else {
      const categoryName = req.params.categoryName;

      const response = await deleteCategory(categoryName);

      if (!response) {
        return res.send({
          errCode: 1,
          message: 'Something wrong',
        });
      } else {
        return res.send({
          errCode: 0,
          message: 'Delete Category Success',
        });
      }
    }
  }
);

app.get(`/api/supplier-ordersbydate`, async (req, res) => {
  if (!req.header('Authorization')) {
    return 'token wrong';
  }
  const token = req.header('Authorization').slice(7);
  const check = await supplierVerifyJwt(token);

  if (!check) {
    return res.send({
      errCode: 1,
      message: 'Something wrong',
    });
  } else {
    const { begin, end } = req.query;

    const response = await getSupplierOrderByDate(begin, end);
    return res.send({
      errCode: 0,
      message: 'Success',
      data: response,
    });
  }
});

app.get(`/api/supplier-announcement`, async (req, res) => {
  const response = await getSupplierAnnouncement();

  return res.send({
    errCode: 0,
    message: 'Success',
    data: response,
  });
});

app.post(`/api/supplier-announcement`, async (req, res) => {
  // if (!req.header('Authorization')) {
  //   return 'token wrong';
  // }
  // const token = req.header('Authorization').slice(7);
  // const check = await supplierVerifyJwt(token);

  // if (!check) {
  //   return res.send({
  //     errCode: 1,
  //     message: 'Something wrong',
  //   });
  // } else {
  const { content } = req.body;

  const response = await updateSupplierAnnouncement(content);

  if (!response) {
    return res.send({
      errCode: 1,
      message: 'Something wrong',
    });
  }
  return res.send({
    errCode: 0,
    message: 'Success',
  });
  // }
});

app.post(`/api/supplier-delete-announcement`, async (req, res) => {
  if (!req.header('Authorization')) {
    return 'token wrong';
  }
  const token = req.header('Authorization').slice(7);
  const check = await supplierVerifyJwt(token);

  if (!check) {
    return res.send({
      errCode: 1,
      message: 'Something wrong',
    });
  } else {
    const { content } = req.body;

    const response = await DeleteSupplierAnnouncement(content);
    if (!response) {
      res.send({
        errCode: 1,
        message: 'Something wrong',
      });
    }
    const announces = await getSupplierAnnouncement();
    return res.send({
      errCode: 0,
      message: 'Success',
      data: announces,
    });
  }
});

app.get(`/api/supplier-user-list`, async (req, res) => {
  if (!req.header('Authorization')) {
    return;
  }
  const token = req.header('Authorization').slice(7);
  const check = await supplierVerifyJwt(token);

  if (!check) {
    return res.send({
      errCode: 1,
      message: 'Something wrong',
    });
  } else {
    const response = await getSupplierUserList();

    if (!response) {
      return res.send({
        errCode: 1,
        message: 'no response on database!',
      });
    } else {
      return res.send({
        errCode: 0,
        message: 'Success',
        data: response,
      });
    }
  }
});

app.post(`/api/supplier-category`, async (req, res) => {
  if (!req.header('Authorization')) {
    return;
  }
  const token = req.header('Authorization').slice(7);
  const check = await supplierVerifyJwt(token);

  if (!check) {
    return res.send({
      errCode: 1,
      message: 'Something wrong',
    });
  } else {
    const { params } = req.body;

    const response = await postCategory(params);

    if (!response) {
      return res.send({
        errCode: 1,
        message: 'Add new failed',
      });
    } else {
      return res.send({
        errCode: 0,
        message: 'Category add successfully!',
      });
    }
  }
});

app.post(`/api/supplier-banner`, async (req, res) => {
  if (!req.header('Authorization')) {
    return;
  }
  const token = req.header('Authorization').slice(7);
  const check = await supplierVerifyJwt(token);

  if (!check) {
    return res.send({
      errCode: 1,
      message: 'Something wrong',
    });
  } else {
    const { params } = req.body;

    const response = await postBanner(params);

    if (!response) {
      return res.send({
        errCode: 1,
        message: 'Add banner failed',
      });
    } else {
      return res.send({
        errCode: 0,
        message: 'Banner add successfully!',
      });
    }
  }
});

app.get(`/api/supplier-verify-token`, async (req, res) => {
  if (!req.header('Authorization')) {
    return false;
  }
  const token = req.header('Authorization').slice(7);
  if (!token) {
    return false;
  }

  return supplierVerifyJwt(token);
});

app.get(`/api/supplier-get-banner`, async (req, res) => {
  const response = await getBanner();
  if (response.length > 0) {
    return res.send({
      errCode: 0,
      message: 'success',
      data: response[0].url,
    });
  } else {
    return res.send({
      errCode: 1,
      message: 'something went wrong',
    });
  }
});

app.get(`/api/test-api`, checkCache, async (req, res) => {
  // Route that uses caching
  const { category } = req.query;
  console.log('cache not hit');
  const aCategoryList = await getSupplierCategoryList(category);
  redis.setex(category, 36000, JSON.stringify(aCategoryList));

  if (!aCategoryList) {
    res.send({
      errCode: 1,
      message: 'server wrong',
    });
  } else {
    res.send({
      errCode: 0,
      message: 'Success',
      data: aCategoryList,
    });
  }
});
