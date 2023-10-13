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

async function updateToken(token, username) {
  let sql = `UPDATE user_data SET token="${token}" WHERE username="${username}"`;
  let sqlQuery = `SELECT * FROM user_data WHERE username="${username}"`;
  await db.query(sql);
  let result = await db.query(sqlQuery);
  //return the latest data of user as login
  return result[0];
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
//test start
async function getTest(id) {
  const [rows] = await db.query(
    `SELECT *
FROM order_data
WHERE order_number = ${id}`
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
  total
) {
  let newItems = JSON.stringify(items);

  await db.query(
    `INSERT INTO order_data (order_number, items, date, client, discount, totalAmount, subtotal, tax, total)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
    ]
  );
  return;
}
//test end

async function addOrder(order) {
  const [rows] = await db.query(
    `INSERT INTO order_data
    VALUES (value1);
`,
    [order]
  );
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
  updateToken,
  getUserByName,
  getAllOrderHistory,
  getInventoryData,
  getProductsDetail,
  getOrderByNumber,
  addingDataToOrderData,
};
