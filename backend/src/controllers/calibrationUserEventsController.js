const sql = require('mssql');
const dbConfigNew = require('../config/dbConfigNew');
const {
  USER_EVENT_CATEGORIES,
  normalizeCategory,
  validateUserEventPayload,
  normalizedUserEventInput,
  bindUserEventWriteInputs,
  buildUserEventScopeFilters,
} = require('../helpers/calibrationUserEventsQuery');
const { PM_CAL_PLANTS } = require('../helpers/pmCalibrationScheduleQuery');

function categoryLabel(category) {
  const normalized = normalizeCategory(category);
  if (!normalized) return '';
  return normalized
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function baseSelectSql() {
  return `
    SELECT
      e.id,
      e.title,
      e.description,
      e.category,
      e.start_at,
      e.end_at,
      e.is_all_day,
      e.plant_code,
      e.dept_no,
      d.DEPTCODE AS dept_code,
      d.DEPTNAME AS dept_name,
      e.assignee_id,
      ISNULL(assignee.FIRSTNAME,'') + ' ' + ISNULL(assignee.LASTNAME,'') AS assignee_name,
      e.color_hex,
      e.is_active,
      e.created_by,
      ISNULL(creator.FIRSTNAME,'') + ' ' + ISNULL(creator.LASTNAME,'') AS created_by_name,
      e.created_at,
      e.updated_by,
      ISNULL(updater.FIRSTNAME,'') + ' ' + ISNULL(updater.LASTNAME,'') AS updated_by_name,
      e.updated_at,
      e.deleted_by,
      e.deleted_at
    FROM dbo.IgxCalibrationUserEvents e
    LEFT JOIN dbo.Dept d ON d.DEPTNO = e.dept_no
    LEFT JOIN dbo.Person assignee ON assignee.PERSONNO = e.assignee_id
    LEFT JOIN dbo.Person creator ON creator.PERSONNO = e.created_by
    LEFT JOIN dbo.Person updater ON updater.PERSONNO = e.updated_by
  `;
}

function enrichEventRow(row) {
  if (!row) return row;
  const plant = PM_CAL_PLANTS.find((p) => p.code === row.plant_code);
  return {
    ...row,
    categoryLabel: categoryLabel(row.category),
    plant_label: plant?.label || null,
  };
}

async function getEventById(pool, id) {
  const request = pool.request();
  request.input('Id', sql.Int, id);
  const result = await request.query(`
    ${baseSelectSql()}
    WHERE e.id = @Id AND e.deleted_at IS NULL
  `);
  return enrichEventRow(result.recordset?.[0] || null);
}

exports.getCalibrationUserEvents = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const startRow = (page - 1) * limit + 1;
    const endRow = (page - 1) * limit + limit;

    const pool = await sql.connect(dbConfigNew);

    const countReq = pool.request();
    const whereParts = buildUserEventScopeFilters(countReq, req.query);
    const countResult = await countReq.query(`
      SELECT COUNT(*) AS total
      FROM dbo.IgxCalibrationUserEvents e
      WHERE ${whereParts.join(' AND ')}
    `);
    const total = countResult.recordset?.[0]?.total || 0;

    const dataReq = pool.request();
    const dataWhereParts = buildUserEventScopeFilters(dataReq, req.query);
    dataReq.input('StartRow', sql.Int, startRow);
    dataReq.input('EndRow', sql.Int, endRow);
    const result = await dataReq.query(`
      SELECT *
      FROM (
        SELECT
          e.id,
          e.title,
          e.description,
          e.category,
          e.start_at,
          e.end_at,
          e.is_all_day,
          e.plant_code,
          e.dept_no,
          d.DEPTCODE AS dept_code,
          d.DEPTNAME AS dept_name,
          e.assignee_id,
          ISNULL(assignee.FIRSTNAME,'') + ' ' + ISNULL(assignee.LASTNAME,'') AS assignee_name,
          e.color_hex,
          e.is_active,
          e.created_by,
          ISNULL(creator.FIRSTNAME,'') + ' ' + ISNULL(creator.LASTNAME,'') AS created_by_name,
          e.created_at,
          e.updated_by,
          ISNULL(updater.FIRSTNAME,'') + ' ' + ISNULL(updater.LASTNAME,'') AS updated_by_name,
          e.updated_at,
          e.deleted_by,
          e.deleted_at,
          ROW_NUMBER() OVER (ORDER BY e.start_at DESC, e.id DESC) AS RowNum
        FROM dbo.IgxCalibrationUserEvents e
        LEFT JOIN dbo.Dept d ON d.DEPTNO = e.dept_no
        LEFT JOIN dbo.Person assignee ON assignee.PERSONNO = e.assignee_id
        LEFT JOIN dbo.Person creator ON creator.PERSONNO = e.created_by
        LEFT JOIN dbo.Person updater ON updater.PERSONNO = e.updated_by
        WHERE ${dataWhereParts.join(' AND ')}
      ) AS Ordered
      WHERE RowNum >= @StartRow AND RowNum <= @EndRow
    `);

    res.json({
      success: true,
      data: {
        items: (result.recordset || []).map(enrichEventRow),
        categories: USER_EVENT_CATEGORIES.map((category) => ({
          value: category,
          label: categoryLabel(category),
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
      },
    });
  } catch (error) {
    console.error('Error in getCalibrationUserEvents:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch calibration user events',
      error: error.message,
    });
  }
};

exports.getCalibrationUserEventsCalendarRange = async (req, res) => {
  try {
    const { viewStartDate, viewEndDate } = req.query;
    if (!viewStartDate || !viewEndDate) {
      return res.status(400).json({
        success: false,
        message: 'viewStartDate and viewEndDate are required',
      });
    }

    const pool = await sql.connect(dbConfigNew);
    const request = pool.request();
    request.input('ViewStartDate', sql.DateTime2, viewStartDate);
    request.input('ViewEndDate', sql.DateTime2, viewEndDate);
    request.input('OnlyActive', sql.Bit, true);
    const whereParts = buildUserEventScopeFilters(request, {
      ...req.query,
      isActive: 'true',
    });
    whereParts.push('e.start_at <= @ViewEndDate');
    whereParts.push('e.end_at >= @ViewStartDate');

    const result = await request.query(`
      ${baseSelectSql()}
      WHERE ${whereParts.join(' AND ')}
      ORDER BY e.start_at ASC, e.id ASC
    `);

    res.json({
      success: true,
      data: {
        items: (result.recordset || []).map(enrichEventRow),
        rangeStart: viewStartDate,
        rangeEnd: viewEndDate,
        count: result.recordset?.length || 0,
      },
    });
  } catch (error) {
    console.error('Error in getCalibrationUserEventsCalendarRange:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch calibration user events for calendar range',
      error: error.message,
    });
  }
};

