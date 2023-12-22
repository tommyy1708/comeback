const express = require('express');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const {
  getUsers,
  verifyJwt,
  updateToken,
  getClientData,
  getUserByName,
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
} = require('./server.js');
dotenv.config();
const app = express();
const cors = require('cors');

app.use(cors());

//allow app using json format in the createNote function
app.use(express.json());
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
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
  } catch (err) {
    res.send({
      errCode: 1,
      status: false,
      message: err.message,
    });
  }
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
        message: 'Success!',
      });
    }
  } catch (err) {
    res.send({
      errCode: 1,
      message: err,
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
        message: 'Success!',
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
      message: 'Something wrong!',
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
      message: 'Success!',
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
      message: 'Success!',
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
      message: 'Success!',
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
      message: 'Success!',
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
      message: 'Success!',
    });
  } catch (error) {
    res.send({
      errCode: 1,
      message: 'Something Wrong!',
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
    message: 'Add new product success!',
  });
});
//!! working on
app.get('/api/get-reports', async (req, res) => {
  const params = req.query;
  const begin = params.begin;
  const end = params.end;
  const a_o_response = await getOrderBetweenDate(begin, end);
  if (a_o_response) {
    res.send({
      errCode: 0,
      message: 'Inquire success!',
      data: a_o_response,
    });
  } else {
    res.send({
      errCode: 1,
      message: 'Something wrong!',
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

  const sPassWord = aAccountInfo.passWord.toString();
  const sUserEmail = aAccountInfo.email.toString();

  if (aAccountInfo && password === sPassWord) {
    let token = jwt.sign({ sUserEmail }, `${process.env.SECRET}`, {
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
        message: 'Success!',
        data: {
          token: updateLoginInfo.token,
          first_name: updateLoginInfo.first_name,
          last_name: updateLoginInfo.last_name,
          admin: updateLoginInfo.admin,
          id: updateLoginInfo.id,
          phone: updateLoginInfo.phone,
          mobile_number: updateLoginInfo.mobile_number,
          address: updateLoginInfo.address,
          shipping_address: updateLoginInfo.shipping_address,
          email: updateLoginInfo.email,
        },
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

app.get('/api/supplier-category/:id', async (req, res) => {
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

    const aCategoryList = await getSupplierCategoryList(category);

    res.send({
      errCode: 0,
      message: 'Success',
      data: aCategoryList,
    });
  }
});

app.put('/api/passwordUpdate', async (req, res) => {
  const params = req.body;

  const userInfo = await supplierGetUserInfo(params);
  if (!userInfo) {
    res.send({
      errCode: 1,
      message: 'Something wrong',
    });
  }
  res.send({
    data: 'Success',
    errCode: 0,
    message: 'Success',
  });
});

app.post(`/api/supplier-addNewOrder`, async (req, res) => {
  try {
    const { cartData, userData } = req.body;

    const data = JSON.parse(cartData);
    const info = JSON.parse(userData);

    const result = await addToSupplierOrder(data, info);

    if (!result) {
      res.send({
        errCode: 1,
        message: 'Database wrong',
      });
    } else {
      res.send({
        errCode: 0,
        message: 'Success!',
      });
    }
  } catch (err) {
    res.send({
      errCode: 1,
      message: err,
    });
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

    return res.send({
      errCode: 0,
      message: 'Success',
      data: aOrderList,
    });
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
      phone: response[0].phone,
    };
    return res.send({
      errCode: 0,
      message: 'Success',
      data: userInfo,
    });
  }
});

app.get(`/api/supplier-ordersbydate`, async (req, res) => {
  console.log('new request');
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
