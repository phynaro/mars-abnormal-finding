// =====================================================
// HIERARCHICAL API ENDPOINTS FOR TICKET FORM
// =====================================================

const sql = require('mssql');
const dbConfig = require('../config/dbConfig');

// Get all active plants
const getPlants = async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        
        const result = await pool.request().query(`
            SELECT 
                id,
                name,
                code,
                description,
                is_active
            FROM Plant 
            WHERE is_active = 1
            ORDER BY name
        `);

        res.json({
            success: true,
            data: result.recordset
        });

    } catch (error) {
        console.error('Error fetching plants:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch plants',
            error: error.message
        });
    }
};

// Get all active areas
const getAllAreas = async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        
        const result = await pool.request().query(`
            SELECT 
                a.id,
                a.name,
                a.code,
                a.description,
                a.plant_id,
                a.is_active,
                p.name as plant_name,
                p.code as plant_code
            FROM Area a
            LEFT JOIN Plant p ON a.plant_id = p.id
            WHERE a.is_active = 1
            ORDER BY p.name, a.name
        `);

        res.json({
            success: true,
            data: result.recordset
        });

    } catch (error) {
        console.error('Error fetching all areas:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch areas',
            error: error.message
        });
    }
};

// Get areas by plant ID
const getAreasByPlant = async (req, res) => {
    try {
        const { plantId } = req.params;
        
        if (!plantId) {
            return res.status(400).json({
                success: false,
                message: 'Plant ID is required'
            });
        }

        const pool = await sql.connect(dbConfig);
        
        const result = await pool.request()
            .input('plantId', sql.Int, plantId)
            .query(`
                SELECT 
                    id,
                    name,
                    code,
                    description,
                    plant_id,
                    is_active
                FROM Area 
                WHERE plant_id = @plantId AND is_active = 1
                ORDER BY name
            `);

        res.json({
            success: true,
            data: result.recordset
        });

    } catch (error) {
        console.error('Error fetching areas:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch areas',
            error: error.message
        });
    }
};

// Get lines by area ID
const getLinesByArea = async (req, res) => {
    try {
        const { areaId } = req.params;
        
        if (!areaId) {
            return res.status(400).json({
                success: false,
                message: 'Area ID is required'
            });
        }

        const pool = await sql.connect(dbConfig);
        
        const result = await pool.request()
            .input('areaId', sql.Int, areaId)
            .query(`
                SELECT 
                    id,
                    name,
                    code,
                    description,
                    area_id,
                    is_active
                FROM Line 
                WHERE area_id = @areaId AND is_active = 1
                ORDER BY name
            `);

        res.json({
            success: true,
            data: result.recordset
        });

    } catch (error) {
        console.error('Error fetching lines:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch lines',
            error: error.message
        });
    }
};

// Get machines by line ID
const getMachinesByLine = async (req, res) => {
    try {
        const { lineId } = req.params;
        
        if (!lineId) {
            return res.status(400).json({
                success: false,
                message: 'Line ID is required'
            });
        }

        const pool = await sql.connect(dbConfig);
        
        const result = await pool.request()
            .input('lineId', sql.Int, lineId)
            .query(`
                SELECT 
                    id,
                    name,
                    code,
                    description,
                    line_id,
                    machine_number,
                    is_active
                FROM Machine 
                WHERE line_id = @lineId AND is_active = 1
                ORDER BY machine_number, name
            `);

        res.json({
            success: true,
            data: result.recordset
        });

    } catch (error) {
        console.error('Error fetching machines:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch machines',
            error: error.message
        });
    }
};

// Search PUCODE from PU table
const searchPUCODE = async (req, res) => {
    try {
        const { search } = req.query;
        
        if (!search || search.trim().length < 2) {
            return res.status(400).json({
                success: false,
                message: 'Search term must be at least 2 characters'
            });
        }

        const pool = await sql.connect(dbConfig);
        
        const result = await pool.request()
            .input('search', sql.NVarChar, `%${search}%`)
            .query(`
                SELECT TOP 20
                    PUCODE,
                    PUNAME as PUDESC,
                    PUNO,
                    PULOCATION,
                    PUTYPENO,
                    PUSTATUSNO,
                    DEPTNO,
                    SiteNo,
                    PUCRITICALNO
                FROM PU 
                WHERE (PUCODE LIKE @search OR PUNAME LIKE @search)
                AND FLAGDEL = 'F'
                AND PUCODE LIKE '%-%-%'  -- At least 3-section PUCODEs (minimum Plant-Area-Number)
                ORDER BY PUCODE
            `);

        // Parse PUCODE to extract components for display
        const processedResults = result.recordset.map(row => {
            const pucodeParts = row.PUCODE ? row.PUCODE.split('-') : [];
            return {
                PUCODE: row.PUCODE,
                PUDESC: row.PUDESC || row.PUCODE,
                PUNO: row.PUNO,
                PLANT: pucodeParts[0] || '',
                AREA: pucodeParts[1] || '',
                LINE: pucodeParts[2] || '',
                MACHINE: pucodeParts[3] || '',
                NUMBER: pucodeParts[4] || '',
                PULOCATION: row.PULOCATION,
                PUTYPENO: row.PUTYPENO,
                PUSTATUSNO: row.PUSTATUSNO,
                DEPTNO: row.DEPTNO,
                SiteNo: row.SiteNo,
                PUCRITICALNO: row.PUCRITICALNO
            };
        });

        res.json({
            success: true,
            data: processedResults
        });

    } catch (error) {
        console.error('Error searching PUCODE:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to search PUCODE',
            error: error.message
        });
    }
};

