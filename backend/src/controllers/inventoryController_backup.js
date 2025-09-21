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

    // Build WHERE clause
    let whereClause = "WHERE (iv.FLAGDEL IS NULL OR iv.FLAGDEL != 'Y')";
    
    if (activeOnly === 'true') {
      whereClause += " AND (iv.FLAGACTIVE IS NULL OR iv.FLAGACTIVE = 'T')";
    }
    
    if (search) {
      whereClause += ` AND (iv.PARTCODE LIKE '%${search}%' OR iv.PARTNAME LIKE '%${search}%' OR iv.PARTDESC LIKE '%${search}%')`;
    }
    
    if (groupId) {
      whereClause += ` AND iv.IVGROUPNO = ${groupId}`;
    }
    
    if (typeId) {
      whereClause += ` AND iv.IVTYPENO = ${typeId}`;
    }
    
    if (vendorId) {
      whereClause += ` AND iv.VENDORNO = ${vendorId}`;
    }

    const query = `
      SELECT 
        iv.PARTNO,
        iv.PARTCODE,
        iv.PARTNAME,
        iv.PARTDESC,
        iv.IVGROUPNO,
        iv.IVTYPENO,
        iv.UNITNO,
        iv.VENDORNO,
        iv.STORELOCNO,
        iv.UNITCOST,
        iv.AVGCOST,
        iv.STDCOST,
        iv.LASTCOST,
        iv.MAXSTOCK,
        iv.MINSTOCK,
        iv.REORDERPOINT,
        iv.REORDERQTY,
        iv.LEADTIME,
        iv.FLAGACTIVE,
        iv.PARTTYPE,
        iv.CREATEDATE,
        iv.UPDATEDATE,
        
        -- Group information
        ig.IVGROUPCODE,
        ig.IVGROUPNAME,
        
        -- Type information
        it.IVTYPECODE,
        it.IVTYPENAME,
        
        -- Unit information
        iu.UNITCODE,
        iu.UNITNAME,
        
        -- Vendor information
        v.VENDORCODE,
        v.VENDORNAME,
        
        -- Store information
        s.STORECODE,
        s.STORENAME,
        
        -- Current stock balance
        ISNULL(bal.QTY_ONHAND, 0) as QTY_ONHAND,
        ISNULL(bal.QTY_RESERVED, 0) as QTY_RESERVED,
        ISNULL(bal.QTY_AVAILABLE, 0) as QTY_AVAILABLE,
        ISNULL(bal.VALUE_ONHAND, 0) as VALUE_ONHAND
        
      FROM Iv_Catalog iv
      LEFT JOIN IVGroup ig ON iv.IVGROUPNO = ig.IVGROUPNO
      LEFT JOIN IVType it ON iv.IVTYPENO = it.IVTYPENO
      LEFT JOIN IVUnit iu ON iv.UNITNO = iu.UNITNO
      LEFT JOIN IV_Vendor v ON iv.VENDORNO = v.VENDORNO
      LEFT JOIN Iv_Store s ON iv.STORELOCNO = s.STORELOCNO
      LEFT JOIN IV_Store_Bal bal ON iv.PARTNO = bal.PARTNO AND iv.STORELOCNO = bal.STORELOCNO
      ${whereClause}
      ORDER BY iv.${sortBy} ${sortOrder}
      OFFSET ${offset} ROWS
      FETCH NEXT ${limit} ROWS ONLY
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM Iv_Catalog iv
      ${whereClause}
    `;

    const [result, countResult] = await Promise.all([
      pool.request().query(query),
      pool.request().query(countQuery)
    ]);

    const inventoryItems = result.recordset.map(item => ({
      id: item.PARTNO,
      partCode: item.PARTCODE,
      partName: item.PARTNAME,
      description: item.PARTDESC,
      partType: item.PARTTYPE,
      isActive: item.FLAGACTIVE === 'T',
      
      costs: {
        unitCost: item.UNITCOST,
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
        id: item.UNITNO,
        code: item.UNITCODE,
        name: item.UNITNAME
      },
      
      vendor: {
        id: item.VENDORNO,
        code: item.VENDORCODE,
        name: item.VENDORNAME
      },
      
      store: {
        id: item.STORELOCNO,
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
        iu.UNITCODE,
        iu.UNITNAME,
        v.VENDORCODE,
        v.VENDORNAME,
        v.VENDORADDRESS,
        v.VENDORPHONE,
        v.VENDOREMAIL,
        s.STORECODE,
        s.STORENAME,
        s.STOREDESC
      FROM Iv_Catalog iv
      LEFT JOIN IVGroup ig ON iv.IVGROUPNO = ig.IVGROUPNO
      LEFT JOIN IVType it ON iv.IVTYPENO = it.IVTYPENO
      LEFT JOIN IVUnit iu ON iv.UNITNO = iu.UNITNO
      LEFT JOIN IV_Vendor v ON iv.VENDORNO = v.VENDORNO
      LEFT JOIN Iv_Store s ON iv.STORELOCNO = s.STORELOCNO
      WHERE iv.PARTNO = @id AND (iv.FLAGDEL IS NULL OR iv.FLAGDEL != 'Y')
    `;

    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(query);

    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    const item = result.recordset[0];
    
    const inventoryItem = {
      id: item.PARTNO,
      partCode: item.PARTCODE,
      partName: item.PARTNAME,
      description: item.PARTDESC,
      partType: item.PARTTYPE,
      isActive: item.FLAGACTIVE === 'T',
      
      // Complete item details
      costs: {
        unitCost: item.UNITCOST,
        averageCost: item.AVGCOST,
        standardCost: item.STDCOST,
        lastCost: item.LASTCOST
      },
      
      stock: {
        maxStock: item.MAXSTOCK,
        minStock: item.MINSTOCK,
        reorderPoint: item.REORDERPOINT,
        reorderQuantity: item.REORDERQTY,
        leadTime: item.LEADTIME
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
        id: item.UNITNO,
        code: item.UNITCODE,
        name: item.UNITNAME
      },
      
      vendor: {
        id: item.VENDORNO,
        code: item.VENDORCODE,
        name: item.VENDORNAME,
        address: item.VENDORADDRESS,
        phone: item.VENDORPHONE,
        email: item.VENDOREMAIL
      },
      
      store: {
        id: item.STORELOCNO,
        code: item.STORECODE,
        name: item.STORENAME,
        description: item.STOREDESC
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
      SELECT TOP ${limit}
        iv.PARTNO,
        iv.PARTCODE,
        iv.PARTNAME,
        iv.PARTDESC,
        ig.IVGROUPNAME,
        ISNULL(bal.QTY_AVAILABLE, 0) as QTY_AVAILABLE
      FROM Iv_Catalog iv
      LEFT JOIN IVGroup ig ON iv.IVGROUPNO = ig.IVGROUPNO
      LEFT JOIN IV_Store_Bal bal ON iv.PARTNO = bal.PARTNO
      WHERE (iv.FLAGDEL IS NULL OR iv.FLAGDEL != 'Y')
        AND (iv.FLAGACTIVE IS NULL OR iv.FLAGACTIVE = 'T')
        AND (iv.PARTCODE LIKE '%${q}%' OR iv.PARTNAME LIKE '%${q}%' OR iv.PARTDESC LIKE '%${q}%')
      ORDER BY 
        CASE 
          WHEN iv.PARTCODE LIKE '${q}%' THEN 1
          WHEN iv.PARTNAME LIKE '${q}%' THEN 2
          ELSE 3
        END,
        iv.PARTCODE
    `;

    const result = await pool.request().query(query);

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
    
    if (activeOnly === 'true') {
      whereClause += " AND (s.FLAGACTIVE IS NULL OR s.FLAGACTIVE = 'T')";
    }
    
    if (search) {
      whereClause += ` AND (s.STORECODE LIKE '%${search}%' OR s.STORENAME LIKE '%${search}%')`;
    }

    const query = `
      SELECT 
        s.STORELOCNO,
        s.STORECODE,
        s.STORENAME,
        s.STOREDESC,
        s.STORETYPE,
        s.FLAGACTIVE,
        s.CREATEDATE,
        s.UPDATEDATE,
        COUNT(bal.PARTNO) as TOTAL_ITEMS,
        SUM(bal.VALUE_ONHAND) as TOTAL_VALUE
      FROM Iv_Store s
      LEFT JOIN IV_Store_Bal bal ON s.STORELOCNO = bal.STORELOCNO
      ${whereClause}
      GROUP BY s.STORELOCNO, s.STORECODE, s.STORENAME, s.STOREDESC, s.STORETYPE, s.FLAGACTIVE, s.CREATEDATE, s.UPDATEDATE
      ORDER BY s.STORECODE
      OFFSET ${offset} ROWS
      FETCH NEXT ${limit} ROWS ONLY
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM Iv_Store s
      ${whereClause}
    `;

    const [result, countResult] = await Promise.all([
      pool.request().query(query),
      pool.request().query(countQuery)
    ]);

    const stores = result.recordset.map(store => ({
      id: store.STORELOCNO,
      storeCode: store.STORECODE,
      storeName: store.STORENAME,
      description: store.STOREDESC,
      storeType: store.STORETYPE,
      isActive: store.FLAGACTIVE === 'T',
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
        COUNT(bal.PARTNO) as TOTAL_ITEMS,
        SUM(bal.QTY_ONHAND) as TOTAL_QUANTITY,
        SUM(bal.VALUE_ONHAND) as TOTAL_VALUE
      FROM Iv_Store s
      LEFT JOIN IV_Store_Bal bal ON s.STORELOCNO = bal.STORELOCNO
      WHERE s.STORELOCNO = @id AND (s.FLAGDEL IS NULL OR s.FLAGDEL != 'Y')
      GROUP BY s.STORELOCNO, s.STORECODE, s.STORENAME, s.STOREDESC, s.STORETYPE, s.FLAGACTIVE, s.CREATEDATE, s.UPDATEDATE
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
        id: store.STORELOCNO,
        storeCode: store.STORECODE,
        storeName: store.STORENAME,
        description: store.STOREDESC,
        storeType: store.STORETYPE,
        isActive: store.FLAGACTIVE === 'T',
        
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
    
    let whereClause = `WHERE bal.STORELOCNO = @storeId`;
    
    if (lowStockOnly === 'true') {
      whereClause += ` AND bal.QTY_AVAILABLE <= iv.REORDERPOINT`;
    }

    const query = `
      SELECT 
        bal.*,
        iv.PARTCODE,
        iv.PARTNAME,
        iv.PARTDESC,
        iv.REORDERPOINT,
        iv.REORDERQTY,
        iv.MINSTOCK,
        iv.MAXSTOCK,
        iu.UNITCODE
      FROM IV_Store_Bal bal
      LEFT JOIN Iv_Catalog iv ON bal.PARTNO = iv.PARTNO
      LEFT JOIN IVUnit iu ON iv.UNITNO = iu.UNITNO
      ${whereClause}
      ORDER BY iv.PARTCODE
      OFFSET ${offset} ROWS
      FETCH NEXT ${limit} ROWS ONLY
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM IV_Store_Bal bal
      LEFT JOIN Iv_Catalog iv ON bal.PARTNO = iv.PARTNO
      ${whereClause}
    `;

    const [result, countResult] = await Promise.all([
      pool.request()
        .input('storeId', sql.Int, id)
        .query(query),
      pool.request()
        .input('storeId', sql.Int, id)
        .query(countQuery)
    ]);

    const inventory = result.recordset.map(item => ({
      partId: item.PARTNO,
      partCode: item.PARTCODE,
      partName: item.PARTNAME,
      description: item.PARTDESC,
      unitCode: item.UNITCODE,
      
      quantities: {
        onHand: item.QTY_ONHAND,
        reserved: item.QTY_RESERVED,
        available: item.QTY_AVAILABLE,
        pending: item.QTY_PENDING
      },
      
      values: {
        onHand: item.VALUE_ONHAND,
        reserved: item.VALUE_RESERVED,
        available: item.VALUE_AVAILABLE
      },
      
      stockLevels: {
        reorderPoint: item.REORDERPOINT,
        reorderQuantity: item.REORDERQTY,
        minStock: item.MINSTOCK,
        maxStock: item.MAXSTOCK,
        isLowStock: item.QTY_AVAILABLE <= item.REORDERPOINT
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
    
    if (activeOnly === 'true') {
      whereClause += " AND (v.FLAGACTIVE IS NULL OR v.FLAGACTIVE = 'T')";
    }
    
    if (search) {
      whereClause += ` AND (v.VENDORCODE LIKE '%${search}%' OR v.VENDORNAME LIKE '%${search}%')`;
    }

    const query = `
      SELECT 
        v.*,
        COUNT(iv.PARTNO) as TOTAL_PARTS
      FROM IV_Vendor v
      LEFT JOIN Iv_Catalog iv ON v.VENDORNO = iv.VENDORNO
      ${whereClause}
      GROUP BY v.VENDORNO, v.VENDORCODE, v.VENDORNAME, v.VENDORADDRESS, v.VENDORPHONE, v.VENDOREMAIL, v.FLAGACTIVE, v.CREATEDATE, v.UPDATEDATE
      ORDER BY v.VENDORCODE
      OFFSET ${offset} ROWS
      FETCH NEXT ${limit} ROWS ONLY
    `;

    const result = await pool.request().query(query);

    const vendors = result.recordset.map(vendor => ({
      id: vendor.VENDORNO,
      vendorCode: vendor.VENDORCODE,
      vendorName: vendor.VENDORNAME,
      address: vendor.VENDORADDRESS,
      phone: vendor.VENDORPHONE,
      email: vendor.VENDOREMAIL,
      isActive: vendor.FLAGACTIVE === 'T',
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
        COUNT(CASE WHEN iv.FLAGACTIVE = 'T' THEN 1 END) as activeItems,
        COUNT(CASE WHEN bal.QTY_AVAILABLE <= iv.REORDERPOINT THEN 1 END) as lowStockItems,
        COUNT(CASE WHEN bal.QTY_AVAILABLE = 0 THEN 1 END) as outOfStockItems,
        SUM(bal.VALUE_ONHAND) as totalInventoryValue,
        AVG(iv.UNITCOST) as avgUnitCost,
        COUNT(DISTINCT v.VENDORNO) as totalVendors,
        COUNT(DISTINCT s.STORELOCNO) as totalStores
      FROM Iv_Catalog iv
      LEFT JOIN IV_Store_Bal bal ON iv.PARTNO = bal.PARTNO
      LEFT JOIN IV_Vendor v ON iv.VENDORNO = v.VENDORNO
      LEFT JOIN Iv_Store s ON iv.STORELOCNO = s.STORELOCNO
      WHERE (iv.FLAGDEL IS NULL OR iv.FLAGDEL != 'Y')
    `;

    const groupStatsQuery = `
      SELECT 
        ig.IVGROUPNAME,
        ig.IVGROUPCODE,
        COUNT(iv.PARTNO) as itemCount,
        SUM(bal.VALUE_ONHAND) as totalValue
      FROM Iv_Catalog iv
      LEFT JOIN IVGroup ig ON iv.IVGROUPNO = ig.IVGROUPNO
      LEFT JOIN IV_Store_Bal bal ON iv.PARTNO = bal.PARTNO
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
        UNITNO as id,
        UNITCODE as code,
        UNITNAME as name,
        UNITDESC as description
      FROM IVUnit
      WHERE FLAGDEL IS NULL OR FLAGDEL != 'Y'
      ORDER BY UNITCODE
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
        ig.IVGROUPDESC as description,
        COUNT(iv.PARTNO) as itemCount
      FROM IVGroup ig
      LEFT JOIN Iv_Catalog iv ON ig.IVGROUPNO = iv.IVGROUPNO
      WHERE ig.FLAGDEL IS NULL OR ig.FLAGDEL != 'Y'
      GROUP BY ig.IVGROUPNO, ig.IVGROUPCODE, ig.IVGROUPNAME, ig.IVGROUPDESC
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
        it.IVTYPEDESC as description,
        COUNT(iv.PARTNO) as itemCount
      FROM IVType it
      LEFT JOIN Iv_Catalog iv ON it.IVTYPENO = iv.IVTYPENO
      WHERE it.FLAGDEL IS NULL OR it.FLAGDEL != 'Y'
      GROUP BY it.IVTYPENO, it.IVTYPECODE, it.IVTYPENAME, it.IVTYPEDESC
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
      SELECT TOP ${limit}
        iv.PARTNO,
        iv.PARTCODE,
        iv.PARTNAME,
        iv.REORDERPOINT,
        iv.REORDERQTY,
        iv.MINSTOCK,
        bal.QTY_AVAILABLE,
        bal.QTY_ONHAND,
        s.STORECODE,
        s.STORENAME,
        v.VENDORNAME
      FROM Iv_Catalog iv
      LEFT JOIN IV_Store_Bal bal ON iv.PARTNO = bal.PARTNO
      LEFT JOIN Iv_Store s ON bal.STORELOCNO = s.STORELOCNO
      LEFT JOIN IV_Vendor v ON iv.VENDORNO = v.VENDORNO
      WHERE (iv.FLAGDEL IS NULL OR iv.FLAGDEL != 'Y')
        AND (iv.FLAGACTIVE IS NULL OR iv.FLAGACTIVE = 'T')
        AND bal.QTY_AVAILABLE <= iv.REORDERPOINT
        AND iv.REORDERPOINT > 0
      ORDER BY (bal.QTY_AVAILABLE - iv.REORDERPOINT) ASC
    `;

    const result = await pool.request().query(query);

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
