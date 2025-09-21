const sql = require('mssql');
const dbConfig = require('../config/dbConfig');

// Get inventory catalog with filtering and pagination
exports.getInventoryCatalog = async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    
    const {
      page = 1,
      limit = 20,
      search,
      groupId,
      typeId,
      vendorId,
      activeOnly = 'true',
      sortBy = 'PARTCODE',
      sortOrder = 'ASC'
    } = req.query;

    const offset = (page - 1) * limit;

    // Build WHERE clause with parameterized queries for security
    let whereClause = "WHERE (iv.FLAGDEL IS NULL OR iv.FLAGDEL != 'Y')";
    const params = [];
    
    if (activeOnly === 'true') {
      whereClause += " AND (iv.FlagActive IS NULL OR iv.FlagActive = 'T')";
    }
    
    if (search) {
      whereClause += " AND (iv.PARTCODE LIKE @search OR iv.PARTNAME LIKE @search OR iv.PARTDESC LIKE @search)";
      params.push({ name: 'search', type: sql.NVarChar, value: `%${search}%` });
    }
    
    if (groupId) {
      whereClause += " AND iv.IVGROUPNO = @groupId";
      params.push({ name: 'groupId', type: sql.Int, value: parseInt(groupId) });
    }
    
    if (typeId) {
      whereClause += " AND iv.IVTYPENO = @typeId";
      params.push({ name: 'typeId', type: sql.Int, value: parseInt(typeId) });
    }
    
    if (vendorId) {
      whereClause += " AND iv.PREFER_VENDOR = @vendorId";
      params.push({ name: 'vendorId', type: sql.Int, value: parseInt(vendorId) });
    }

    // Updated query to use current Iv_Store instead of historical IV_Store_Bal
    const query = `
      SELECT 
        iv.PARTNO,
        iv.PARTCODE,
        iv.PARTNAME,
        iv.PARTDESC,
        iv.IVGROUPNO,
        iv.IVTYPENO,
        iv.IVUNITNO,
        iv.PREFER_VENDOR as VENDORNO,
        iv.Category,
        iv.FlagActive,
        iv.CREATEDATE,
        iv.UPDATEDATE,
        
        -- Group information
        ig.IVGROUPCODE,
        ig.IVGROUPNAME,
        
        -- Type information
        it.IVTYPECODE,
        it.IVTYPENAME,
        
        -- Unit information
        iu.IVUNITCODE,
        iu.IVUNITNAME,
        
        -- Vendor information
        v.VENDORCODE,
        v.VENDORNAME,
        
        -- Current stock balance from Iv_Store (current data)
        ISNULL(curr.QOnhand, 0) as QTY_ONHAND,
        ISNULL(curr.QReserve, 0) as QTY_RESERVED,
        ISNULL((curr.QOnhand - curr.QReserve), 0) as QTY_AVAILABLE,
        ISNULL(curr.Amount, 0) as VALUE_ONHAND,
        
        -- Store information
        s.STORECODE,
        s.STORENAME,
        
        -- Stock control from current store data
        curr.QMin as MINSTOCK,
        curr.QMax as MAXSTOCK,
        curr.QReOrder as REORDERPOINT,
        curr.QEOQ as REORDERQTY,
        curr.LeadTimeEOQ as LEADTIME,
        curr.UnitCost,
        curr.UnitCost_Avg as AVGCOST,
        curr.UnitCost_STD as STDCOST,
        curr.UnitCost_LastPO as LASTCOST,
        curr.BinLocation,
        curr.Shelf
        
      FROM Iv_Catalog iv
      LEFT JOIN IVGroup ig ON iv.IVGROUPNO = ig.IVGROUPNO
      LEFT JOIN IVType it ON iv.IVTYPENO = it.IVTYPENO
      LEFT JOIN IVUnit iu ON iv.IVUNITNO = iu.IVUNITNO
      LEFT JOIN Vendor v ON iv.PREFER_VENDOR = v.VENDORNO
      LEFT JOIN (
        SELECT 
          PartNo,
          StoreNo,
          QOnhand,
          QReserve,
          Amount,
          QMin,
          QMax,
          QReOrder,
          QEOQ,
          LeadTimeEOQ,
          UnitCost,
          UnitCost_Avg,
          UnitCost_STD,
          UnitCost_LastPO,
          BinLocation,
          Shelf,
          ROW_NUMBER() OVER (PARTITION BY PartNo ORDER BY QOnhand DESC) as rn
        FROM Iv_Store
        WHERE FlagDel IS NULL OR FlagDel != 'Y'
      ) curr ON iv.PARTNO = curr.PartNo AND curr.rn = 1
      LEFT JOIN Store s ON curr.StoreNo = s.STORENO
      ${whereClause}
      ORDER BY iv.${sortBy} ${sortOrder}
      OFFSET @offset ROWS
      FETCH NEXT @limit ROWS ONLY
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM Iv_Catalog iv
      ${whereClause}
    `;

    // Execute queries with parameters
    const dataRequest = pool.request();
    const countRequest = pool.request();
    
    // Add parameters to both requests
    params.forEach(param => {
      dataRequest.input(param.name, param.type, param.value);
      countRequest.input(param.name, param.type, param.value);
    });
    
    dataRequest.input('offset', sql.Int, offset);
    dataRequest.input('limit', sql.Int, parseInt(limit));

    const [result, countResult] = await Promise.all([
      dataRequest.query(query),
      countRequest.query(countQuery)
    ]);

    const inventoryItems = result.recordset.map(item => ({
      id: item.PARTNO,
      partCode: item.PARTCODE,
      partName: item.PARTNAME,
      description: item.PARTDESC,
      partType: item.Category,
      isActive: item.FlagActive === 'T',
      
      costs: {
        unitCost: item.UnitCost,
        averageCost: item.AVGCOST,
        standardCost: item.STDCOST,
        lastCost: item.LASTCOST
      },
      
      stock: {
        maxStock: item.MAXSTOCK,
        minStock: item.MINSTOCK,
        reorderPoint: item.REORDERPOINT,
        reorderQuantity: item.REORDERQTY,
        leadTime: item.LEADTIME,
        onHand: item.QTY_ONHAND,
        reserved: item.QTY_RESERVED,
        available: item.QTY_AVAILABLE,
        value: item.VALUE_ONHAND
      },
      
      group: {
        id: item.IVGROUPNO,
        code: item.IVGROUPCODE,
        name: item.IVGROUPNAME
      },
      
      type: {
        id: item.IVTYPENO,
        code: item.IVTYPECODE,
        name: item.IVTYPENAME
      },
      
      unit: {
        id: item.IVUNITNO,
        code: item.IVUNITCODE,
        name: item.IVUNITNAME
      },
      
      vendor: {
        id: item.VENDORNO,
        code: item.VENDORCODE,
        name: item.VENDORNAME
      },
      
      store: {
        id: item.StoreNo,
        code: item.STORECODE,
        name: item.STORENAME
      },
      
      createdDate: item.CREATEDATE,
      updatedDate: item.UPDATEDATE
    }));

    const total = countResult.recordset[0].total;
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: {
        items: inventoryItems,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Error fetching inventory catalog:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch inventory catalog',
      error: error.message
    });
  }
};

