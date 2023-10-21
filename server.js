const mysql = require('mysql2');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
dotenv.config();

const db = mysql
  .createPool({
    host: process.env.HOSTWH,
    port: process.env.PORTWH,
    database: process.env.DATABASEWH,
    user: process.env.USERNAMEWH,
    password: process.env.PASSWORDWH,
  })
  .promise();

async function getUsers(username) {
  const rows = await db.query(
    `
  SELECT *
  FROM user_data
  WHERE username=?
  `,
    [username]
  );
  return rows[0];
}

async function getUserByName(username) {
  const [rows] = await db.query(
    `
  SELECT *
  FROM user_data
  WHERE username = ?
`,
    [username]
  );
  return rows[0];
}

async function getOrderByNumber(number) {
  const [rows] = await db.query(
    `
  SELECT *
  FROM order_data
  WHERE order_number = ?
`,
    [number]
  );
  return rows[0];
}

async function getAllOrderHistory() {
  const [rows] = await db.query(
    `
    SELECT *
    FROM order_data
    `
  );
  return rows;
}

async function getInventoryData() {
  const [rows] = await db.query(
    `
    SELECT *
    FROM inventory_data
    `
  );
  return rows;
}
async function getProductsDetail(item_code) {
  const [rows] = await db.query(
    `
    SELECT *
    FROM inventory_data
    WHERE item_code = ?
    `,
    [item_code]
  );
  return rows;
}

async function getTest(id) {
  const [rows] = await db.query(
    `SELECT *
FROM order_data
WHERE order_number = ${id}`
  );
  return rows[0];
}

async function updateToken(token, username) {
  let sql = `UPDATE user_data SET token="${token}" WHERE username="${username}"`;
  let sqlQuery = `SELECT * FROM user_data WHERE username="${username}"`;
  await db.query(sql);
  let result = await db.query(sqlQuery);
  //return the latest data of user as login
  return result[0];
}

async function updateProductsDetail(data) {
  let id = data.item_code;
  const sql =
    'UPDATE inventory_data SET item_code = ?, item = ?, qty = ?, price = ?, cost = ?, category = ?, amount = ? WHERE `key` = ?';
  const values = [
    data.item_code,
    data.item,
    data.qty,
    data.price,
    data.cost,
    data.category,
    data.amount,
    data.key,
  ];
  await db.query(sql, values, (error, result, fields) => {
    if (error) {
      console.error('Error updating inventory data:', error);
    } else {
      console.log('Inventory data updated successfully');
    }
  });
  const [rows] = await db.query(
    `
    SELECT *
    FROM inventory_data
    WHERE item_code = ?
    `,
    [id]
  );
  return rows[0];
}

async function addingDataToOrderData(
  order_number,
  items,
  date,
  client,
  discount,
  totalAmount,
  subtotal,
  tax,
  total,
  casher
) {
  let newItems = JSON.stringify(items);
  await db.query(
    `INSERT INTO order_data (order_number, items, date, client, discount, totalAmount, subtotal, tax, total, casher)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      order_number,
      newItems,
      date,
      client,
      discount,
      totalAmount,
      subtotal,
      tax,
      total,
      casher,
    ]
  );
  return;
}

async function getClientData() {
  let sql = 'SELECT * FROM client_data';
  const result = await db.query(sql);

  return result[0];
}

async function addingNewClient(data) {
  const { name, phone, address, type } = data;
  let sql = `INSERT INTO client_data (name, phone, address, type)
    VALUES (?, ?, ?, ?)`;
  let values = [name, phone, address, type];
  await db.query(sql, values , (error, result, fields) => {
         if (error) {
      console.error('Error updating client data:', error);
    } else {
      console.log('Client data updated successfully');
    }}
    );
  return;
}

async function updateInventory(qty, item_code) {
  let sql = `UPDATE inventory_data SET qty = qty - ?
  WHERE item_code = ?`;

  let values = [qty, item_code];

  db.query(sql, values, (error, result, fields) => {
    if (error) {
      console.error('Error updating inventory data:', error);
    } else {
      console.log('Inventory data updated successfully');
    }
  });
}

const verifyJwt = (token) => {
  try {
    jwt.verify(token, 'laoniu');
  } catch (err) {
    return false;
  }
  return true;
};

module.exports = {
  verifyJwt,
  getTest,
  getUsers,
  getClientData,
  updateToken,
  updateInventory,
  addingNewClient,
  getUserByName,
  updateProductsDetail,
  getAllOrderHistory,
  getInventoryData,
  getProductsDetail,
  getOrderByNumber,
  addingDataToOrderData,
};