exports.getCalibrationUserEventById = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id) || id <= 0) {
      return res.status(400).json({ success: false, message: 'Valid event id is required' });
    }
    const pool = await sql.connect(dbConfigNew);
    const item = await getEventById(pool, id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Calibration user event not found' });
    }
    res.json({ success: true, data: item });
  } catch (error) {
    console.error('Error in getCalibrationUserEventById:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch calibration user event detail',
      error: error.message,
    });
  }
};

exports.createCalibrationUserEvent = async (req, res) => {
  try {
    const errors = validateUserEventPayload(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join('; ') });
    }

    const pool = await sql.connect(dbConfigNew);
    const request = pool.request();
    const payload = normalizedUserEventInput(req.body, req.user.id, { includeCreateMeta: true });
    bindUserEventWriteInputs(request, payload, { includeCreateMeta: true });

    const result = await request.query(`
      INSERT INTO dbo.IgxCalibrationUserEvents (
        title,
        description,
        category,
        start_at,
        end_at,
        is_all_day,
        plant_code,
        dept_no,
        assignee_id,
        color_hex,
        is_active,
        created_by,
        updated_by,
        updated_at
      )
      OUTPUT INSERTED.id
      VALUES (
        @Title,
        @Description,
        @Category,
        @StartAt,
        @EndAt,
        @IsAllDay,
        @PlantCode,
        @DeptNo,
        @AssigneeId,
        @ColorHex,
        @IsActive,
        @CreatedBy,
        @UpdatedBy,
        SYSDATETIME()
      )
    `);

    const id = result.recordset?.[0]?.id;
    const item = await getEventById(pool, id);
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    console.error('Error in createCalibrationUserEvent:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create calibration user event',
      error: error.message,
    });
  }
};

exports.updateCalibrationUserEvent = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id) || id <= 0) {
      return res.status(400).json({ success: false, message: 'Valid event id is required' });
    }

    const errors = validateUserEventPayload(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join('; ') });
    }

    const pool = await sql.connect(dbConfigNew);
    const existing = await getEventById(pool, id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Calibration user event not found' });
    }

    const request = pool.request();
    const payload = normalizedUserEventInput(req.body, req.user.id);
    bindUserEventWriteInputs(request, payload);
    request.input('Id', sql.Int, id);

    await request.query(`
      UPDATE dbo.IgxCalibrationUserEvents
      SET
        title = @Title,
        description = @Description,
        category = @Category,
        start_at = @StartAt,
        end_at = @EndAt,
        is_all_day = @IsAllDay,
        plant_code = @PlantCode,
        dept_no = @DeptNo,
        assignee_id = @AssigneeId,
        color_hex = @ColorHex,
        is_active = @IsActive,
        updated_by = @UpdatedBy,
        updated_at = SYSDATETIME()
      WHERE id = @Id AND deleted_at IS NULL
    `);

    const item = await getEventById(pool, id);
    res.json({ success: true, data: item });
  } catch (error) {
    console.error('Error in updateCalibrationUserEvent:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update calibration user event',
      error: error.message,
    });
  }
};

exports.deleteCalibrationUserEvent = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id) || id <= 0) {
      return res.status(400).json({ success: false, message: 'Valid event id is required' });
    }

    const pool = await sql.connect(dbConfigNew);
    const existing = await getEventById(pool, id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Calibration user event not found' });
    }

    const request = pool.request();
    request.input('Id', sql.Int, id);
    request.input('DeletedBy', sql.Int, req.user.id);
    await request.query(`
      UPDATE dbo.IgxCalibrationUserEvents
      SET
        is_active = 0,
        deleted_by = @DeletedBy,
        deleted_at = SYSDATETIME(),
        updated_by = @DeletedBy,
        updated_at = SYSDATETIME()
      WHERE id = @Id AND deleted_at IS NULL
    `);

    res.json({ success: true, data: { id } });
  } catch (error) {
    console.error('Error in deleteCalibrationUserEvent:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete calibration user event',
      error: error.message,
    });
  }
};