// Get single inventory item by ID
exports.getInventoryItemById = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await sql.connect(dbConfig);
    
    const query = `
      SELECT 
        iv.*,
        ig.IVGROUPCODE,
        ig.IVGROUPNAME,
        it.IVTYPECODE,
        it.IVTYPENAME,
        iu.IVUNITCODE,
        iu.IVUNITNAME,
        v.VENDORCODE,
        v.VENDORNAME,
        v.ADDRESS as VENDORADDRESS,
        v.PHONE as VENDORPHONE,
        v.EMAIL as VENDOREMAIL,
        
        -- Creator information
        creator.PERSONNO as CREATOR_PERSONNO,
        creator.PERSONCODE as CREATOR_PERSONCODE,
        creator.PERSON_NAME as CREATOR_NAME,
        creator.FIRSTNAME as CREATOR_FIRSTNAME,
        creator.LASTNAME as CREATOR_LASTNAME,
        creator.TITLE as CREATOR_TITLE,
        creator.EMAIL as CREATOR_EMAIL,
        
        -- Updater information
        updater.PERSONNO as UPDATER_PERSONNO,
        updater.PERSONCODE as UPDATER_PERSONCODE,
        updater.PERSON_NAME as UPDATER_NAME,
        updater.FIRSTNAME as UPDATER_FIRSTNAME,
        updater.LASTNAME as UPDATER_LASTNAME,
        updater.TITLE as UPDATER_TITLE,
        updater.EMAIL as UPDATER_EMAIL
        
      FROM Iv_Catalog iv
      LEFT JOIN IVGroup ig ON iv.IVGROUPNO = ig.IVGROUPNO
      LEFT JOIN IVType it ON iv.IVTYPENO = it.IVTYPENO
      LEFT JOIN IVUnit iu ON iv.IVUNITNO = iu.IVUNITNO
      LEFT JOIN Vendor v ON iv.PREFER_VENDOR = v.VENDORNO
      LEFT JOIN Person creator ON iv.CREATEUSER = creator.PERSONNO
      LEFT JOIN Person updater ON iv.UPDATEUSER = updater.PERSONNO
      WHERE iv.PARTNO = @id AND (iv.FLAGDEL IS NULL OR iv.FLAGDEL != 'Y')
    `;

    // Get current location and cost information from Iv_Store (current data)
    const locationQuery = `
      SELECT 
        ivs.StoreNo,
        ivs.BinLocation,
        ivs.Shelf,
        ivs.QOnhand,
        ivs.QReserve,
        ivs.QPending,
        ivs.QMin,
        ivs.QMax,
        ivs.QReOrder,
        ivs.QEOQ,
        ivs.UnitCost,
        ivs.UnitCost_Avg,
        ivs.UnitCost_STD,
        ivs.UnitCost_LastPO,
        ivs.UnitCost_FIFO,
        ivs.Amount,
        ivs.LastIssue_Date,
        ivs.LastRcv_Date,
        ivs.LeadTimeEOQ,
        s.STORECODE,
        s.STORENAME
      FROM Iv_Store ivs
      LEFT JOIN Store s ON ivs.StoreNo = s.STORENO
      WHERE ivs.PartNo = @id AND (ivs.FlagDel IS NULL OR ivs.FlagDel != 'Y')
      ORDER BY ivs.QOnhand DESC
    `;

    const [result, locationResult] = await Promise.all([
      pool.request()
        .input('id', sql.Int, id)
        .query(query),
      pool.request()
        .input('id', sql.Int, id)
        .query(locationQuery)
    ]);

    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    const item = result.recordset[0];
    const locations = locationResult.recordset;
    
    // Calculate summary information from all locations
    const totalOnHand = locations.reduce((sum, loc) => sum + (loc.QOnhand || 0), 0);
    const totalReserved = locations.reduce((sum, loc) => sum + (loc.QReserve || 0), 0);
    const totalAvailable = totalOnHand - totalReserved;
    const totalValue = locations.reduce((sum, loc) => sum + (loc.Amount || 0), 0);

    // Get the primary location (first one with highest stock)
    const primaryLocation = locations[0];

    const inventoryItem = {
      id: item.PARTNO,
      partCode: item.PARTCODE,
      partName: item.PARTNAME,
      description: item.PARTDESC,
      partType: item.Category,
      isActive: item.FlagActive === 'T',
      
      // Cost information from primary location
      costs: {
        unitCost: primaryLocation?.UnitCost || 0,
        averageCost: primaryLocation?.UnitCost_Avg || 0,
        standardCost: primaryLocation?.UnitCost_STD || 0,
        lastPurchaseCost: primaryLocation?.UnitCost_LastPO || 0,
        fifoCost: primaryLocation?.UnitCost_FIFO || 0,
        totalValue: totalValue
      },

      // Stock summary across all locations
      stockSummary: {
        totalOnHand: totalOnHand,
        totalReserved: totalReserved,
        totalAvailable: totalAvailable,
        totalValue: totalValue,
        locationCount: locations.length
      },

      // All store locations with detailed information
      locations: locations.map(loc => ({
        storeId: loc.StoreNo,
        storeCode: loc.STORECODE,
        storeName: loc.STORENAME,
        binLocation: loc.BinLocation,
        shelf: loc.Shelf,
        quantities: {
          onHand: loc.QOnhand || 0,
          reserved: loc.QReserve || 0,
          available: (loc.QOnhand || 0) - (loc.QReserve || 0),
          pending: loc.QPending || 0
        },
        stockLevels: {
          minStock: loc.QMin || 0,
          maxStock: loc.QMax || 0,
          reorderPoint: loc.QReOrder || 0,
          reorderQuantity: loc.QEOQ || 0,
          leadTime: loc.LeadTimeEOQ || 0
        },
        costs: {
          unitCost: loc.UnitCost || 0,
          averageCost: loc.UnitCost_Avg || 0,
          standardCost: loc.UnitCost_STD || 0,
          lastPurchaseCost: loc.UnitCost_LastPO || 0,
          fifoCost: loc.UnitCost_FIFO || 0,
          totalValue: loc.Amount || 0
        },
        lastActivity: {
          lastIssueDate: loc.LastIssue_Date,
          lastReceiveDate: loc.LastRcv_Date
        }
      })),
      
      group: {
        id: item.IVGROUPNO,
        code: item.IVGROUPCODE,
        name: item.IVGROUPNAME
      },
      
      type: {
        id: item.IVTYPENO,
        code: item.IVTYPECODE,
        name: item.IVTYPENAME
      },
      
      unit: {
        id: item.IVUNITNO,
        code: item.IVUNITCODE,
        name: item.IVUNITNAME
      },
      
      vendor: {
        id: item.PREFER_VENDOR,
        code: item.VENDORCODE,
        name: item.VENDORNAME,
        address: item.VENDORADDRESS,
        phone: item.VENDORPHONE,
        email: item.VENDOREMAIL
      },

      // Record tracking information
      recordInfo: {
        creator: {
          id: item.CREATOR_PERSONNO,
          personCode: item.CREATOR_PERSONCODE,
          name: item.CREATOR_NAME,
          firstName: item.CREATOR_FIRSTNAME,
          lastName: item.CREATOR_LASTNAME,
          title: item.CREATOR_TITLE,
          email: item.CREATOR_EMAIL,
          createDate: item.CREATEDATE
        },
        updater: {
          id: item.UPDATER_PERSONNO,
          personCode: item.UPDATER_PERSONCODE,
          name: item.UPDATER_NAME,
          firstName: item.UPDATER_FIRSTNAME,
          lastName: item.UPDATER_LASTNAME,
          title: item.UPDATER_TITLE,
          email: item.UPDATER_EMAIL,
          updateDate: item.UPDATEDATE
        }
      },
      
      // Raw database fields
      allFields: item
    };

    res.json({
      success: true,
      data: inventoryItem
    });

  } catch (error) {
    console.error('Error fetching inventory item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch inventory item',
      error: error.message
    });
  }
};

