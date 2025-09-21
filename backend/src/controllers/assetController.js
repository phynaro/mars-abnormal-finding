const sql = require('mssql');
const dbConfig = require('../config/dbConfig');

// Helper function to get database connection
async function getConnection() {
  try {
    const pool = await sql.connect(dbConfig);
    return pool;
  } catch (err) {
    console.error('Database connection error:', err);
    throw new Error('Database connection failed');
  }
}

// Get all sites
const getSites = async (req, res) => {
  try {
    const pool = await getConnection();
    
    const result = await pool.request()
      .query(`
        SELECT SiteNo, SiteCode, SiteName, LogoPath, MaxNumOfUserLicense
        FROM Site 
        WHERE FlagDel = 'F'
        ORDER BY SiteName
      `);

    res.json({
      success: true,
      data: result.recordset,
      count: result.recordset.length
    });

  } catch (error) {
    console.error('Get sites error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

// Get departments by site
const getDepartments = async (req, res) => {
  try {
    const { siteNo } = req.params;
    const pool = await getConnection();
    
    const result = await pool.request()
      .input('siteNo', sql.Int, siteNo)
      .query(`
        SELECT DEPTNO, DEPTCODE, DEPTNAME, DEPTPARENT, HIERARCHYNO, CURR_LEVEL, SiteNo
        FROM Dept 
        WHERE FLAGDEL = 'F' AND SiteNo = @siteNo
        ORDER BY HIERARCHYNO, DEPTNAME
      `);

    res.json({
      success: true,
      data: result.recordset,
      count: result.recordset.length
    });

  } catch (error) {
    console.error('Get departments error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

// Get production units with filters
const getProductionUnits = async (req, res) => {
  try {
    const { 
      siteNo, 
      deptNo, 
      statusNo, 
      typeNo, 
      parentNo, 
      search, 
      page = 1, 
      limit = 50 
    } = req.query;

    const pool = await getConnection();
    const offset = (page - 1) * limit;

    let whereClause = "WHERE p.FLAGDEL = 'F'";
    const request = pool.request();

    if (siteNo) {
      whereClause += " AND p.SiteNo = @siteNo";
      request.input('siteNo', sql.Int, siteNo);
    }
    if (deptNo) {
      whereClause += " AND p.DEPTNO = @deptNo";
      request.input('deptNo', sql.Int, deptNo);
    }
    if (statusNo) {
      whereClause += " AND p.PUSTATUSNO = @statusNo";
      request.input('statusNo', sql.Int, statusNo);
    }
    if (typeNo) {
      whereClause += " AND p.PUTYPENO = @typeNo";
      request.input('typeNo', sql.Int, typeNo);
    }
    if (parentNo) {
      whereClause += " AND p.PUPARENT = @parentNo";
      request.input('parentNo', sql.Int, parentNo);
    }
    if (search) {
      whereClause += " AND (p.PUCODE LIKE @search OR p.PUNAME LIKE @search)";
      request.input('search', sql.NVarChar, `%${search}%`);
    }

    request.input('offset', sql.Int, offset);
    request.input('limit', sql.Int, parseInt(limit));

    const result = await request.query(`
      SELECT 
        p.PUNO, p.PUCODE, p.PUNAME, p.PUPARENT, p.PUREFCODE,
        p.PULOCATION, p.LATITUDE, p.LONGITUDE, p.IMG, p.NOTE,
        p.HIERARCHYNO, p.CURR_LEVEL, p.TEXT1, p.TEXT2, p.TEXT3,
        pt.PUTYPENAME, pt.PUTYPECODE,
        ps.PUSTATUSNAME, ps.PUSTATUSCODE,
        s.SiteName, s.SiteCode,
        d.DEPTNAME, d.DEPTCODE,
        pg.PUGROUPNAME
      FROM PU p
      LEFT JOIN PUType pt ON p.PUTYPENO = pt.PUTYPENO
      LEFT JOIN PUStatus ps ON p.PUSTATUSNO = ps.PUSTATUSNO
      LEFT JOIN Site s ON p.SiteNo = s.SiteNo
      LEFT JOIN Dept d ON p.DEPTNO = d.DEPTNO
      LEFT JOIN PUGroup pg ON p.PUGROUPNO = pg.PUGROUPNO
      ${whereClause}
      ORDER BY p.HIERARCHYNO, p.PUCODE
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `);

    // Get total count
    const countResult = await pool.request()
      .input('siteNo', sql.Int, siteNo || null)
      .input('deptNo', sql.Int, deptNo || null)
      .input('statusNo', sql.Int, statusNo || null)
      .input('typeNo', sql.Int, typeNo || null)
      .input('parentNo', sql.Int, parentNo || null)
      .input('search', sql.NVarChar, search ? `%${search}%` : null)
      .query(`
        SELECT COUNT(*) as total
        FROM PU p
        ${whereClause}
      `);

    res.json({
      success: true,
      data: result.recordset,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult.recordset[0].total,
        pages: Math.ceil(countResult.recordset[0].total / limit)
      }
    });

  } catch (error) {
    console.error('Get production units error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

// Get equipment with filters
const getEquipment = async (req, res) => {
  try {
    const { 
      siteNo, 
      puNo, 
      statusNo, 
      typeNo, 
      parentNo, 
      search, 
      page = 1, 
      limit = 50 
    } = req.query;

    const pool = await getConnection();
    const offset = (page - 1) * limit;

    let whereClause = "WHERE e.FLAGDEL = 'F'";
    const request = pool.request();

    if (siteNo) {
      whereClause += " AND e.SiteNo = @siteNo";
      request.input('siteNo', sql.Int, siteNo);
    }
    if (puNo) {
      whereClause += " AND e.PUNO = @puNo";
      request.input('puNo', sql.Int, puNo);
    }
    if (statusNo) {
      whereClause += " AND e.EQSTATUSNO = @statusNo";
      request.input('statusNo', sql.Int, statusNo);
    }
    if (typeNo) {
      whereClause += " AND e.EQTYPENO = @typeNo";
      request.input('typeNo', sql.Int, typeNo);
    }
    if (parentNo) {
      whereClause += " AND e.EQPARENT = @parentNo";
      request.input('parentNo', sql.Int, parentNo);
    }
    if (search) {
      whereClause += " AND (e.EQCODE LIKE @search OR e.EQNAME LIKE @search)";
      request.input('search', sql.NVarChar, `%${search}%`);
    }

    request.input('offset', sql.Int, offset);
    request.input('limit', sql.Int, parseInt(limit));

    const result = await request.query(`
      SELECT 
        e.EQNO, e.EQCODE, e.EQNAME, e.EQPARENT, e.EQREFCODE,
        e.ASSETNO, e.EQMODEL, e.EQSERIALNO, e.EQBrand,
        e.Location, e.Room, e.IMG, e.NOTE,
        e.HIERARCHYNO, e.CURR_LEVEL,
        e.EQ_SPEC_DATA1, e.EQ_SPEC_DATA2, e.EQ_SPEC_DATA3, e.EQ_SPEC_DATA4, e.EQ_SPEC_DATA5,
        p.PUCODE, p.PUNAME,
        et.EQTYPENAME, et.EQTYPECODE,
        es.EQSTATUSNAME, es.EQSTATUSCODE,
        s.SiteName, s.SiteCode,
        d_own.DEPTNAME as OwnerDeptName, d_own.DEPTCODE as OwnerDeptCode,
        d_maint.DEPTNAME as MaintDeptName, d_maint.DEPTCODE as MaintDeptCode,
        b.BUILDINGNAME, f.FLOORNAME
      FROM EQ e
      LEFT JOIN PU p ON e.PUNO = p.PUNO
      LEFT JOIN EQType et ON e.EQTYPENO = et.EQTYPENO
      LEFT JOIN EQStatus es ON e.EQSTATUSNO = es.EQSTATUSNO
      LEFT JOIN Site s ON e.SiteNo = s.SiteNo
      LEFT JOIN Dept d_own ON e.DEPT_OWN = d_own.DEPTNO
      LEFT JOIN Dept d_maint ON e.DEPT_MAINT = d_maint.DEPTNO
      LEFT JOIN EQ_Building b ON e.EQBuildingNo = b.BUILDINGNO
      LEFT JOIN EQ_Floor f ON e.EQFloorNo = f.FLOORNO
      ${whereClause}
      ORDER BY e.HIERARCHYNO, e.EQCODE
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `);

    // Get total count
    const countResult = await pool.request()
      .input('siteNo', sql.Int, siteNo || null)
      .input('puNo', sql.Int, puNo || null)
      .input('statusNo', sql.Int, statusNo || null)
      .input('typeNo', sql.Int, typeNo || null)
      .input('parentNo', sql.Int, parentNo || null)
      .input('search', sql.NVarChar, search ? `%${search}%` : null)
      .query(`
        SELECT COUNT(*) as total
        FROM EQ e
        ${whereClause}
      `);

    res.json({
      success: true,
      data: result.recordset,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult.recordset[0].total,
        pages: Math.ceil(countResult.recordset[0].total / limit)
      }
    });

  } catch (error) {
    console.error('Get equipment error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

// Get asset hierarchy tree (optimized with lazy loading)
const getAssetHierarchy = async (req, res) => {
  try {
    const { siteNo, level = 'department', includeEquipment = 'false' } = req.query;
    const pool = await getConnection();

    let hierarchyData = {};

    // Get sites
    const sitesResult = await pool.request()
      .query(`
        SELECT SiteNo, SiteCode, SiteName
        FROM Site 
        WHERE FlagDel = 'F'
        ORDER BY SiteName
      `);

    for (const site of sitesResult.recordset) {
      if (siteNo && site.SiteNo != siteNo) continue;

      hierarchyData[site.SiteNo] = {
        ...site,
        type: 'site',
        departments: {},
        stats: {
          totalDepartments: 0,
          totalProductionUnits: 0,
          totalEquipment: 0
        }
      };

      // Get departments for this site
      const deptResult = await pool.request()
        .input('siteNo', sql.Int, site.SiteNo)
        .query(`
          SELECT DEPTNO, DEPTCODE, DEPTNAME, DEPTPARENT, HIERARCHYNO
          FROM Dept 
          WHERE FLAGDEL = 'F' AND SiteNo = @siteNo
          ORDER BY HIERARCHYNO, DEPTNAME
        `);

      // Get production unit counts by department for this site
      const puCountResult = await pool.request()
        .input('siteNo', sql.Int, site.SiteNo)
        .query(`
          SELECT 
            COALESCE(p.DEPTNO, 0) as DEPTNO,
            COALESCE(d.DEPTNAME, 'General / Unassigned') as DEPTNAME,
            COALESCE(d.DEPTCODE, 'GENERAL') as DEPTCODE,
            COUNT(p.PUNO) as ProductionUnitCount
          FROM PU p
          LEFT JOIN Dept d ON p.DEPTNO = d.DEPTNO AND d.FLAGDEL = 'F'
          WHERE p.FLAGDEL = 'F' AND p.SiteNo = @siteNo
          GROUP BY p.DEPTNO, d.DEPTNAME, d.DEPTCODE
          ORDER BY COALESCE(p.DEPTNO, 0)
        `);

      // Get equipment counts by department for this site
      const eqCountResult = await pool.request()
        .input('siteNo', sql.Int, site.SiteNo)
        .query(`
          SELECT 
            COALESCE(p.DEPTNO, 0) as DEPTNO,
            COUNT(e.EQNO) as EquipmentCount
          FROM PU p
          LEFT JOIN EQ e ON p.PUNO = e.PUNO AND e.FLAGDEL = 'F'
          WHERE p.FLAGDEL = 'F' AND p.SiteNo = @siteNo
          GROUP BY p.DEPTNO
        `);

      // Create lookup maps for counts
      const puCountMap = {};
      const eqCountMap = {};
      
      puCountResult.recordset.forEach(row => {
        puCountMap[row.DEPTNO] = row;
      });
      
      eqCountResult.recordset.forEach(row => {
        eqCountMap[row.DEPTNO] = row.EquipmentCount || 0;
      });

      // Check if this site has departments
      if (deptResult.recordset.length > 0) {
        // Site has departments - use department-based hierarchy
        for (const dept of deptResult.recordset) {
          const puCount = puCountMap[dept.DEPTNO]?.ProductionUnitCount || 0;
          const eqCount = eqCountMap[dept.DEPTNO] || 0;

          hierarchyData[site.SiteNo].departments[dept.DEPTNO] = {
            ...dept,
            type: 'department',
            virtual: false,
            stats: {
              productionUnits: puCount,
              equipment: eqCount
            }
          };

          hierarchyData[site.SiteNo].stats.totalDepartments++;
          hierarchyData[site.SiteNo].stats.totalProductionUnits += puCount;
          hierarchyData[site.SiteNo].stats.totalEquipment += eqCount;
        }
      } else {
        // Site has no departments - create virtual departments from PU data
        for (const [deptNo, puData] of Object.entries(puCountMap)) {
          const eqCount = eqCountMap[deptNo] || 0;
          const isVirtual = deptNo == 0 || !puData.DEPTNAME || puData.DEPTNAME === 'General / Unassigned';

          const deptKey = isVirtual ? 'dept_general' : `dept_${deptNo}`;
          
          hierarchyData[site.SiteNo].departments[deptKey] = {
            DEPTNO: parseInt(deptNo),
            DEPTCODE: puData.DEPTCODE,
            DEPTNAME: puData.DEPTNAME,
            type: 'department',
            virtual: isVirtual,
            stats: {
              productionUnits: puData.ProductionUnitCount,
              equipment: eqCount
            }
          };

          hierarchyData[site.SiteNo].stats.totalDepartments++;
          hierarchyData[site.SiteNo].stats.totalProductionUnits += puData.ProductionUnitCount;
          hierarchyData[site.SiteNo].stats.totalEquipment += eqCount;
        }
      }
    }

    res.json({
      success: true,
      data: hierarchyData,
      message: 'Hierarchy data with statistics only. Use /hierarchy/details endpoints for full data.',
      endpoints: {
        departmentDetails: '/api/assets/hierarchy/department/:deptNo?siteNo=:siteNo',
        productionUnitDetails: '/api/assets/production-units?deptNo=:deptNo&siteNo=:siteNo',
        equipmentDetails: '/api/assets/equipment?puNo=:puNo'
      }
    });

  } catch (error) {
    console.error('Get asset hierarchy error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

// Get detailed hierarchy data for a specific department (with pagination)
const getDepartmentHierarchyDetails = async (req, res) => {
  try {
    const { deptNo } = req.params;
    const { siteNo, page = 1, limit = 50, includeEquipment = 'true' } = req.query;
    
    const pool = await getConnection();
    const offset = (page - 1) * limit;

    // Get department info
    let deptInfo = {};
    if (deptNo && deptNo !== 'general') {
      const deptResult = await pool.request()
        .input('deptNo', sql.Int, deptNo)
        .input('siteNo', sql.Int, siteNo)
        .query(`
          SELECT DEPTNO, DEPTCODE, DEPTNAME, DEPTPARENT, HIERARCHYNO
          FROM Dept 
          WHERE FLAGDEL = 'F' AND DEPTNO = @deptNo AND SiteNo = @siteNo
        `);
      
      if (deptResult.recordset.length > 0) {
        deptInfo = { ...deptResult.recordset[0], virtual: false };
      }
    } else {
      // Virtual "General" department
      deptInfo = {
        DEPTNO: 0,
        DEPTCODE: 'GENERAL',
        DEPTNAME: 'General / Unassigned',
        virtual: true
      };
    }

    // Get production units for this department with pagination
    const puQuery = deptNo === 'general' || deptNo == 0
      ? `SELECT p.PUNO, p.PUCODE, p.PUNAME, p.PUPARENT, p.HIERARCHYNO,
                pt.PUTYPENAME, ps.PUSTATUSNAME,
                COUNT(*) OVER() as TotalCount
         FROM PU p
         LEFT JOIN PUType pt ON p.PUTYPENO = pt.PUTYPENO
         LEFT JOIN PUStatus ps ON p.PUSTATUSNO = ps.PUSTATUSNO
         WHERE p.FLAGDEL = 'F' AND p.SiteNo = @siteNo 
           AND (p.DEPTNO = 0 OR p.DEPTNO IS NULL)
         ORDER BY p.HIERARCHYNO, p.PUCODE
         OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`
      : `SELECT p.PUNO, p.PUCODE, p.PUNAME, p.PUPARENT, p.HIERARCHYNO,
                pt.PUTYPENAME, ps.PUSTATUSNAME,
                COUNT(*) OVER() as TotalCount
         FROM PU p
         LEFT JOIN PUType pt ON p.PUTYPENO = pt.PUTYPENO
         LEFT JOIN PUStatus ps ON p.PUSTATUSNO = ps.PUSTATUSNO
         WHERE p.FLAGDEL = 'F' AND p.SiteNo = @siteNo AND p.DEPTNO = @deptNo
         ORDER BY p.HIERARCHYNO, p.PUCODE
         OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`;

    const puResult = await pool.request()
      .input('siteNo', sql.Int, siteNo)
      .input('deptNo', sql.Int, deptNo === 'general' ? 0 : deptNo)
      .input('offset', sql.Int, offset)
      .input('limit', sql.Int, parseInt(limit))
      .query(puQuery);

    const totalCount = puResult.recordset.length > 0 ? puResult.recordset[0].TotalCount : 0;
    const productionUnits = {};

    // Process production units
    for (const pu of puResult.recordset) {
      productionUnits[pu.PUNO] = {
        PUNO: pu.PUNO,
        PUCODE: pu.PUCODE,
        PUNAME: pu.PUNAME,
        PUPARENT: pu.PUPARENT,
        HIERARCHYNO: pu.HIERARCHYNO,
        PUTYPENAME: pu.PUTYPENAME,
        PUSTATUSNAME: pu.PUSTATUSNAME,
        type: 'productionUnit',
        equipment: {}
      };
    }

    // Get equipment for these production units if requested
    if (includeEquipment === 'true' && puResult.recordset.length > 0) {
      const puNos = puResult.recordset.map(pu => pu.PUNO);
      
      const eqResult = await pool.request()
        .query(`
          SELECT e.EQNO, e.EQCODE, e.EQNAME, e.EQPARENT, e.HIERARCHYNO, e.PUNO,
                 et.EQTYPENAME, es.EQSTATUSNAME
          FROM EQ e
          LEFT JOIN EQType et ON e.EQTYPENO = et.EQTYPENO
          LEFT JOIN EQStatus es ON e.EQSTATUSNO = es.EQSTATUSNO
          WHERE e.FLAGDEL = 'F' AND e.PUNO IN (${puNos.join(',')})
          ORDER BY e.PUNO, e.HIERARCHYNO, e.EQCODE
        `);

      // Group equipment by production unit
      for (const eq of eqResult.recordset) {
        if (productionUnits[eq.PUNO]) {
          productionUnits[eq.PUNO].equipment[eq.EQNO] = {
            EQNO: eq.EQNO,
            EQCODE: eq.EQCODE,
            EQNAME: eq.EQNAME,
            EQPARENT: eq.EQPARENT,
            HIERARCHYNO: eq.HIERARCHYNO,
            EQTYPENAME: eq.EQTYPENAME,
            EQSTATUSNAME: eq.EQSTATUSNAME,
            type: 'equipment'
          };
        }
      }
    }

    res.json({
      success: true,
      data: {
        department: deptInfo,
        productionUnits: productionUnits
      },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      }
    });

  } catch (error) {
    console.error('Get department hierarchy details error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

// Get production unit details
const getProductionUnitDetails = async (req, res) => {
  try {
    const { puNo } = req.params;
    const pool = await getConnection();

    const result = await pool.request()
      .input('puNo', sql.Int, puNo)
      .query(`
        SELECT 
          p.*,
          pt.PUTYPENAME, pt.PUTYPECODE,
          ps.PUSTATUSNAME, ps.PUSTATUSCODE,
          s.SiteName, s.SiteCode,
          d.DEPTNAME, d.DEPTCODE,
          pg.PUGROUPNAME,
          parent.PUNAME as ParentPUName, parent.PUCODE as ParentPUCode
        FROM PU p
        LEFT JOIN PUType pt ON p.PUTYPENO = pt.PUTYPENO
        LEFT JOIN PUStatus ps ON p.PUSTATUSNO = ps.PUSTATUSNO
        LEFT JOIN Site s ON p.SiteNo = s.SiteNo
        LEFT JOIN Dept d ON p.DEPTNO = d.DEPTNO
        LEFT JOIN PUGroup pg ON p.PUGROUPNO = pg.PUGROUPNO
        LEFT JOIN PU parent ON p.PUPARENT = parent.PUNO
        WHERE p.PUNO = @puNo AND p.FLAGDEL = 'F'
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Production unit not found'
      });
    }

    // Get child production units
    const childrenResult = await pool.request()
      .input('parentNo', sql.Int, puNo)
      .query(`
        SELECT PUNO, PUCODE, PUNAME, PUTYPENO, PUSTATUSNO
        FROM PU
        WHERE PUPARENT = @parentNo AND FLAGDEL = 'F'
        ORDER BY PUCODE
      `);

    // Get equipment in this production unit
    const equipmentResult = await pool.request()
      .input('puNo', sql.Int, puNo)
      .query(`
        SELECT 
          e.EQNO, e.EQCODE, e.EQNAME, e.EQSTATUSNO,
          et.EQTYPENAME, es.EQSTATUSNAME
        FROM EQ e
        LEFT JOIN EQType et ON e.EQTYPENO = et.EQTYPENO
        LEFT JOIN EQStatus es ON e.EQSTATUSNO = es.EQSTATUSNO
        WHERE e.PUNO = @puNo AND e.FLAGDEL = 'F'
        ORDER BY e.EQCODE
      `);

    const puDetails = result.recordset[0];
    puDetails.children = childrenResult.recordset;
    puDetails.equipment = equipmentResult.recordset;

    res.json({
      success: true,
      data: puDetails
    });

  } catch (error) {
    console.error('Get production unit details error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

// Get equipment details
const getEquipmentDetails = async (req, res) => {
  try {
    const { eqNo } = req.params;
    const pool = await getConnection();

    const result = await pool.request()
      .input('eqNo', sql.Int, eqNo)
      .query(`
        SELECT 
          e.*,
          p.PUNAME, p.PUCODE,
          et.EQTYPENAME, et.EQTYPECODE,
          es.EQSTATUSNAME, es.EQSTATUSCODE,
          s.SiteName, s.SiteCode,
          d_own.DEPTNAME as OwnerDeptName, d_own.DEPTCODE as OwnerDeptCode,
          d_maint.DEPTNAME as MaintDeptName, d_maint.DEPTCODE as MaintDeptCode,
          b.BUILDINGNAME, f.FLOORNAME,
          parent.EQNAME as ParentEQName, parent.EQCODE as ParentEQCode
        FROM EQ e
        LEFT JOIN PU p ON e.PUNO = p.PUNO
        LEFT JOIN EQType et ON e.EQTYPENO = et.EQTYPENO
        LEFT JOIN EQStatus es ON e.EQSTATUSNO = es.EQSTATUSNO
        LEFT JOIN Site s ON e.SiteNo = s.SiteNo
        LEFT JOIN Dept d_own ON e.DEPT_OWN = d_own.DEPTNO
        LEFT JOIN Dept d_maint ON e.DEPT_MAINT = d_maint.DEPTNO
        LEFT JOIN EQ_Building b ON e.EQBuildingNo = b.BUILDINGNO
        LEFT JOIN EQ_Floor f ON e.EQFloorNo = f.FLOORNO
        LEFT JOIN EQ parent ON e.EQPARENT = parent.EQNO
        WHERE e.EQNO = @eqNo AND e.FLAGDEL = 'F'
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Equipment not found'
      });
    }

    // Get child equipment
    const childrenResult = await pool.request()
      .input('parentNo', sql.Int, eqNo)
      .query(`
        SELECT EQNO, EQCODE, EQNAME, EQTYPENO, EQSTATUSNO
        FROM EQ
        WHERE EQPARENT = @parentNo AND FLAGDEL = 'F'
        ORDER BY EQCODE
      `);

    const eqDetails = result.recordset[0];
    eqDetails.children = childrenResult.recordset;

    res.json({
      success: true,
      data: eqDetails
    });

  } catch (error) {
    console.error('Get equipment details error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

// Get lookup data for dropdowns
const getLookupData = async (req, res) => {
  try {
    const pool = await getConnection();

    // Get all lookup data in parallel
    const [
      puTypesResult,
      puStatusResult,
      eqTypesResult,
      eqStatusResult,
      sitesResult,
      departmentsResult
    ] = await Promise.all([
      pool.request().query("SELECT PUTYPENO, PUTYPECODE, PUTYPENAME FROM PUType WHERE FLAGDEL = 'F' ORDER BY PUTYPENAME"),
      pool.request().query("SELECT PUSTATUSNO, PUSTATUSCODE, PUSTATUSNAME FROM PUStatus WHERE FLAGDEL = 'F' ORDER BY PUSTATUSNAME"),
      pool.request().query("SELECT EQTYPENO, EQTYPECODE, EQTYPENAME FROM EQType WHERE FLAGDEL = 'F' ORDER BY EQTYPENAME"),
      pool.request().query("SELECT EQSTATUSNO, EQSTATUSCODE, EQSTATUSNAME FROM EQStatus WHERE FLAGDEL = 'F' ORDER BY EQSTATUSNAME"),
      pool.request().query("SELECT SiteNo, SiteCode, SiteName FROM Site WHERE FlagDel = 'F' ORDER BY SiteName"),
      pool.request().query("SELECT DEPTNO, DEPTCODE, DEPTNAME, SiteNo FROM Dept WHERE FLAGDEL = 'F' ORDER BY DEPTNAME")
    ]);

    res.json({
      success: true,
      data: {
        puTypes: puTypesResult.recordset,
        puStatuses: puStatusResult.recordset,
        eqTypes: eqTypesResult.recordset,
        eqStatuses: eqStatusResult.recordset,
        sites: sitesResult.recordset,
        departments: departmentsResult.recordset
      }
    });

  } catch (error) {
    console.error('Get lookup data error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

// Get asset statistics
const getAssetStatistics = async (req, res) => {
  try {
    const { siteNo } = req.query;
    const pool = await getConnection();

    let whereClause = "WHERE FLAGDEL = 'F'";
    const request = pool.request();

    if (siteNo) {
      whereClause += " AND SiteNo = @siteNo";
      request.input('siteNo', sql.Int, siteNo);
    }

    const [
      puStatsResult,
      eqStatsResult,
      puStatusStatsResult,
      eqStatusStatsResult
    ] = await Promise.all([
      request.query(`SELECT COUNT(*) as totalPUs FROM PU ${whereClause}`),
      pool.request()
        .input('siteNo', sql.Int, siteNo || null)
        .query(`SELECT COUNT(*) as totalEQs FROM EQ ${whereClause}`),
      pool.request()
        .input('siteNo', sql.Int, siteNo || null)
        .query(`
          SELECT ps.PUSTATUSNAME, COUNT(*) as count
          FROM PU p
          LEFT JOIN PUStatus ps ON p.PUSTATUSNO = ps.PUSTATUSNO
          ${whereClause}
          GROUP BY ps.PUSTATUSNAME
          ORDER BY count DESC
        `),
      pool.request()
        .input('siteNo', sql.Int, siteNo || null)
        .query(`
          SELECT es.EQSTATUSNAME, COUNT(*) as count
          FROM EQ e
          LEFT JOIN EQStatus es ON e.EQSTATUSNO = es.EQSTATUSNO
          ${whereClause}
          GROUP BY es.EQSTATUSNAME
          ORDER BY count DESC
        `)
    ]);

    res.json({
      success: true,
      data: {
        totals: {
          productionUnits: puStatsResult.recordset[0].totalPUs,
          equipment: eqStatsResult.recordset[0].totalEQs
        },
        puByStatus: puStatusStatsResult.recordset,
        eqByStatus: eqStatusStatsResult.recordset
      }
    });

  } catch (error) {
    console.error('Get asset statistics error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

module.exports = {
  getSites,
  getDepartments,
  getProductionUnits,
  getEquipment,
  getAssetHierarchy,
  getDepartmentHierarchyDetails,
  getProductionUnitDetails,
  getEquipmentDetails,
  getLookupData,
  getAssetStatistics
};
