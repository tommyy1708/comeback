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
  addInventoryData,
  updateProductsDetail,
  getAllOrderHistory,
  getDataAddInventoryByKey,
  getDataFromAddInventory,
  updateAddInventory,
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
      data.method
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

app.get('/api/products/:id', async (req, res) => {
  const item_code  = req.params.id;
  const productDetail = await getProductsDetail(item_code);
  if (productDetail.length > 0) {
    res.send({
      errCode: 0,
      productDetail,
    });
  } else {
    res.send({
      errCode: 1,
      message:'Something wrong!',
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

app.listen(8000, () => {
  console.log(`Example app listening on port 8000`);
});
