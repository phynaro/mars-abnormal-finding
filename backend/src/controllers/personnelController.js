const sql = require('mssql');

class PersonnelController {
  /**
   * Get all persons with pagination and search
   */
  static async getPersons(req, res) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        search = '', 
        deptNo = '',
        titleNo = '',
        includeDeleted = false 
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      
      let whereClause = includeDeleted ? '' : "WHERE (p.FLAGDEL IS NULL OR p.FLAGDEL != 'Y')";
      const params = [];
      
      // Add search functionality
      if (search) {
        const searchCondition = `(p.PERSONCODE LIKE @search OR p.FIRSTNAME LIKE @search OR p.LASTNAME LIKE @search OR p.PERSON_NAME LIKE @search OR p.EMAIL LIKE @search)`;
        whereClause = whereClause ? `${whereClause} AND ${searchCondition}` : `WHERE ${searchCondition}`;
        params.push({ name: 'search', type: sql.NVarChar, value: `%${search}%` });
      }
      
      // Filter by department
      if (deptNo) {
        const deptCondition = 'p.DEPTNO = @deptNo';
        whereClause = whereClause ? `${whereClause} AND ${deptCondition}` : `WHERE ${deptCondition}`;
        params.push({ name: 'deptNo', type: sql.Int, value: parseInt(deptNo) });
      }
      
      // Filter by title
      if (titleNo) {
        const titleCondition = 'p.TITLENO = @titleNo';
        whereClause = whereClause ? `${whereClause} AND ${titleCondition}` : `WHERE ${titleCondition}`;
        params.push({ name: 'titleNo', type: sql.Int, value: parseInt(titleNo) });
      }

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM Person p
        ${whereClause}
      `;

      const pool = await sql.connect();
      const countRequest = pool.request();
      params.forEach(param => countRequest.input(param.name, param.type, param.value));
      const countResult = await countRequest.query(countQuery);
      const total = countResult.recordset[0].total;

      // Get paginated data with joins
      const dataQuery = `
        SELECT 
          p.*,
          d.DEPTNAME,
          d.DEPTCODE,
          t.TITLENAME,
          t.TITLECODE
        FROM Person p
        LEFT JOIN Dept d ON p.DEPTNO = d.DEPTNO
        LEFT JOIN Title t ON p.TITLENO = t.TITLENO
        ${whereClause}
        ORDER BY p.PERSONNO
        OFFSET @offset ROWS
        FETCH NEXT @limit ROWS ONLY
      `;

      const dataRequest = pool.request();
      params.forEach(param => dataRequest.input(param.name, param.type, param.value));
      dataRequest.input('offset', sql.Int, offset);
      dataRequest.input('limit', sql.Int, parseInt(limit));
      
      const dataResult = await dataRequest.query(dataQuery);

      res.json({
        success: true,
        data: dataResult.recordset,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      });
    } catch (error) {
      console.error('Error fetching persons:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching persons',
        error: error.message
      });
    }
  }

  /**
   * Get person by ID
   */
  static async getPersonById(req, res) {
    try {
      const { id } = req.params;
      
      const query = `
        SELECT 
          p.*,
          d.DEPTNAME,
          d.DEPTCODE,
          t.TITLENAME,
          t.TITLECODE
        FROM Person p
        LEFT JOIN Dept d ON p.DEPTNO = d.DEPTNO
        LEFT JOIN Title t ON p.TITLENO = t.TITLENO
        WHERE p.PERSONNO = @personNo
      `;

      const pool = await sql.connect();
      const request = pool.request();
      request.input('personNo', sql.Int, parseInt(id));
      
      const result = await request.query(query);

      if (result.recordset.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Person not found'
        });
      }

      res.json({
        success: true,
        data: result.recordset[0]
      });
    } catch (error) {
      console.error('Error fetching person by ID:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching person',
        error: error.message
      });
    }
  }

  /**
   * Get departments with pagination and search
   */
  static async getDepartments(req, res) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        search = '', 
        parentDept = '',
        includeDeleted = false 
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      
      let whereClause = includeDeleted ? '' : "WHERE (d.FLAGDEL IS NULL OR d.FLAGDEL != 'Y')";
      const params = [];
      
      // Add search functionality
      if (search) {
        const searchCondition = `(d.DEPTCODE LIKE @search OR d.DEPTNAME LIKE @search)`;
        whereClause = whereClause ? `${whereClause} AND ${searchCondition}` : `WHERE ${searchCondition}`;
        params.push({ name: 'search', type: sql.NVarChar, value: `%${search}%` });
      }
      
      // Filter by parent department
      if (parentDept) {
        const parentCondition = 'd.DEPTPARENT = @parentDept';
        whereClause = whereClause ? `${whereClause} AND ${parentCondition}` : `WHERE ${parentCondition}`;
        params.push({ name: 'parentDept', type: sql.Int, value: parseInt(parentDept) });
      }

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM Dept d
        ${whereClause}
      `;