// Get PUCODE details by PUCODE
const getPUCODEDetails = async (req, res) => {
    try {
        const { pucode } = req.params;
        
        if (!pucode) {
            return res.status(400).json({
                success: false,
                message: 'PUCODE is required'
            });
        }

        const pool = await sql.connect(dbConfig);
        
        const result = await pool.request()
            .input('pucode', sql.VarChar, pucode)
            .query(`
                SELECT 
                    PUCODE,
                    PUNAME as PUDESC,
                    PUNO,
                    PULOCATION,
                    PUTYPENO,
                    PUSTATUSNO,
                    DEPTNO,
                    SiteNo
                FROM PU 
                WHERE PUCODE = @pucode
                AND FLAGDEL = 'F'
                AND PUCODE LIKE '%-%-%'  -- At least 3-section PUCODEs (minimum Plant-Area-Number)
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'PUCODE not found'
            });
        }

        const puData = result.recordset[0];
        
        // Parse PUCODE to extract components
        const pucodeParts = puData.PUCODE ? puData.PUCODE.split('-') : [];
        const processedPuData = {
            PUCODE: puData.PUCODE,
            PUDESC: puData.PUDESC || puData.PUCODE,
            PUNO: puData.PUNO,
            PLANT: pucodeParts[0] || '',
            AREA: pucodeParts[1] || '',
            LINE: pucodeParts[2] || '',
            MACHINE: pucodeParts[3] || '',
            NUMBER: pucodeParts[4] || '',
            PULOCATION: puData.PULOCATION,
            PUTYPENO: puData.PUTYPENO,
            PUSTATUSNO: puData.PUSTATUSNO,
            DEPTNO: puData.DEPTNO,
            SiteNo: puData.SiteNo
        };
        
        // Try to find matching hierarchy IDs if we have all components
        let hierarchyData = null;
        if (pucodeParts.length >= 5) {
            try {
                const hierarchyResult = await pool.request()
                    .input('plantCode', sql.VarChar, pucodeParts[0])
                    .input('areaCode', sql.VarChar, pucodeParts[1])
                    .input('lineCode', sql.VarChar, pucodeParts[2])
                    .input('machineCode', sql.VarChar, pucodeParts[3])
                    .input('machineNumber', sql.VarChar, pucodeParts[4])
                    .query(`
                        SELECT 
                            p.id as plant_id,
                            p.name as plant_name,
                            p.code as plant_code,
                            a.id as area_id,
                            a.name as area_name,
                            a.code as area_code,
                            l.id as line_id,
                            l.name as line_name,
                            l.code as line_code,
                            m.id as machine_id,
                            m.name as machine_name,
                            m.code as machine_code,
                            m.machine_number
                        FROM Plant p
                        INNER JOIN Area a ON p.id = a.plant_id
                        INNER JOIN Line l ON a.id = l.area_id
                        INNER JOIN Machine m ON l.id = m.line_id
                        WHERE p.code = @plantCode
                        AND a.code = @areaCode
                        AND l.code = @lineCode
                        AND m.code = @machineCode
                        AND m.machine_number = @machineNumber
                        AND p.is_active = 1
                        AND a.is_active = 1
                        AND l.is_active = 1
                        AND m.is_active = 1
                    `);
                
                hierarchyData = hierarchyResult.recordset.length > 0 ? hierarchyResult.recordset[0] : null;
            } catch (hierarchyError) {
                console.warn('Could not fetch hierarchy data:', hierarchyError.message);
                // Continue without hierarchy data
            }
        }

        res.json({
            success: true,
            data: {
                pu: processedPuData,
                hierarchy: hierarchyData
            }
        });

    } catch (error) {
        console.error('Error fetching PUCODE details:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch PUCODE details',
            error: error.message
        });
    }
};

// Generate PUCODE from hierarchy selection
const generatePUCODE = async (req, res) => {
    try {
        const { plantId, areaId, lineId, machineId } = req.body;
        
        if (!plantId || !areaId || !lineId || !machineId) {
            return res.status(400).json({
                success: false,
                message: 'All hierarchy IDs are required (plantId, areaId, lineId, machineId)'
            });
        }

        const pool = await sql.connect(dbConfig);
        
        const result = await pool.request()
            .input('plantId', sql.Int, plantId)
            .input('areaId', sql.Int, areaId)
            .input('lineId', sql.Int, lineId)
            .input('machineId', sql.Int, machineId)
            .query(`
                SELECT 
                    CONCAT(p.code, '-', a.code, '-', l.code, '-', m.code, '-', m.machine_number) as pucode,
                    p.name as plant_name,
                    a.name as area_name,
                    l.name as line_name,
                    m.name as machine_name,
                    m.machine_number
                FROM Plant p
                INNER JOIN Area a ON p.id = a.plant_id
                INNER JOIN Line l ON a.id = l.area_id
                INNER JOIN Machine m ON l.id = m.line_id
                WHERE p.id = @plantId
                AND a.id = @areaId
                AND l.id = @lineId
                AND m.id = @machineId
                AND p.is_active = 1
                AND a.is_active = 1
                AND l.is_active = 1
                AND m.is_active = 1
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Invalid hierarchy selection'
            });
        }

        res.json({
            success: true,
            data: result.recordset[0]
        });

    } catch (error) {
        console.error('Error generating PUCODE:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate PUCODE',
            error: error.message
        });
    }
};