// Search inventory items
exports.searchInventoryItems = async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;
    
    if (!q || q.length < 2) {
      return res.json({
        success: true,
        data: []
      });
    }

    const pool = await sql.connect(dbConfig);
    
    const query = `
      SELECT TOP (@limit)
        iv.PARTNO,
        iv.PARTCODE,
        iv.PARTNAME,
        iv.PARTDESC,
        ig.IVGROUPNAME,
        ISNULL(curr.QOnhand, 0) - ISNULL(curr.QReserve, 0) as QTY_AVAILABLE
      FROM Iv_Catalog iv
      LEFT JOIN IVGroup ig ON iv.IVGROUPNO = ig.IVGROUPNO
      LEFT JOIN (
        SELECT 
          PartNo,
          StoreNo,
          QOnhand, 
          QReserve,
          ROW_NUMBER() OVER (PARTITION BY PartNo ORDER BY QOnhand DESC) as rn
        FROM Iv_Store 
        WHERE FlagDel IS NULL OR FlagDel != 'Y'
      ) curr ON iv.PARTNO = curr.PartNo AND curr.rn = 1
      WHERE (iv.FLAGDEL IS NULL OR iv.FLAGDEL != 'Y')
        AND (iv.FlagActive IS NULL OR iv.FlagActive = 'T')
        AND (iv.PARTCODE LIKE @search OR iv.PARTNAME LIKE @search OR iv.PARTDESC LIKE @search)
      ORDER BY 
        CASE 
          WHEN iv.PARTCODE LIKE @searchPrefix THEN 1
          WHEN iv.PARTNAME LIKE @searchPrefix THEN 2
          ELSE 3
        END,
        iv.PARTCODE
    `;

    const request = pool.request();
    request.input('limit', sql.Int, parseInt(limit));
    request.input('search', sql.NVarChar, `%${q}%`);
    request.input('searchPrefix', sql.NVarChar, `${q}%`);

    const result = await request.query(query);

    const searchResults = result.recordset.map(item => ({
      id: item.PARTNO,
      partCode: item.PARTCODE,
      partName: item.PARTNAME,
      description: item.PARTDESC,
      groupName: item.IVGROUPNAME,
      availableQuantity: item.QTY_AVAILABLE
    }));

    res.json({
      success: true,
      data: searchResults
    });

  } catch (error) {
    console.error('Error searching inventory items:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search inventory items',
      error: error.message
    });
  }
};