      const pool = await sql.connect();
      const countRequest = pool.request();
      params.forEach(param => countRequest.input(param.name, param.type, param.value));
      const countResult = await countRequest.query(countQuery);
      const total = countResult.recordset[0].total;

      // Get paginated data with parent department info
      const dataQuery = `
        SELECT 
          d.*,
          pd.DEPTNAME as PARENT_DEPTNAME,
          pd.DEPTCODE as PARENT_DEPTCODE,
          ug.USERGROUPNAME,
          ug.USERGROUPCODE,
          (SELECT COUNT(*) FROM Person p WHERE p.DEPTNO = d.DEPTNO AND (p.FLAGDEL IS NULL OR p.FLAGDEL != 'Y')) as PERSON_COUNT
        FROM Dept d
        LEFT JOIN Dept pd ON d.DEPTPARENT = pd.DEPTNO
        LEFT JOIN USERGROUP ug ON d.UserGroupNo = ug.USERGROUPNO
        ${whereClause}
        ORDER BY d.HIERARCHYNO, d.DEPTNO
        OFFSET @offset ROWS
        FETCH NEXT @limit ROWS ONLY
      `;

      const dataRequest = pool.request();
      params.forEach(param => dataRequest.input(param.name, param.type, param.value));
      dataRequest.input('offset', sql.Int, offset);
      dataRequest.input('limit', sql.Int, parseInt(limit));
      
      const dataResult = await dataRequest.query(dataQuery);