// Get distinct plants from PUExtension (for filters)
const getDistinctPlants = async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        
        const result = await pool.request().query(`
            SELECT DISTINCT 
                plant as code,
                pudescription as name
            FROM PUExtension
            WHERE plant IS NOT NULL 
            AND plant != ''
            AND digit_count = 1
            AND area IS NULL
            ORDER BY plant
        `);

        res.json({
            success: true,
            data: result.recordset
        });

    } catch (error) {
        console.error('Error fetching distinct plants:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch distinct plants',
            error: error.message
        });
    }
};

// Get distinct areas from PUExtension (for filters)
const getDistinctAreas = async (req, res) => {
    try {
        const { plant } = req.query;
        const pool = await sql.connect(dbConfig);
        
        let query = `
            SELECT DISTINCT 
                area as code,
                pudescription as name,
                plant
            FROM PUExtension
            WHERE area IS NOT NULL 
            AND area != ''
            AND digit_count = 2
            AND line IS NULL
            AND machine IS NULL
        `;
        
        const request = pool.request();
        if (plant) {
            query += ' AND plant = @plant';
            request.input('plant', sql.VarChar(50), plant);
        }
        
        query += ' ORDER BY area';
        
        const result = await request.query(query);

        res.json({
            success: true,
            data: result.recordset
        });

    } catch (error) {
        console.error('Error fetching distinct areas:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch distinct areas',
            error: error.message
        });
    }
};

// Get PUCritical levels for dropdown
const getPUCriticalLevels = async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().query(`
            SELECT 
                PUCRITICALNO,
                PUCRITICALNAME,
                PUCRITICALCODE
            FROM PUCritical
            WHERE FLAGDEL = 'F' AND PUCRITICALNO >=4
            ORDER BY PUCRITICALNO
        `);
        
        res.json({
            success: true,
            data: result.recordset
        });
    } catch (error) {
        console.error('Get PUCritical levels error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch critical levels',
            error: error.message
        });
    }
};

