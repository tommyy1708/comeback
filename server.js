const mysql = require('mysql2');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
dotenv.config();

const db = mysql
  .createPool({
    host: process.env.DATABASE_HOST,
    port: process.env.DATABASE_PORT,
    database: process.env.DATABASE,
    user: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
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
async function getUserByEmail(email) {
  const [rows] = await db.query(
    `
  SELECT *
  FROM user_data
  WHERE email = ?
`,
    [email]
  );
  if (rows.length === 0) {
    return false;
  } else {
    return rows[0];
  }
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
    WHERE status = 0
    `
  );
  return rows;
}
async function getQuotesData() {
  const [rows] = await db.query(
    `
    SELECT *
    FROM order_data
    WHERE status = 1
    `
  );
  return rows;
}

async function getOrderBetweenDate(begin, end) {
  let sqlReport =
    'SELECT order_number, date, client, subtotal,total, method,total_cost, profit FROM order_data WHERE date BETWEEN ? AND ?';
  const values = [begin, end];
  const a_report = await db.query(
    sqlReport,
    values,
    (error, result, fields) => {
      if (error) {
        console.error('Error updating inventory data:', error);
      } else {
        console.log('Inventory data updated successfully');
      }
    }
  );
  let sqlStatistic =
    'SELECT SUM(total_cost) as totalCost, SUM(total) as totalTotal,SUM(profit) as totalProfit FROM order_data WHERE date BETWEEN ? AND ?';
  const a_statistic = await db.query(
    sqlStatistic,
    values,
    (error, result, fields) => {
      if (error) {
        console.error('Error updating inventory data:', error);
      } else {
        console.log('Inventory data updated successfully');
      }
    }
  );
  return { aStatistics: a_statistic[0], aReports: a_report[0] };
}

async function getAllInventory() {
  const [rows] = await db.query(
    `
    SELECT *
    FROM inventory_data
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
  method,
  total_cost,
  profit,
  status
) {
  // const newItems = JSON.stringify(items);
  // console.log("🚀 ~ file: server.js:194 ~ newItems:", newItems)

  const response = await db.query(
    `INSERT INTO order_data (order_number, items, date, client, discount, totalAmount, subtotal, tax, total, casher, method,total_cost, profit, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
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
      method,
      total_cost,
      profit,
      status,
    ]
  );
  return response[0];
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

//minus qty at inventory_data
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
  let fresh = 'SELECT * FROM inventory_data';
  await db.query(fresh);
  return;
}

async function addSpendOnClient(newOrderData) {
  const clientName = newOrderData.clientName;
  const clientSpend = newOrderData.clientSpend;
  const clientPhone = newOrderData.clientPhone;

  let nameValue = [clientName];
  let phoneValue = [clientPhone];

  //Inquire if client already exists
  let sqlClientExists = `SELECT * FROM client_data
  WHERE phone = ?`;
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
  let sql = `INSERT INTO add_inventory_data (item_code, item, qty, cost, date,casher)
  VALUES (?, ?, ?, ?, ?, ?)`;
  let values = [
    data.item_code,
    data.item,
    data.qty,
    data.cost,
    data.date,
    data.casher,
  ];
  await db.query(sql, values, (error, result, fields) => {
    if (error) {
      console.error('Error add inventory data:', error);
    } else {
      console.log('Inventory data add successfully');
    }
  });
  let fresh = 'SELECT * FROM add_inventory_data';
  await db.query(fresh);

  return;
}
//End

//Start get data addNewInventoryData table
async function getDataFromAddInventory(id) {
  let sql = `SELECT * FROM add_inventory_data WHERE item_code = ?`;
  let values = [id];
  let result = await db.query(
    sql,
    values,
    (error, result, fields) => {
      if (error) {
        console.error('Error from inquire to inventory data:', error);
      } else {
        console.log('Inventory data add successfully');
      }
    }
  );

  return result;
}

//Got data from addNewInventoryData by key
async function getDataAddInventoryByKey(key) {
  let values = [key];
  let sql = 'SELECT * FROM add_inventory_data WHERE `key` = ?';
  let result = await db.query(
    sql,
    values,
    (error, result, fields) => {
      if (error) {
        console.error('Error from inquire to inventory data:', error);
      } else {
        console.log('Inventory data add successfully');
      }
    }
  );

  return result[0];
}

//minus qty at add_inventory_data
async function updateAddInventory(qty, key) {
  let sql =
    'UPDATE add_inventory_data SET qty = qty - ? WHERE `key` = ?';

  let values = [qty, key];

  let response = await db.query(
    sql,
    values,
    (error, result, fields) => {
      if (error) {
        console.error('Error updating inventory data:', error);
      } else {
        console.log('Inventory data updated successfully');
      }
    }
  );
  let fresh = 'SELECT * FROM add_inventory_data';
  await db.query(fresh);
  return response[0];
}

//get total cost
async function getTotalCost() {
  let sql =
    'SELECT SUM(qty * cost) AS total_cost FROM inventory_data';
  let data = await db.query(sql);
  return data[0];
}

async function addingNewToInventory(data) {
  let sql = `INSERT INTO inventory_data (item_code, item, qty,price, cost, category, amount) VALUES (?, ?, ?, ?, ?, ?, ?)`;
  let values = [
    data.item_code,
    data.item,
    data.qty,
    data.price,
    data.cost,
    data.category,
    data.amount,
  ];
  try {
    const response = await db.query(
      sql,
      values,
      (error, result, fields) => {
        if (error) {
          console.error(
            'Error from inquire to inventory data:',
            error
          );
        } else {
          console.log('Inventory data add successfully');
        }
      }
    );
    if (!response) {
      console.log('no response');
    } else {
      let fresh = 'SELECT * FROM inventory_data';
      await db.query(fresh);
      return true;
    }
  } catch (error) {
    return error;
  }
}

const verifyJwt = (token) => {
  try {
    jwt.verify(token, process.env.SECRET);
  } catch (err) {
    return false;
  }
  return true;
};

//hair supplier Apis
//Get user account information
async function getSupplierUsers(email) {
  const rows = await db.query(
    `
  SELECT id, admin,first_name, last_name, passWord, phone,address,email, shipping_address, mobile_number
  FROM user_data
  WHERE email=?
  `,
    [email]
  );
  //return Object {}
  return rows[0][0];
}

// Update token to account
async function updateTokenHairSupplier(token, email) {
  let sql = `UPDATE user_data SET token="${token}" WHERE email="${email}"`;
  let getUserInfo = `SELECT * FROM user_data WHERE email="${email}"`;
  await db.query(sql);
  let aUserInfo = await db.query(getUserInfo);

  //return the object{} of user info after login
  return aUserInfo[0][0];
}

// Get all category information
async function getCategory() {
  let inquirySql = 'SELECT * FROM category_data';
  const aCategory = await db.query(inquirySql);
  return aCategory[0];
}

//Verify supplier token
const supplierVerifyJwt = (token) => {
  const verifyResult = jwt.verify(token, 'laoniu');

  if (!verifyResult) {
    return false;
  } else {
    return true;
  }
};

//Get Specific category list
async function getSupplierCategoryList(categoryName) {
  let inquirySql = `SELECT * FROM inventory_data WHERE category = ?`;
  const value = [categoryName];
  const aCategoryList = await db.query(inquirySql, value);

  return aCategoryList[0];
}

//Get user info
async function supplierGetUserInfo(userinfo) {
  const userId = userinfo.userId;
  const updateFields = Object.keys(userinfo)
    .filter((key) => key !== 'userId')
    .map((key) => `${key} = ?`)
    .join(', ');

  const values = Object.values(userinfo).filter(
    (value, index) =>
      index !== Object.keys(userinfo).indexOf('userId')
  );

  if (!userId || values.length === 0) {
    throw new Error('Invalid request');
  }

  let inquirySql = `UPDATE user_data SET ${updateFields} WHERE id = ?`;
  const value = [...values, userId];
  const returnValue = await db.query(inquirySql, value);

  return returnValue[0];
}

//Add new order to supplier database
async function addToSupplierOrder(cartData, userInfo) {
  const sql = `INSERT INTO order_data (order_number, items, date, totalAmount, subtotal, userId) VALUES (?, ?, ?, ?, ?, ?)`;
  const values = [
    cartData.order_number,
    JSON.stringify(cartData.items),
    cartData.date,
    cartData.totalAmount,
    cartData.subtotal,
    userInfo,
  ];

  const response = await db.query(sql, values);

  if (response && response.length > 0) {
    return true;
  } else {
    return false;
  }
}

//get order list from supplier database
async function getSupplierOrderList() {
  const sql = `
    SELECT order_data.order_number, order_data.items, order_data.date, totalAmount, user_data.first_name, user_data.last_name, user_data.phone, user_data.mobile_number, user_data.email, user_data.address, user_data.shipping_address, status, userId
    FROM order_data
    INNER JOIN user_data ON order_data.userId = user_data.id
  `;

  try {
    const result = await db.query(sql);
    return result[0];
  } catch (error) {
    console.error('Error fetching data:', error);
    // handle the error
    throw error;
  }
}

//get user info from supplier user_data
async function getSupplierUserInfo(id) {
  const sql = `SELECT * FROM user_data WHERE id=${id}`;
  const response = await db.query(sql);
  return response[0];
}

//supplier date picker from orders
async function getSupplierOrderByDate(begin, end) {
  let sqlReport =
    'SELECT * FROM order_data WHERE date BETWEEN ? AND ?';
  const values = [begin, end];
  const a_report = await db.query(
    sqlReport,
    values,
    (error, result, fields) => {
      if (error) {
        console.error('Error updating inventory data:', error);
      } else {
        console.log('Inventory data updated successfully');
      }
    }
  );
  return a_report[0];
}

async function postUser(user) {
  const userInfo = JSON.parse(user);
  let sql = `
      INSERT INTO user_data
  (first_name, last_name, email, phone, mobile_number, address, shipping_address)
  VALUES (?, ?, ?, ?, ?, ?, ?) `;
  const values = [
    userInfo.first_name,
    userInfo.last_name,
    userInfo.email,
    userInfo.phone,
    userInfo.mobile_number,
    userInfo.address,
    userInfo.shipping_address,
  ];
  const response = await db.query(sql, values);
  if (response && response.length > 0) {
    return true;
  } else {
    return false;
  }
}
async function postProduct(product) {
  const productInfo = JSON.parse(product);
  let sql = `
      INSERT INTO inventory_data
  (item_code, item, price, category)
  VALUES (?, ?, ?, ?) `;
  const values = [
    productInfo.item_code,
    productInfo.item,
    productInfo.price,
    productInfo.category,
  ];

  const response = await db.query(sql, values);
  if (response && response.length > 0) {
    return true;
  } else {
    return false;
  }
}

async function getProduct(itemCode) {
  let sql = `SELECT * FROM inventory_data WHERE item_code = ?`;
  const values = [itemCode];
  const response = await db.query(sql, values);

  if (response && response.length > 0) {
    return response[0];
  } else {
    return false;
  }
}

async function getSupplierAnnouncement() {
  let sql = `SELECT * FROM announcement`;
  const response = await db.query(sql);

  if (response && response.length > 0) {
    return response[0];
  } else {
    return false;
  }
}

async function updateSupplierAnnouncement(notice) {
  let sql = `INSERT INTO announcement (content) VALUES (?)`;
  const response = await db.query(sql, [notice]);
  if (response && response.length > 0) {
    return true;
  } else {
    return false;
  }
}
async function DeleteSupplierAnnouncement(content) {
  let sql = `DELETE FROM announcement WHERE id=${content}`;
  const response = await db.query(sql);
  if (response && response.length > 0) {
    return true;
  } else {
    return false;
  }
}

async function getSupplierUserList() {
  let sql = `SELECT * FROM user_data WHERE id != 1`;
  const response = await db.query(sql);
  if (response && response.length > 0) {
    return response[0];
  } else {
    return false;
  }
}
async function deleteProduct(item) {
  let sql = `DELETE FROM inventory_data WHERE item_code = '${item}' `;
  let sql2 = `SELECT * FROM inventory_data`;
  const response = await db.query(sql);
  await db.query(sql2);
  if (response && response.length > 0) {
    return response[0];
  } else {
    return false;
  }
}
async function deleteCustomer(id) {
  let sql = `DELETE FROM user_data WHERE id = '${id}' `;
  let sql2 = `SELECT * FROM inventory_data`;
  const response = await db.query(sql);
  await db.query(sql2);
  if (response && response.length > 0) {
    return response[0];
  } else {
    return false;
  }
}
async function deleteCategory(categoryName) {
  let sql = `DELETE FROM category_data WHERE categoryName = '${categoryName}' `;
  let sql2 = `SELECT * FROM category_data`;
  const response = await db.query(sql);
  await db.query(sql2);
  if (response && response.length > 0) {
    return response[0];
  } else {
    return false;
  }
}

async function postCategory(category) {
  let sql = `INSERT INTO category_data
  (categoryName, image)
  VALUES (?,?) `;
  const values = [category.categoryName, category.url];

  const response = await db.query(sql, values);
  if (response && response.length > 0) {
    return true;
  } else {
    return false;
  }
}
async function postBanner(image) {
  let sql = `UPDATE banner_data
  SET url = ?
  WHERE id = 1`;
  const values = [image.url];

  const response = await db.query(sql, values);
  if (response && response.length > 0) {
    return true;
  } else {
    return false;
  }
}

async function adminChange(adminCode) {
  const newAdmin = adminCode.admin === 1 ? 0 : 1;
  let sql = `UPDATE user_data SET admin = ?
             WHERE id = ?`;
  const values = [newAdmin, adminCode.id];
  const response = await db.query(sql, values);
  if (response && response.length > 0) {
    return true;
  } else {
    return false;
  }
}
async function pauseChange(pauseCode) {
  const newAdmin = pauseCode.admin === 1 ? 0 : 1;
  let sql = `UPDATE user_data SET pause = ?
             WHERE id = ?`;
  const values = [newAdmin, pauseCode.id];
  const response = await db.query(sql, values);
  if (response && response.length > 0) {
    return true;
  } else {
    return false;
  }
}

async function GetUserInfoById(userId) {
  let sql = `SELECT * FROM user_data WHERE id = ${userId}`;
  const response = await db.query(sql);
  if (response && response.length > 0) {
    return response[0];
  } else {
    return false;
  }
}

async function updateSupplierOrderStatus(orderId) {
  let sql = `UPDATE order_data
             SET status='success'
             WHERE order_number = ${orderId}
  `;
  const response = await db.query(sql);
  if (response && response.length > 0) {
    return response[0];
  } else {
    return false;
  }
}

async function getBanner() {
  const sql = `SELECT url FROM banner_data WHERE id=1`;
  const response = await db.query(sql);
  return response[0];
}

async function checkSupplierPause(userEmail) {
  const response = await db.query(`SELECT pause FROM user_data WHERE email=?`,[userEmail]);
  if (response && response.length > 0) {
    return response[0];
  } else {
    return false;
  }
}

module.exports = {
  verifyJwt,
  getUsers,
  getClientData,
  updateToken,
  getTotalCost,
  getQuotesData,
  updateInventory,
  addingNewClient,
  addSpendOnClient,
  addInventoryData,
  addingNewToInventory,
  getAllInventory,
  getOrderBetweenDate,
  getDataFromAddInventory,
  getDataAddInventoryByKey,
  updateAddInventory,
  getUserByName,
  getUserByEmail,
  updateProductsDetail,
  getAllOrderHistory,
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
};
