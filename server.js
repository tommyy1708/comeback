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
  casher,
  method
) {
  let newItems = JSON.stringify(items);
  await db.query(
    `INSERT INTO order_data (order_number, items, date, client, discount, totalAmount, subtotal, tax, total, casher, method)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      method,
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
  await db.query(sql, values, (error, result, fields) => {
    if (error) {
      console.error('Error updating client data:', error);
    } else {
      console.log('Client data updated successfully');
    }
  });
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

async function addSpendOnClient(newOrderData) {
  const clientName = newOrderData.clientName;
  const clientSpend = newOrderData.clientSpend;
  let nameValue = [clientName];

  //Inquire if client already exists
  let sqlClientExists = `SELECT * FROM client_data
  WHERE name = ?`;
  let existsResult = await db.query(
    sqlClientExists,
    nameValue,
    (error, result, fields) => {
      if (error) {
        console.error('Error updating client_data data:', error);
      } else {
        console.log('Client data updated successfully');
      }
    }
  );

  // update for exists client
  if (existsResult[0].length > 0) {
    let sql = `UPDATE client_data SET spend = spend + ?
  WHERE name = ?`;
    let updateValues = [clientSpend, clientName];
    let updateResultData = await db.query(
      sql,
      updateValues,
      (error, result, fields) => {
        if (error) {
          console.error('Error updating inventory data:', error);
        } else {
          console.log('Inventory data updated successfully');
        }
      }
    );
  } else {
    // if client name not in database then add it into
    let sqlAddNew = `INSERT INTO client_data (name)
    VALUES (?)`;
    let addNewClientResult = await db.query(
      sqlAddNew,
      nameValue,
      (error, result, fields) => {
        if (error) {
          console.error('Error updating inventory data:', error);
        } else {
          console.log('Inventory data updated successfully');
        }
      }
    );
    //Inquire and refreshing database
    let refreshing = await getClientData();

    let spendValue = [clientSpend, clientName]; // total of order and client name

    //if client name not in database then add spend in to this client
    let sqlSpend = `UPDATE client_data SET spend = spend + ?
  WHERE name = ?`;
    let addSpend = await db.query(
      sqlSpend,
      spendValue,
      (error, result, fields) => {
        if (error) {
          console.error('Error updating inventory data:', error);
        } else {
          console.log('Inventory data updated successfully');
        }
      }
    );
    //Inquire and refreshing database
    await getClientData();
  }
}
// end

//Start add new data into addNewInventoryData table
async function addInventoryData(data) {
  let sql = `INSERT INTO add_inventory_data (item_code, item, qty, cost, date)
  VALUES (?, ?, ?, ?, ?)`;
  let values = [
    data.item_code,
    data.item,
    data.qty,
    data.cost,
    data.date,
  ];
  await db.query(
    sql,
    values,
    (error, result, fields) => {
      if (error) {
        console.error('Error add inventory data:', error);
      } else {
        console.log('Inventory data add successfully');
      }
    }
  )
  let fresh = 'SELECT * FROM add_inventory_data';
  await db.query(fresh);

  return;
}
//End

//Start get data addNewInventoryData table
async function getDataFromAddInventory(id) {
  let sql = `SELECT * FROM add_inventory_data WHERE item_code = ?`;
  let values = [id];
  let result = await db.query(sql, values, (error, result, fields) => {
    if (error) {
      console.error('Error from inquire to inventory data:', error);
    } else {
      console.log('Inventory data add successfully');
    }
  });
  return result;
}

const verifyJwt = (token) => {
  try {
    jwt.verify(token, process.env.SECRET);
  } catch (err) {
    return false;
  }
  return true;
};

module.exports = {
  verifyJwt,
  getUsers,
  getClientData,
  updateToken,
  updateInventory,
  addingNewClient,
  addSpendOnClient,
  addInventoryData,
  getDataFromAddInventory,
  getUserByName,
  updateProductsDetail,
  getAllOrderHistory,
  getInventoryData,
  getProductsDetail,
  getOrderByNumber,
  addingDataToOrderData,
};