// Get machines by hierarchy from PUExtension table
const getMachinesByHierarchy = async (req, res) => {
    try {
        const { plant, area, line, machine, number } = req.query;
        
        if (!plant) {
            return res.status(400).json({
                success: false,
                message: 'Plant is required'
            });
        }

        const pool = await sql.connect(dbConfig);
        
        // Determine expected digit count based on provided parameters
        let expectedDigitCount = 1;
        if (plant && area) expectedDigitCount = 2;
        if (plant && area && line) expectedDigitCount = 3;
        if (plant && area && line && machine) expectedDigitCount = 4;
        if (plant && area && line && machine && number) expectedDigitCount = 5;

        const request = pool.request()
            .input('plant', sql.NVarChar(50), plant)
            .input('expectedDigitCount', sql.Int, expectedDigitCount);

        let query = `
            SELECT 
                puno,
                pucode,
                plant,
                area,
                line,
                machine,
                number,
                puname,
                pudescription,
                digit_count
            FROM PUExtension
            WHERE plant = @plant
            AND digit_count = @expectedDigitCount
        `;

        if (area) {
            query += ' AND area = @area';
            request.input('area', sql.NVarChar(50), area);
        }
        if (line) {
            query += ' AND line = @line';
            request.input('line', sql.NVarChar(50), line);
        }
        if (machine) {
            query += ' AND machine = @machine';
            request.input('machine', sql.NVarChar(50), machine);
        }
        if (number) {
            query += ' AND number = @number';
            request.input('number', sql.NVarChar(10), number);
        }

        query += ' ORDER BY pucode';

        const result = await request.query(query);

        res.json({
            success: true,
            data: result.recordset
        });

    } catch (error) {
        console.error('Error fetching machines by hierarchy:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch machines by hierarchy',
            error: error.message
        });
    }
};

// Get distinct plants from PUExtension
const getDistinctPlantsFromPUExtension = async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        
        const result = await pool.request().query(`
            SELECT 
                pe.plant as code,
                MIN(pe.pudescription) as name,
                MIN(pe.puno) as puno,
                MIN(pu.PUCRITICALNO) as pucriticalno
            FROM PUExtension pe
            LEFT JOIN PU pu ON pe.pucode = pu.PUCODE AND pu.FLAGDEL = 'F'
            WHERE pe.plant IS NOT NULL 
            AND pe.plant != ''
            AND pe.digit_count = 1
            GROUP BY pe.plant
            ORDER BY pe.plant
        `);

        res.json({
            success: true,
            data: result.recordset
        });

    } catch (error) {
        console.error('Error fetching distinct plants from PUExtension:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch distinct plants',
            error: error.message
        });
    }
};

// Get distinct areas from PUExtension for a specific plant
const getDistinctAreasFromPUExtension = async (req, res) => {
    try {
        const { plant } = req.params;
        
        if (!plant) {
            return res.status(400).json({
                success: false,
                message: 'Plant is required'
            });
        }

        const pool = await sql.connect(dbConfig);
        
        const result = await pool.request()
            .input('plant', sql.NVarChar(50), plant)
            .query(`
                SELECT 
                    pe.area as code,
                    MIN(pe.pudescription) as name,
                    MIN(pe.puno) as puno,
                    MIN(pu.PUCRITICALNO) as pucriticalno
                FROM PUExtension pe
                LEFT JOIN PU pu ON pe.pucode = pu.PUCODE AND pu.FLAGDEL = 'F'
                WHERE pe.plant = @plant
                AND pe.area IS NOT NULL 
                AND pe.area != ''
                AND pe.digit_count = 2
                GROUP BY pe.area
                ORDER BY pe.area
            `);

        res.json({
            success: true,
            data: result.recordset
        });

    } catch (error) {
        console.error('Error fetching distinct areas from PUExtension:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch distinct areas',
            error: error.message
        });
    }
};

// Get distinct lines from PUExtension for a specific plant and area
const getDistinctLinesFromPUExtension = async (req, res) => {
    try {
        const { plant, area } = req.params;
        
        if (!plant || !area) {
            return res.status(400).json({
                success: false,
                message: 'Plant and area are required'
            });
        }

        const pool = await sql.connect(dbConfig);
        
        const result = await pool.request()
            .input('plant', sql.NVarChar(50), plant)
            .input('area', sql.NVarChar(50), area)
            .query(`
                SELECT 
                    pe.line as code,
                    MIN(pe.pudescription) as name,
                    MIN(pe.puno) as puno,
                    MIN(pu.PUCRITICALNO) as pucriticalno
                FROM PUExtension pe
                LEFT JOIN PU pu ON pe.pucode = pu.PUCODE AND pu.FLAGDEL = 'F'
                WHERE pe.plant = @plant
                AND pe.area = @area
                AND pe.line IS NOT NULL 
                AND pe.line != ''
                AND pe.digit_count = 3
                GROUP BY pe.line
                ORDER BY pe.line
            `);

        res.json({
            success: true,
            data: result.recordset
        });

    } catch (error) {
        console.error('Error fetching distinct lines from PUExtension:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch distinct lines',
            error: error.message
        });
    }
};

