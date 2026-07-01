const crypto = require('crypto');
const sql = require('mssql');
const dbConfig = require('../config/dbConfig');

const API_TOKEN_PREFIX = 'eden_sk_';

async function getConnection() {
  try {
    return await sql.connect(dbConfig);
  } catch (err) {
    console.error('Database connection error:', err);
    throw new Error('Database connection failed');
  }
}

function hashApiToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// Generate a new opaque token. The plaintext is returned to the caller ONCE
// and never stored; only its SHA-256 hash is persisted.
function generateApiToken() {
  const secret = crypto.randomBytes(24).toString('hex'); // 48 hex chars
  const token = `${API_TOKEN_PREFIX}${secret}`;
  return {
    token,
    tokenHash: hashApiToken(token),
    tokenPrefix: token.slice(0, 16), // e.g. eden_sk_ab12cd34 (non-secret, for display)
  };
}

// POST /api/api-tokens  { name, expiresAt? }
const createApiToken = async (req, res) => {
  try {
    const { name, expiresAt } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'A token name is required'
      });
    }

    let expiresAtValue = null;
    if (expiresAt) {
      const parsed = new Date(expiresAt);
      if (isNaN(parsed.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'expiresAt must be a valid date'
        });
      }
      expiresAtValue = parsed;
    }

    const { token, tokenHash, tokenPrefix } = generateApiToken();

    const pool = await getConnection();
    const result = await pool.request()
      .input('name', sql.NVarChar(100), name.trim())
      .input('tokenPrefix', sql.NVarChar(24), tokenPrefix)
      .input('tokenHash', sql.NVarChar(128), tokenHash)
      .input('scope', sql.NVarChar(30), 'readonly')
      .input('createdBy', sql.NVarChar(50), req.user?.userId || null)
      .input('expiresAt', sql.DateTime, expiresAtValue)
      .query(`
        INSERT INTO IgxApiTokens (name, token_prefix, token_hash, scope, created_by, expires_at, is_active)
        OUTPUT INSERTED.id, INSERTED.name, INSERTED.token_prefix, INSERTED.scope,
               INSERTED.created_by, INSERTED.created_at, INSERTED.expires_at, INSERTED.is_active
        VALUES (@name, @tokenPrefix, @tokenHash, @scope, @createdBy, @expiresAt, 1)
      `);

    const row = result.recordset[0];

    return res.status(201).json({
      success: true,
      message: 'API token created. Copy it now — it will not be shown again.',
      data: {
        id: row.id,
        name: row.name,
        tokenPrefix: row.token_prefix,
        scope: row.scope,
        createdBy: row.created_by,
        createdAt: row.created_at,
        expiresAt: row.expires_at,
        isActive: row.is_active,
        token, // plaintext — shown only on creation
      }
    });
  } catch (error) {
    console.error('Create API token error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create API token'
    });
  }
};

// GET /api/api-tokens
const listApiTokens = async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query(`
      SELECT id, name, token_prefix, scope, created_by, created_at,
             last_used_at, expires_at, is_active, revoked_at
      FROM IgxApiTokens
      ORDER BY created_at DESC
    `);

    const data = result.recordset.map((row) => ({
      id: row.id,
      name: row.name,
      tokenPrefix: row.token_prefix,
      scope: row.scope,
      createdBy: row.created_by,
      createdAt: row.created_at,
      lastUsedAt: row.last_used_at,
      expiresAt: row.expires_at,
      isActive: row.is_active,
      revokedAt: row.revoked_at,
    }));

    return res.json({ success: true, data, message: 'API tokens retrieved' });
  } catch (error) {
    console.error('List API tokens error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to list API tokens'
    });
  }
};

// DELETE /api/api-tokens/:id  (revoke — soft delete)
const revokeApiToken = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || isNaN(Number(id))) {
      return res.status(400).json({ success: false, message: 'Valid token id is required' });
    }

    const pool = await getConnection();
    const result = await pool.request()
      .input('id', sql.Int, Number(id))
      .query(`
        UPDATE IgxApiTokens
        SET is_active = 0, revoked_at = GETDATE()
        WHERE id = @id AND is_active = 1;
        SELECT @@ROWCOUNT AS affected;
      `);

    const affected = result.recordset[0]?.affected || 0;
    if (affected === 0) {
      return res.status(404).json({
        success: false,
        message: 'API token not found or already revoked'
      });
    }

    return res.json({ success: true, message: 'API token revoked' });
  } catch (error) {
    console.error('Revoke API token error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to revoke API token'
    });
  }
};

module.exports = {
  createApiToken,
  listApiTokens,
  revokeApiToken,
};