// Get stores with pagination
exports.getStores = async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    
    const {
      page = 1,
      limit = 20,
      search,
      activeOnly = 'true'
    } = req.query;

    const offset = (page - 1) * limit;

    let whereClause = "WHERE (s.FLAGDEL IS NULL OR s.FLAGDEL != 'Y')";
    
    if (search) {
      whereClause += ` AND (s.STORECODE LIKE '%${search}%' OR s.STORENAME LIKE '%${search}%')`;
    }

    const query = `
      SELECT 
        s.STORENO,
        s.STORECODE,
        s.STORENAME,
        s.CREATEDATE,
        s.UPDATEDATE,
        COUNT(bal.PartNo) as TOTAL_ITEMS,
        SUM(bal.Amount) as TOTAL_VALUE
      FROM Store s
      LEFT JOIN IV_Store_Bal bal ON s.STORENO = bal.StoreNo
      ${whereClause}
      GROUP BY s.STORENO, s.STORECODE, s.STORENAME, s.CREATEDATE, s.UPDATEDATE
      ORDER BY s.STORECODE
      OFFSET ${offset} ROWS
      FETCH NEXT ${limit} ROWS ONLY
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM Store s
      ${whereClause}
    `;

    const [result, countResult] = await Promise.all([
      pool.request().query(query),
      pool.request().query(countQuery)
    ]);

    const stores = result.recordset.map(store => ({
      id: store.STORENO,
      storeCode: store.STORECODE,
      storeName: store.STORENAME,
      totalItems: store.TOTAL_ITEMS,
      totalValue: store.TOTAL_VALUE,
      createdDate: store.CREATEDATE,
      updatedDate: store.UPDATEDATE
    }));

    const total = countResult.recordset[0].total;
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: {
        stores,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Error fetching stores:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch stores',
      error: error.message
    });
  }
};