// Get distinct machines from PUExtension for a specific plant, area, and line
const getDistinctMachinesFromPUExtension = async (req, res) => {
    try {
        const { plant, area, line } = req.params;
        
        if (!plant || !area || !line) {
            return res.status(400).json({
                success: false,
                message: 'Plant, area, and line are required'
            });
        }

        const pool = await sql.connect(dbConfig);
        
        const result = await pool.request()
            .input('plant', sql.NVarChar(50), plant)
            .input('area', sql.NVarChar(50), area)
            .input('line', sql.NVarChar(50), line)
            .query(`
                SELECT 
                    CONCAT(pe.machine, '-', pe.number) as code,
                    pe.pudescription as name,
                    pe.puno,
                    pe.pucode,
                    pe.plant,
                    pe.area,
                    pe.line,
                    pe.machine,
                    pe.number,
                    pe.puname,
                    pe.pudescription,
                    pe.digit_count,
                    pu.PUCRITICALNO as pucriticalno
                FROM PUExtension pe
                LEFT JOIN PU pu ON pe.pucode = pu.PUCODE AND pu.FLAGDEL = 'F'
                WHERE pe.plant = @plant
                AND pe.area = @area
                AND pe.line = @line
                AND pe.machine IS NOT NULL 
                AND pe.machine != ''
                ORDER BY pe.machine, pe.number
            `);

        res.json({
            success: true,
            data: result.recordset
        });

    } catch (error) {
        console.error('Error fetching distinct machines from PUExtension:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch distinct machines',
            error: error.message
        });
    }
};

// Get distinct machines without lines from PUExtension for a specific plant and area
const getDistinctMachinesWithoutLinesFromPUExtension = async (req, res) => {
    try {
        const { plant, area } = req.params;
        
        if (!plant || !area) {
            return res.status(400).json({
                success: false,
                message: 'Plant and area are required'
            });
        }

        const pool = await sql.connect(dbConfig);
        
        const result = await pool.request()
            .input('plant', sql.NVarChar(50), plant)
            .input('area', sql.NVarChar(50), area)
            .query(`
                SELECT 
                    CONCAT(pe.machine, '-', pe.number) as code,
                    pe.pudescription as name,
                    pe.puno,
                    pe.pucode,
                    pe.plant,
                    pe.area,
                    pe.line,
                    pe.machine,
                    pe.number,
                    pe.puname,
                    pe.pudescription,
                    pe.digit_count,
                    pu.PUCRITICALNO as pucriticalno
                FROM PUExtension pe
                LEFT JOIN PU pu ON pe.pucode = pu.PUCODE AND pu.FLAGDEL = 'F'
                WHERE pe.plant = @plant
                AND pe.area = @area
                AND pe.line IS NULL
                AND pe.machine IS NOT NULL 
                AND pe.machine != ''
                ORDER BY pe.machine, pe.number
            `);

        res.json({
            success: true,
            data: result.recordset
        });

    } catch (error) {
        console.error('Error fetching distinct machines without lines from PUExtension:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch distinct machines without lines',
            error: error.message
        });
    }
};

// Get distinct numbers from PUExtension for a specific plant, area, line, and machine
const getDistinctNumbersFromPUExtension = async (req, res) => {
    try {
        const { plant, area, line, machine } = req.params;
        
        if (!plant || !area || !line || !machine) {
            return res.status(400).json({
                success: false,
                message: 'Plant, area, line, and machine are required'
            });
        }

        const pool = await sql.connect(dbConfig);
        
        const result = await pool.request()
            .input('plant', sql.NVarChar(50), plant)
            .input('area', sql.NVarChar(50), area)
            .input('line', sql.NVarChar(50), line)
            .input('machine', sql.NVarChar(50), machine)
            .query(`
                SELECT DISTINCT 
                    number as code,
                    pudescription as name
                FROM PUExtension
                WHERE plant = @plant
                AND area = @area
                AND line = @line
                AND machine = @machine
                AND number IS NOT NULL 
                AND number != ''
                AND digit_count = 5
                ORDER BY number
            `);

        res.json({
            success: true,
            data: result.recordset
        });

    } catch (error) {
        console.error('Error fetching distinct numbers from PUExtension:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch distinct numbers',
            error: error.message
        });
    }
};


module.exports = {
    getPlants,
    getAllAreas,
    getAreasByPlant,
    getLinesByArea,
    getMachinesByLine,
    searchPUCODE,
    getPUCODEDetails,
    generatePUCODE,
    getDistinctPlants,
    getDistinctAreas,
    getPUCriticalLevels,
    getMachinesByHierarchy,
    getDistinctPlantsFromPUExtension,
    getDistinctAreasFromPUExtension,
    getDistinctLinesFromPUExtension,
    getDistinctMachinesFromPUExtension,
    getDistinctMachinesWithoutLinesFromPUExtension,
    getDistinctNumbersFromPUExtension
};