      res.json({
        success: true,
        data: dataResult.recordset,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      });
    } catch (error) {
      console.error('Error fetching departments:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching departments',
        error: error.message
      });
    }
  }

  /**
   * Get department by ID
   */
  static async getDepartmentById(req, res) {
    try {
      const { id } = req.params;
      
      const query = `
        SELECT 
          d.*,
          pd.DEPTNAME as PARENT_DEPTNAME,
          pd.DEPTCODE as PARENT_DEPTCODE,
          ug.USERGROUPNAME,
          ug.USERGROUPCODE,
          (SELECT COUNT(*) FROM Person p WHERE p.DEPTNO = d.DEPTNO AND (p.FLAGDEL IS NULL OR p.FLAGDEL != 'Y')) as PERSON_COUNT
        FROM Dept d
        LEFT JOIN Dept pd ON d.DEPTPARENT = pd.DEPTNO
        LEFT JOIN USERGROUP ug ON d.UserGroupNo = ug.USERGROUPNO
        WHERE d.DEPTNO = @deptNo
      `;

      const pool = await sql.connect();
      const request = pool.request();
      request.input('deptNo', sql.Int, parseInt(id));
      
      const result = await request.query(query);

      if (result.recordset.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Department not found'
        });
      }

      res.json({
        success: true,
        data: result.recordset[0]
      });
    } catch (error) {
      console.error('Error fetching department by ID:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching department',
        error: error.message
      });
    }
  }

  /**
   * Get titles with pagination and search
   */
  static async getTitles(req, res) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        search = '', 
        parentTitle = '',
        includeDeleted = false 
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      
      let whereClause = includeDeleted ? '' : "WHERE (t.FLAGDEL IS NULL OR t.FLAGDEL != 'Y')";
      const params = [];
      
      // Add search functionality
      if (search) {
        const searchCondition = `(t.TITLECODE LIKE @search OR t.TITLENAME LIKE @search)`;
        whereClause = whereClause ? `${whereClause} AND ${searchCondition}` : `WHERE ${searchCondition}`;
        params.push({ name: 'search', type: sql.NVarChar, value: `%${search}%` });
      }
      
      // Filter by parent title
      if (parentTitle) {
        const parentCondition = 't.TITLEPARENT = @parentTitle';
        whereClause = whereClause ? `${whereClause} AND ${parentCondition}` : `WHERE ${parentCondition}`;
        params.push({ name: 'parentTitle', type: sql.Int, value: parseInt(parentTitle) });
      }

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM Title t
        ${whereClause}
      `;

      const pool = await sql.connect();
      const countRequest = pool.request();
      params.forEach(param => countRequest.input(param.name, param.type, param.value));
      const countResult = await countRequest.query(countQuery);
      const total = countResult.recordset[0].total;

      // Get paginated data with parent title info
      const dataQuery = `
        SELECT 
          t.*,
          pt.TITLENAME as PARENT_TITLENAME,
          pt.TITLECODE as PARENT_TITLECODE,
          (SELECT COUNT(*) FROM Person p WHERE p.TITLENO = t.TITLENO AND (p.FLAGDEL IS NULL OR p.FLAGDEL != 'Y')) as PERSON_COUNT
        FROM Title t
        LEFT JOIN Title pt ON t.TITLEPARENT = pt.TITLENO
        ${whereClause}
        ORDER BY t.TITLENO
        OFFSET @offset ROWS
        FETCH NEXT @limit ROWS ONLY
      `;

      const dataRequest = pool.request();
      params.forEach(param => dataRequest.input(param.name, param.type, param.value));
      dataRequest.input('offset', sql.Int, offset);
      dataRequest.input('limit', sql.Int, parseInt(limit));
      
      const dataResult = await dataRequest.query(dataQuery);

      res.json({
        success: true,
        data: dataResult.recordset,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      });
    } catch (error) {
      console.error('Error fetching titles:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching titles',
        error: error.message
      });
    }
  }

  /**
   * Get title by ID
   */
  static async getTitleById(req, res) {
    try {
      const { id } = req.params;
      
      const query = `
        SELECT 
          t.*,
          pt.TITLENAME as PARENT_TITLENAME,
          pt.TITLECODE as PARENT_TITLECODE,
          (SELECT COUNT(*) FROM Person p WHERE p.TITLENO = t.TITLENO AND (p.FLAGDEL IS NULL OR p.FLAGDEL != 'Y')) as PERSON_COUNT
        FROM Title t
        LEFT JOIN Title pt ON t.TITLEPARENT = pt.TITLENO
        WHERE t.TITLENO = @titleNo
      `;

      const pool = await sql.connect();
      const request = pool.request();
      request.input('titleNo', sql.Int, parseInt(id));
      
      const result = await request.query(query);

      if (result.recordset.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Title not found'
        });
      }

      res.json({
        success: true,
        data: result.recordset[0]
      });
    } catch (error) {
      console.error('Error fetching title by ID:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching title',
        error: error.message
      });
    }
  }

  /**
   * Get user groups with pagination and search
   */
  static async getUserGroups(req, res) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        search = '' 
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      
      let whereClause = '';
      const params = [];
      
      // Add search functionality
      if (search) {
        whereClause = `WHERE (ug.USERGROUPCODE LIKE @search OR ug.USERGROUPNAME LIKE @search)`;
        params.push({ name: 'search', type: sql.NVarChar, value: `%${search}%` });
      }

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM USERGROUP ug
        ${whereClause}
      `;

      const pool = await sql.connect();
      const countRequest = pool.request();
      params.forEach(param => countRequest.input(param.name, param.type, param.value));
      const countResult = await countRequest.query(countQuery);
      const total = countResult.recordset[0].total;

      // Get paginated data with member count
      const dataQuery = `
        SELECT 
          ug.*,
          (SELECT COUNT(*) FROM USERGROUP_MEMBER ugm WHERE ugm.USERGROUPNO = ug.USERGROUPNO) as MEMBER_COUNT,
          (SELECT COUNT(*) FROM Dept d WHERE d.UserGroupNo = ug.USERGROUPNO) as DEPT_COUNT
        FROM USERGROUP ug
        ${whereClause}
        ORDER BY ug.USERGROUPNO
        OFFSET @offset ROWS
        FETCH NEXT @limit ROWS ONLY
      `;

      const dataRequest = pool.request();
      params.forEach(param => dataRequest.input(param.name, param.type, param.value));
      dataRequest.input('offset', sql.Int, offset);
      dataRequest.input('limit', sql.Int, parseInt(limit));
      
      const dataResult = await dataRequest.query(dataQuery);

      res.json({
        success: true,
        data: dataResult.recordset,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      });
    } catch (error) {
      console.error('Error fetching user groups:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching user groups',
        error: error.message
      });
    }
  }

  /**
   * Get user group by ID
   */
  static async getUserGroupById(req, res) {
    try {
      const { id } = req.params;
      
      const query = `
        SELECT 
          ug.*,
          (SELECT COUNT(*) FROM USERGROUP_MEMBER ugm WHERE ugm.USERGROUPNO = ug.USERGROUPNO) as MEMBER_COUNT,
          (SELECT COUNT(*) FROM Dept d WHERE d.UserGroupNo = ug.USERGROUPNO) as DEPT_COUNT
        FROM USERGROUP ug
        WHERE ug.USERGROUPNO = @userGroupNo
      `;

      const pool = await sql.connect();
      const request = pool.request();
      request.input('userGroupNo', sql.Int, parseInt(id));
      
      const result = await request.query(query);

      if (result.recordset.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User group not found'
        });
      }

      res.json({
        success: true,
        data: result.recordset[0]
      });
    } catch (error) {
      console.error('Error fetching user group by ID:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching user group',
        error: error.message
      });
    }
  }

  /**
   * Get user group members with details
   */
  static async getUserGroupMembers(req, res) {
    try {
      const { id } = req.params;
      const { page = 1, limit = 10 } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM USERGROUP_MEMBER ugm
        INNER JOIN Person p ON ugm.PERSON = p.PERSONNO
        WHERE ugm.USERGROUPNO = @userGroupNo
        AND (p.FLAGDEL IS NULL OR p.FLAGDEL != 'Y')
      `;

      const pool = await sql.connect();
      const countRequest = pool.request();
      countRequest.input('userGroupNo', sql.Int, parseInt(id));
      const countResult = await countRequest.query(countQuery);
      const total = countResult.recordset[0].total;

      // Get paginated member data
      const dataQuery = `
        SELECT 
          ugm.*,
          p.PERSONCODE,
          p.FIRSTNAME,
          p.LASTNAME,
          p.PERSON_NAME,
          p.EMAIL,
          p.PHONE,
          d.DEPTNAME,
          d.DEPTCODE,
          t.TITLENAME,
          t.TITLECODE
        FROM USERGROUP_MEMBER ugm
        INNER JOIN Person p ON ugm.PERSON = p.PERSONNO
        LEFT JOIN Dept d ON p.DEPTNO = d.DEPTNO
        LEFT JOIN Title t ON p.TITLENO = t.TITLENO
        WHERE ugm.USERGROUPNO = @userGroupNo
        AND (p.FLAGDEL IS NULL OR p.FLAGDEL != 'Y')
        ORDER BY p.PERSON_NAME
        OFFSET @offset ROWS
        FETCH NEXT @limit ROWS ONLY
      `;

      const dataRequest = pool.request();
      dataRequest.input('userGroupNo', sql.Int, parseInt(id));
      dataRequest.input('offset', sql.Int, offset);
      dataRequest.input('limit', sql.Int, parseInt(limit));
      
      const dataResult = await dataRequest.query(dataQuery);

      res.json({
        success: true,
        data: dataResult.recordset,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      });
    } catch (error) {
      console.error('Error fetching user group members:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching user group members',
        error: error.message
      });
    }
  }

  /**
   * Get person's user groups
   */
  static async getPersonUserGroups(req, res) {
    try {
      const { id } = req.params;
      
      const query = `
        SELECT 
          ug.*,
          ugm.PERSON
        FROM USERGROUP_MEMBER ugm
        INNER JOIN USERGROUP ug ON ugm.USERGROUPNO = ug.USERGROUPNO
        WHERE ugm.PERSON = @personNo
        ORDER BY ug.USERGROUPNAME
      `;

      const pool = await sql.connect();
      const request = pool.request();
      request.input('personNo', sql.Int, parseInt(id));
      
      const result = await request.query(query);

      res.json({
        success: true,
        data: result.recordset
      });
    } catch (error) {
      console.error('Error fetching person user groups:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching person user groups',
        error: error.message
      });
    }
  }

  /**
   * Get department hierarchy
   */
  static async getDepartmentHierarchy(req, res) {
    try {
      const query = `
        WITH DeptHierarchy AS (
          -- Root departments
          SELECT 
            DEPTNO,
            DEPTCODE,
            DEPTNAME,
            DEPTPARENT,
            CURR_LEVEL,
            HIERARCHYNO,
            CAST(DEPTNAME AS NVARCHAR(MAX)) as PATH,
            0 as LEVEL
          FROM Dept 
          WHERE DEPTPARENT = 0 AND (FLAGDEL IS NULL OR FLAGDEL != 'Y')
          
          UNION ALL
          
          -- Child departments
          SELECT 
            d.DEPTNO,
            d.DEPTCODE,
            d.DEPTNAME,
            d.DEPTPARENT,
            d.CURR_LEVEL,
            d.HIERARCHYNO,
            CAST(dh.PATH + ' > ' + d.DEPTNAME AS NVARCHAR(MAX)),
            dh.LEVEL + 1
          FROM Dept d
          INNER JOIN DeptHierarchy dh ON d.DEPTPARENT = dh.DEPTNO
          WHERE (d.FLAGDEL IS NULL OR d.FLAGDEL != 'Y')
        )
        SELECT 
          *,
          (SELECT COUNT(*) FROM Person p WHERE p.DEPTNO = DeptHierarchy.DEPTNO AND (p.FLAGDEL IS NULL OR p.FLAGDEL != 'Y')) as PERSON_COUNT
        FROM DeptHierarchy
        ORDER BY HIERARCHYNO
      `;

      const pool = await sql.connect();
      const result = await pool.request().query(query);

      res.json({
        success: true,
        data: result.recordset
      });
    } catch (error) {
      console.error('Error fetching department hierarchy:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching department hierarchy',
        error: error.message
      });
    }
  }

  /**
   * Get organization statistics
   */
  static async getOrganizationStats(req, res) {
    try {
      const query = `
        SELECT 
          (SELECT COUNT(*) FROM Person WHERE FLAGDEL IS NULL OR FLAGDEL != 'Y') as TOTAL_PERSONS,
          (SELECT COUNT(*) FROM Dept WHERE FLAGDEL IS NULL OR FLAGDEL != 'Y') as TOTAL_DEPARTMENTS,
          (SELECT COUNT(*) FROM Title WHERE FLAGDEL IS NULL OR FLAGDEL != 'Y') as TOTAL_TITLES,
          (SELECT COUNT(*) FROM USERGROUP) as TOTAL_USERGROUPS,
          (SELECT COUNT(*) FROM USERGROUP_MEMBER ugm 
           INNER JOIN Person p ON ugm.PERSON = p.PERSONNO 
           WHERE p.FLAGDEL IS NULL OR p.FLAGDEL != 'Y') as TOTAL_GROUP_MEMBERSHIPS,
          (SELECT COUNT(*) FROM Person WHERE EMAIL IS NOT NULL AND EMAIL != '' AND (FLAGDEL IS NULL OR FLAGDEL != 'Y')) as PERSONS_WITH_EMAIL,
          (SELECT COUNT(*) FROM Person WHERE PHONE IS NOT NULL AND PHONE != '' AND (FLAGDEL IS NULL OR FLAGDEL != 'Y')) as PERSONS_WITH_PHONE
      `;

      const pool = await sql.connect();
      const result = await pool.request().query(query);

      res.json({
        success: true,
        data: result.recordset[0]
      });
    } catch (error) {
      console.error('Error fetching organization stats:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching organization statistics',
        error: error.message
      });
    }
  }
}

module.exports = PersonnelController;