// Get store by ID
exports.getStoreById = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await sql.connect(dbConfig);
    
    const query = `
      SELECT 
        s.*,
        COUNT(bal.PartNo) as TOTAL_ITEMS,
        SUM(bal.QOnhand) as TOTAL_QUANTITY,
        SUM(bal.Amount) as TOTAL_VALUE
      FROM Store s
      LEFT JOIN IV_Store_Bal bal ON s.STORENO = bal.StoreNo
      WHERE s.STORENO = @id AND (s.FLAGDEL IS NULL OR s.FLAGDEL != 'Y')
      GROUP BY s.STORENO, s.STORECODE, s.STORENAME, s.FLAGDEL, s.CREATEUSER, s.CREATEDATE, s.UPDATEUSER, s.UPDATEDATE, s.PUNo, s.CostCenterNo, s.PRStock, s.PRNonStock, s.PRService, s.PRTool, s.SiteNo, s.sitecode
    `;

    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(query);

    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Store not found'
      });
    }

    const store = result.recordset[0];

    res.json({
      success: true,
      data: {
        id: store.STORENO,
        storeCode: store.STORECODE,
        storeName: store.STORENAME,
        
        summary: {
          totalItems: store.TOTAL_ITEMS,
          totalQuantity: store.TOTAL_QUANTITY,
          totalValue: store.TOTAL_VALUE
        },
        
        createdDate: store.CREATEDATE,
        updatedDate: store.UPDATEDATE,
        allFields: store
      }
    });

  } catch (error) {
    console.error('Error fetching store:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch store',
      error: error.message
    });
  }
};

// Get store inventory balances
exports.getStoreInventory = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20, lowStockOnly = 'false' } = req.query;
    const offset = (page - 1) * limit;

    const pool = await sql.connect(dbConfig);
    
    let whereClause = `WHERE ivs.StoreNo = @storeId AND (ivs.FlagDel IS NULL OR ivs.FlagDel != 'Y')`;
    
    if (lowStockOnly === 'true') {
      whereClause += ` AND (ivs.QOnhand - ivs.QReserve) <= ivs.QReOrder`;
    }

    const query = `
      SELECT 
        ivs.*,
        iv.PARTCODE,
        iv.PARTNAME,
        iv.PARTDESC,
        iu.IVUNITCODE
      FROM Iv_Store ivs
      LEFT JOIN Iv_Catalog iv ON ivs.PartNo = iv.PARTNO
      LEFT JOIN IVUnit iu ON iv.IVUNITNO = iu.IVUNITNO
      ${whereClause}
      ORDER BY iv.PARTCODE
      OFFSET @offset ROWS
      FETCH NEXT @limit ROWS ONLY
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM Iv_Store ivs
      LEFT JOIN Iv_Catalog iv ON ivs.PartNo = iv.PARTNO
      ${whereClause}
    `;

    const [result, countResult] = await Promise.all([
      pool.request()
        .input('storeId', sql.Int, id)
        .input('offset', sql.Int, offset)
        .input('limit', sql.Int, parseInt(limit))
        .query(query),
      pool.request()
        .input('storeId', sql.Int, id)
        .query(countQuery)
    ]);

    const inventory = result.recordset.map(item => ({
      partId: item.PartNo,
      partCode: item.PARTCODE,
      partName: item.PARTNAME,
      description: item.PARTDESC,
      unitCode: item.IVUNITCODE,
      
      quantities: {
        onHand: item.QOnhand,
        reserved: item.QReserve,
        available: item.QOnhand - item.QReserve,
        pending: item.QPending
      },
      
      values: {
        onHand: item.Amount,
        unitCost: item.UnitCost
      },
      
      stockLevels: {
        reorderPoint: item.QReOrder,
        reorderQuantity: item.QEOQ,
        minStock: item.QMin,
        maxStock: item.QMax,
        isLowStock: (item.QOnhand - item.QReserve) <= item.QReOrder
      }
    }));

    const total = countResult.recordset[0].total;
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: {
        storeId: parseInt(id),
        inventory,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Error fetching store inventory:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch store inventory',
      error: error.message
    });
  }
};

