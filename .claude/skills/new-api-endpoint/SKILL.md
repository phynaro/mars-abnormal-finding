---
name: new-api-endpoint
description: Scaffold a new Express route and controller function following this project's mssql + try/catch pattern
---

Add a new API endpoint to the mars-abnormal-finding backend.

## Usage
Arguments: `<resource> <HTTP_METHOD> <path> [description]`

- `resource` — existing resource name matching `routes/<resource>.js` and `controllers/<resource>Controller.js`
- `HTTP_METHOD` — GET, POST, PUT, DELETE, PATCH
- `path` — route path, e.g. `/` or `/:id/status`
- `description` — what the endpoint does (used in Swagger JSDoc)

## Steps

1. **Add the controller function** to `backend/src/controllers/<resource>Controller.js`
2. **Add the route** to `backend/src/routes/<resource>.js`

## Controller function pattern

```js
const getThings = async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request()
      .input('param', sql.NVarChar, req.query.param)
      .query(`SELECT ... FROM ... WHERE ...`);

    return res.json({
      success: true,
      data: result.recordset,
      message: 'Retrieved successfully'
    });
  } catch (err) {
    console.error('getThings error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve things'
    });
  }
};
```

## Route pattern (with Swagger JSDoc)

```js
/**
 * @swagger
 * /api/<resource><path>:
 *   <method>:
 *     summary: <description>
 *     tags: [<Resource>]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: param
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Success
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.<method>('<path>', <resource>Controller.<functionName>);
```

## Rules
- **Always use parameterized queries** — `.input('name', sql.Type, value)` — never string interpolation in SQL
- **Always** `await sql.connect(dbConfig)` at the top of each function (no shared pool assumption)
- Response shape must always be `{ success: boolean, data?: any, message: string }`
- Auth is applied to the entire router with `router.use(authenticateToken)` — don't add it per-route unless you need a different permission level
- Use `requirePermissionLevel(n)` as route middleware for level-gated endpoints: `router.post('/', requirePermissionLevel(2), controller.fn)`
- Use `req.user.id` (not `req.body.userId`) for the authenticated user's ID
- Export the new function in the controller's `module.exports` object

## Files to know
- `backend/src/config/dbConfig.js` — DB connection config
- `backend/src/middleware/auth.js` — `authenticateToken`, `requirePermissionLevel`, `requireFormPermission`
- `backend/src/app.js` — where routes are mounted (to confirm the base path)
