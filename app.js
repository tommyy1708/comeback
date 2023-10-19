const express = require('express');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const {
  getTest,
  getUsers,
  verifyJwt,
  updateToken,
  getUserByName,
  updateProductsDetail,
  getAllOrderHistory,
  getInventoryData,
  getProductsDetail,
  getOrderByNumber,
  addingDataToOrderData,
} = require('./server.js');
dotenv.config();

const app = express();
const cors = require('cors');

app.use(cors());

//allow app using json format in the createNote function
app.use(express.json());

//verify token
app.get(`/api/verify`, async (req, res) => {
  const token = req.header('Authorization');
  try {
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
      data.casher
    );
    res.send({
      errCode: 0,
      message: 'Printed!',
    });
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
        userInfo: latestUserData,
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

app.post('/api/products/:id', async (req, res) => {
  const { item_code } = req.body;
  const productDetail = await getProductsDetail(item_code);
  res.status(200).send({
    errCode: 0,
    productDetail,
  });
});

app.post(`/api/order_history/order_detail/:id`, async (req, res) => {
  const { order_number } = req.body;
  const orderDetail = await getOrderByNumber(order_number);
  res.status(200).send({
    errCode: 0,
    orderDetail,
  });
});

app.get('/api/order_history', async (req, res) => {
  const allOrderData = await getAllOrderHistory();
  res.status(200).send({
    errCode: 0,
    allOrderData,
  });
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

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
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

app.listen(8000, () => {
  console.log(`Example app listening on port 8000`);
});