// Get vendors
exports.getVendors = async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    
    const {
      page = 1,
      limit = 20,
      search,
      activeOnly = 'true'
    } = req.query;

    const offset = (page - 1) * limit;

    let whereClause = "WHERE (v.FLAGDEL IS NULL OR v.FLAGDEL != 'Y')";
    
    if (search) {
      whereClause += ` AND (v.VENDORCODE LIKE '%${search}%' OR v.VENDORNAME LIKE '%${search}%')`;
    }

    const query = `
      SELECT 
        v.*,
        COUNT(iv.PARTNO) as TOTAL_PARTS
      FROM Vendor v
      LEFT JOIN Iv_Catalog iv ON v.VENDORNO = iv.PREFER_VENDOR
      ${whereClause}
      GROUP BY v.VENDORNO, v.VENDORCODE, v.VENDORNAME, v.ADDRESS, v.PHONE, v.FAX, v.EMAIL, v.URL, v.FLAGDEL, v.CREATEUSER, v.CREATEDATE, v.UPDATEUSER, v.UPDATEDATE, v.MonetaryNo, v.SiteNo
      ORDER BY v.VENDORCODE
      OFFSET ${offset} ROWS
      FETCH NEXT ${limit} ROWS ONLY
    `;

    const result = await pool.request().query(query);

    const vendors = result.recordset.map(vendor => ({
      id: vendor.VENDORNO,
      vendorCode: vendor.VENDORCODE,
      vendorName: vendor.VENDORNAME,
      address: vendor.ADDRESS,
      phone: vendor.PHONE,
      email: vendor.EMAIL,
      totalParts: vendor.TOTAL_PARTS,
      createdDate: vendor.CREATEDATE,
      updatedDate: vendor.UPDATEDATE
    }));

    res.json({
      success: true,
      data: vendors
    });

  } catch (error) {
    console.error('Error fetching vendors:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vendors',
      error: error.message
    });
  }
};

// Get inventory statistics
exports.getInventoryStats = async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    
    const statsQuery = `
      SELECT 
        COUNT(iv.PARTNO) as totalItems,
        COUNT(CASE WHEN iv.FlagActive = 'T' THEN 1 END) as activeItems,
        COUNT(CASE WHEN (curr.QOnhand - curr.QReserve) <= curr.QReOrder AND curr.QReOrder > 0 THEN 1 END) as lowStockItems,
        COUNT(CASE WHEN curr.QOnhand = 0 THEN 1 END) as outOfStockItems,
        SUM(curr.Amount) as totalInventoryValue,
        AVG(curr.UnitCost) as avgUnitCost,
        COUNT(DISTINCT v.VENDORNO) as totalVendors,
        COUNT(DISTINCT s.STORENO) as totalStores
      FROM Iv_Catalog iv
      LEFT JOIN Iv_Store curr ON iv.PARTNO = curr.PartNo AND (curr.FlagDel IS NULL OR curr.FlagDel != 'Y')
      LEFT JOIN Vendor v ON iv.PREFER_VENDOR = v.VENDORNO
      LEFT JOIN Store s ON curr.StoreNo = s.STORENO
      WHERE (iv.FLAGDEL IS NULL OR iv.FLAGDEL != 'Y')
    `;

    const groupStatsQuery = `
      SELECT 
        ig.IVGROUPNAME,
        ig.IVGROUPCODE,
        COUNT(iv.PARTNO) as itemCount,
        SUM(curr.Amount) as totalValue
      FROM Iv_Catalog iv
      LEFT JOIN IVGroup ig ON iv.IVGROUPNO = ig.IVGROUPNO
      LEFT JOIN Iv_Store curr ON iv.PARTNO = curr.PartNo AND (curr.FlagDel IS NULL OR curr.FlagDel != 'Y')
      WHERE (iv.FLAGDEL IS NULL OR iv.FLAGDEL != 'Y')
      GROUP BY ig.IVGROUPNAME, ig.IVGROUPCODE
      ORDER BY itemCount DESC
    `;

    const [statsResult, groupStatsResult] = await Promise.all([
      pool.request().query(statsQuery),
      pool.request().query(groupStatsQuery)
    ]);

    const stats = statsResult.recordset[0];

    res.json({
      success: true,
      data: {
        overview: {
          totalItems: stats.totalItems,
          activeItems: stats.activeItems,
          lowStockItems: stats.lowStockItems,
          outOfStockItems: stats.outOfStockItems,
          totalInventoryValue: Math.round(stats.totalInventoryValue || 0),
          avgUnitCost: Math.round(stats.avgUnitCost || 0),
          totalVendors: stats.totalVendors,
          totalStores: stats.totalStores
        },
        byGroup: groupStatsResult.recordset
      }
    });

  } catch (error) {
    console.error('Error fetching inventory stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch inventory statistics',
      error: error.message
    });
  }
};

// Get inventory units
exports.getInventoryUnits = async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    
    const query = `
      SELECT 
        IVUNITNO as id,
        IVUNITCODE as code,
        IVUNITNAME as name
      FROM IVUnit
      WHERE FLAGDEL IS NULL OR FLAGDEL != 'Y'
      ORDER BY IVUNITCODE
    `;

    const result = await pool.request().query(query);

    res.json({
      success: true,
      data: result.recordset
    });

  } catch (error) {
    console.error('Error fetching inventory units:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch inventory units',
      error: error.message
    });
  }
};

