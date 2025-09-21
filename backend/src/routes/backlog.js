const express = require('express');
const router = express.Router();
const backlogController = require('../controllers/backlogController');
const { authenticateToken, requireFormPermission } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * @swagger
 * /api/backlog/assign:
 *   get:
 *     summary: Get backlog by department
 *     description: Returns work order backlog grouped by department and status
 *     tags: [Backlog]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: siteNo
 *         schema:
 *           type: integer
 *           default: 3
 *         description: Site number
 *     responses:
 *       200:
 *         description: Backlog data by department
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     backlog:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           woStatusName:
 *                             type: string
 *                           woStatusNo:
 *                             type: integer
 *                           deptCode:
 *                             type: string
 *                           count:
 *                             type: integer
 *                           total:
 *                             type: integer
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalWorkOrders:
 *                           type: number
 *                         totalDepartments:
 *                           type: integer
 *                         siteNo:
 *                           type: integer
 *       500:
 *         description: Internal server error
 */
router.get('/assign', requireFormPermission('WO', 'view'), backlogController.getBacklogAssign);

/**
 * @swagger
 * /api/backlog/assign/lv1:
 *   get:
 *     summary: Get backlog by department - Level 1 detail
 *     description: Returns detailed work order information for a specific department
 *     tags: [Backlog]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: siteNo
 *         schema:
 *           type: integer
 *           default: 3
 *         description: Site number
 *       - in: query
 *         name: deptCode
 *         required: true
 *         schema:
 *           type: string
 *         description: Department code
 *     responses:
 *       200:
 *         description: Detailed backlog data by department
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     details:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           wono:
 *                             type: integer
 *                           woCode:
 *                             type: string
 *                           deptCode:
 *                             type: string
 *                           woStatusName:
 *                             type: string
 *                           symptom:
 *                             type: string
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalWorkOrders:
 *                           type: integer
 *                         department:
 *                           type: string
 *                         siteNo:
 *                           type: integer
 *                         statusBreakdown:
 *                           type: object
 *       400:
 *         description: Bad request - missing required parameters
 *       500:
 *         description: Internal server error
 */
router.get('/assign/lv1', requireFormPermission('WO', 'view'), backlogController.getBacklogAssignLv1);

/**
 * @swagger
 * /api/backlog/assignto:
 *   get:
 *     summary: Get backlog by user
 *     description: Returns work order backlog grouped by assigned user and status
 *     tags: [Backlog]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: siteNo
 *         schema:
 *           type: integer
 *           default: 3
 *         description: Site number
 *     responses:
 *       200:
 *         description: Backlog data by user
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     backlog:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           woStatusName:
 *                             type: string
 *                           woStatusNo:
 *                             type: integer
 *                           personName:
 *                             type: string
 *                           count:
 *                             type: integer
 *                           total:
 *                             type: integer
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalWorkOrders:
 *                           type: number
 *                         totalUsers:
 *                           type: integer
 *                         siteNo:
 *                           type: integer
 *       500:
 *         description: Internal server error
 */
router.get('/assignto', requireFormPermission('WO', 'view'), backlogController.getBacklogAssignTo);

/**
 * @swagger
 * /api/backlog/assignto/lv1:
 *   get:
 *     summary: Get backlog by user - Level 1 detail
 *     description: Returns detailed work order information for a specific user
 *     tags: [Backlog]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: siteNo
 *         schema:
 *           type: integer
 *           default: 3
 *         description: Site number
 *       - in: query
 *         name: personName
 *         required: true
 *         schema:
 *           type: string
 *         description: Person name
 *     responses:
 *       200:
 *         description: Detailed backlog data by user
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     details:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           wono:
 *                             type: integer
 *                           woCode:
 *                             type: string
 *                           personName:
 *                             type: string
 *                           woStatusName:
 *                             type: string
 *                           symptom:
 *                             type: string
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalWorkOrders:
 *                           type: integer
 *                         personName:
 *                           type: string
 *                         siteNo:
 *                           type: integer
 *                         statusBreakdown:
 *                           type: object
 *       400:
 *         description: Bad request - missing required parameters
 *       500:
 *         description: Internal server error
 */
router.get('/assignto/lv1', requireFormPermission('WO', 'view'), backlogController.getBacklogAssignToLv1);

/**
 * @swagger
 * /api/backlog/wotype-dept:
 *   get:
 *     summary: Get backlog by work order type and department
 *     description: Returns work order backlog grouped by work order type and department
 *     tags: [Backlog]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: siteNo
 *         schema:
 *           type: integer
 *           default: 3
 *         description: Site number
 *     responses:
 *       200:
 *         description: Backlog data by work order type and department
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     backlog:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           deptNo:
 *                             type: integer
 *                           deptCode:
 *                             type: string
 *                           woTypeNo:
 *                             type: integer
 *                           woTypeCode:
 *                             type: string
 *                           woStatusNo:
 *                             type: integer
 *                           woStatusCode:
 *                             type: string
 *                           total:
 *                             type: integer
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalWorkOrders:
 *                           type: integer
 *                         totalDepartments:
 *                           type: integer
 *                         totalWOTypes:
 *                           type: integer
 *                         totalStatuses:
 *                           type: integer
 *                         siteNo:
 *                           type: integer
 *       500:
 *         description: Internal server error
 */
router.get('/wotype-dept', requireFormPermission('WO', 'view'), backlogController.getBacklogByWOTypeAndDept);

module.exports = router;