// Get inventory groups
exports.getInventoryGroups = async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    
    const query = `
      SELECT 
        ig.IVGROUPNO as id,
        ig.IVGROUPCODE as code,
        ig.IVGROUPNAME as name,
        COUNT(iv.PARTNO) as itemCount
      FROM IVGroup ig
      LEFT JOIN Iv_Catalog iv ON ig.IVGROUPNO = iv.IVGROUPNO
      WHERE ig.FLAGDEL IS NULL OR ig.FLAGDEL != 'Y'
      GROUP BY ig.IVGROUPNO, ig.IVGROUPCODE, ig.IVGROUPNAME
      ORDER BY ig.IVGROUPCODE
    `;

    const result = await pool.request().query(query);

    res.json({
      success: true,
      data: result.recordset
    });

  } catch (error) {
    console.error('Error fetching inventory groups:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch inventory groups',
      error: error.message
    });
  }
};

// Get inventory types
exports.getInventoryTypes = async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    
    const query = `
      SELECT 
        it.IVTYPENO as id,
        it.IVTYPECODE as code,
        it.IVTYPENAME as name,
        COUNT(iv.PARTNO) as itemCount
      FROM IVType it
      LEFT JOIN Iv_Catalog iv ON it.IVTYPENO = iv.IVTYPENO
      WHERE it.FLAGDEL IS NULL OR it.FLAGDEL != 'Y'
      GROUP BY it.IVTYPENO, it.IVTYPECODE, it.IVTYPENAME
      ORDER BY it.IVTYPECODE
    `;

    const result = await pool.request().query(query);

    res.json({
      success: true,
      data: result.recordset
    });

  } catch (error) {
    console.error('Error fetching inventory types:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch inventory types',
      error: error.message
    });
  }
};

// Get low stock items
exports.getLowStockItems = async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    
    const { limit = 50 } = req.query;

    const query = `
      SELECT TOP (@limit)
        iv.PARTNO,
        iv.PARTCODE,
        iv.PARTNAME,
        curr.QReOrder as REORDERPOINT,
        curr.QEOQ as REORDERQTY,
        curr.QMin as MINSTOCK,
        curr.QOnhand as QTY_ONHAND,
        (curr.QOnhand - curr.QReserve) as QTY_AVAILABLE,
        s.STORECODE,
        s.STORENAME,
        v.VENDORNAME
      FROM Iv_Catalog iv
      LEFT JOIN Iv_Store curr ON iv.PARTNO = curr.PartNo AND (curr.FlagDel IS NULL OR curr.FlagDel != 'Y')
      LEFT JOIN Store s ON curr.StoreNo = s.STORENO
      LEFT JOIN Vendor v ON iv.PREFER_VENDOR = v.VENDORNO
      WHERE (iv.FLAGDEL IS NULL OR iv.FLAGDEL != 'Y')
        AND (iv.FlagActive IS NULL OR iv.FlagActive = 'T')
        AND (curr.QOnhand - curr.QReserve) <= curr.QReOrder
        AND curr.QReOrder > 0
      ORDER BY ((curr.QOnhand - curr.QReserve) - curr.QReOrder) ASC
    `;

    const request = pool.request();
    request.input('limit', sql.Int, parseInt(limit));
    const result = await request.query(query);

    const lowStockItems = result.recordset.map(item => ({
      partId: item.PARTNO,
      partCode: item.PARTCODE,
      partName: item.PARTNAME,
      availableQuantity: item.QTY_AVAILABLE,
      onHandQuantity: item.QTY_ONHAND,
      reorderPoint: item.REORDERPOINT,
      reorderQuantity: item.REORDERQTY,
      minStock: item.MINSTOCK,
      shortage: item.REORDERPOINT - item.QTY_AVAILABLE,
      store: {
        code: item.STORECODE,
        name: item.STORENAME
      },
      vendor: {
        name: item.VENDORNAME
      }
    }));

    res.json({
      success: true,
      data: lowStockItems
    });

  } catch (error) {
    console.error('Error fetching low stock items:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch low stock items',
      error: error.message
    });
  }
};

// Get historical inventory data from IV_Store_Bal for reporting
exports.getHistoricalInventoryData = async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    
    const {
      year,
      month,
      partNo,
      storeNo,
      page = 1,
      limit = 20
    } = req.query;

    const offset = (page - 1) * limit;
    let whereClause = "WHERE (bal.FlagDel IS NULL OR bal.FlagDel != 'Y')";
    const params = [];

    if (year) {
      whereClause += " AND bal.StoreYear = @year";
      params.push({ name: 'year', type: sql.VarChar, value: year });
    }

    if (month) {
      whereClause += " AND bal.StoreMonth = @month";
      params.push({ name: 'month', type: sql.VarChar, value: month });
    }

    if (partNo) {
      whereClause += " AND bal.PartNo = @partNo";
      params.push({ name: 'partNo', type: sql.Int, value: parseInt(partNo) });
    }

    if (storeNo) {
      whereClause += " AND bal.StoreNo = @storeNo";
      params.push({ name: 'storeNo', type: sql.Int, value: parseInt(storeNo) });
    }

    const query = `
      SELECT 
        bal.*,
        iv.PARTCODE,
        iv.PARTNAME,
        iv.PARTDESC,
        s.STORECODE,
        s.STORENAME
      FROM IV_Store_Bal bal
      LEFT JOIN Iv_Catalog iv ON bal.PartNo = iv.PARTNO
      LEFT JOIN Store s ON bal.StoreNo = s.STORENO
      ${whereClause}
      ORDER BY bal.StoreYear DESC, bal.StoreMonth DESC, iv.PARTCODE
      OFFSET @offset ROWS
      FETCH NEXT @limit ROWS ONLY
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM IV_Store_Bal bal
      ${whereClause}
    `;

    const dataRequest = pool.request();
    const countRequest = pool.request();
    
    params.forEach(param => {
      dataRequest.input(param.name, param.type, param.value);
      countRequest.input(param.name, param.type, param.value);
    });
    
    dataRequest.input('offset', sql.Int, offset);
    dataRequest.input('limit', sql.Int, parseInt(limit));

    const [result, countResult] = await Promise.all([
      dataRequest.query(query),
      countRequest.query(countQuery)
    ]);

    const total = countResult.recordset[0].total;
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: {
        items: result.recordset,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Error fetching historical inventory data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch historical inventory data',
      error: error.message
    });
  }
};

// Get available historical periods
exports.getHistoricalPeriods = async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    
    const query = `
      SELECT DISTINCT 
        StoreYear,
        StoreMonth,
        COUNT(*) as recordCount
      FROM IV_Store_Bal
      WHERE StoreYear IS NOT NULL 
        AND StoreMonth IS NOT NULL
        AND (FlagDel IS NULL OR FlagDel != 'Y')
      GROUP BY StoreYear, StoreMonth
      ORDER BY StoreYear DESC, CAST(StoreMonth as int) DESC
    `;

    const result = await pool.request().query(query);

    res.json({
      success: true,
      data: result.recordset.map(item => ({
        year: item.StoreYear,
        month: item.StoreMonth,
        recordCount: item.recordCount,
        period: `${item.StoreYear}-${item.StoreMonth.padStart(2, '0')}`
      }))
    });

  } catch (error) {
    console.error('Error fetching historical periods:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch historical periods',
      error: error.message
    });
  }
};

// Additional placeholder functions for completeness
exports.getStoreBalances = async (req, res) => {
  res.json({ success: true, data: [], message: 'Store balances endpoint - to be implemented' });
};

exports.getVendorById = async (req, res) => {
  res.json({ success: true, data: {}, message: 'Vendor by ID endpoint - to be implemented' });
};

exports.getVendorParts = async (req, res) => {
  res.json({ success: true, data: [], message: 'Vendor parts endpoint - to be implemented' });
};

exports.getTransactions = async (req, res) => {
  res.json({ success: true, data: [], message: 'Transactions endpoint - to be implemented' });
};

exports.getTransactionById = async (req, res) => {
  res.json({ success: true, data: {}, message: 'Transaction by ID endpoint - to be implemented' });
};

exports.getTransactionHead = async (req, res) => {
  res.json({ success: true, data: {}, message: 'Transaction head endpoint - to be implemented' });
};

exports.getStockBalances = async (req, res) => {
  res.json({ success: true, data: [], message: 'Stock balances endpoint - to be implemented' });
};

exports.getPendingStock = async (req, res) => {
  res.json({ success: true, data: [], message: 'Pending stock endpoint - to be implemented' });
};

exports.getStockReceipts = async (req, res) => {
  res.json({ success: true, data: [], message: 'Stock receipts endpoint - to be implemented' });
};

exports.getInventoryTurnover = async (req, res) => {
  res.json({ success: true, data: {}, message: 'Inventory turnover endpoint - to be implemented' });
};

exports.getInventoryValuation = async (req, res) => {
  res.json({ success: true, data: {}, message: 'Inventory valuation endpoint - to be implemented' });
};

exports.getReorderPoints = async (req, res) => {
  res.json({ success: true, data: [], message: 'Reorder points endpoint - to be implemented' });
};

exports.getBySerialNumber = async (req, res) => {
  res.json({ success: true, data: {}, message: 'Serial number lookup endpoint - to be implemented' });
};

exports.getPartSerialNumbers = async (req, res) => {
  res.json({ success: true, data: [], message: 'Part serial numbers endpoint - to be implemented' });
};

exports.getCalculatedCosts = async (req, res) => {
  res.json({ success: true, data: [], message: 'Calculated costs endpoint - to be implemented' });
};

exports.getCostAnalysis = async (req, res) => {
  res.json({ success: true, data: {}, message: 'Cost analysis endpoint - to be implemented' });
};
