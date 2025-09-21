const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const { authenticateToken, requireFormPermission } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Inventory Catalog (requires IV form view permission)
router.get('/catalog', requireFormPermission('IV', 'view'), inventoryController.getInventoryCatalog);
router.get('/catalog/search', requireFormPermission('IV', 'view'), inventoryController.searchInventoryItems);
router.get('/catalog/:id', requireFormPermission('IV', 'view'), inventoryController.getInventoryItemById);

// Stores (requires IV form view permission)
router.get('/stores', requireFormPermission('IV', 'view'), inventoryController.getStores);
router.get('/stores/:id', requireFormPermission('IV', 'view'), inventoryController.getStoreById);
router.get('/stores/:id/inventory', requireFormPermission('IV', 'view'), inventoryController.getStoreInventory);
router.get('/stores/:id/balances', requireFormPermission('IV', 'view'), inventoryController.getStoreBalances);

// Vendors (requires IV form view permission)
router.get('/vendors', requireFormPermission('IV', 'view'), inventoryController.getVendors);
router.get('/vendors/:id', requireFormPermission('IV', 'view'), inventoryController.getVendorById);
router.get('/vendors/:id/parts', requireFormPermission('IV', 'view'), inventoryController.getVendorParts);

// Transactions (requires IV form view permission)
router.get('/transactions', requireFormPermission('IV', 'view'), inventoryController.getTransactions);
router.get('/transactions/:id', requireFormPermission('IV', 'view'), inventoryController.getTransactionById);
router.get('/transactions/head/:id', requireFormPermission('IV', 'view'), inventoryController.getTransactionHead);

// Master Data (requires IV form view permission)
router.get('/units', requireFormPermission('IV', 'view'), inventoryController.getInventoryUnits);
router.get('/groups', requireFormPermission('IV', 'view'), inventoryController.getInventoryGroups);
router.get('/types', requireFormPermission('IV', 'view'), inventoryController.getInventoryTypes);

// Stock Management (requires IV form view permission)
router.get('/stock/balances', requireFormPermission('IV', 'view'), inventoryController.getStockBalances);
router.get('/stock/pending', requireFormPermission('IV', 'view'), inventoryController.getPendingStock);
router.get('/stock/receipts', requireFormPermission('IV', 'view'), inventoryController.getStockReceipts);

// Statistics (requires IV form view permission)
router.get('/stats/overview', requireFormPermission('IV', 'view'), inventoryController.getInventoryStats);
router.get('/stats/turnover', requireFormPermission('IV', 'view'), inventoryController.getInventoryTurnover);
router.get('/stats/valuation', requireFormPermission('IV', 'view'), inventoryController.getInventoryValuation);

// Alerts (requires IV form view permission)
router.get('/lowstock', requireFormPermission('IV', 'view'), inventoryController.getLowStockItems);
router.get('/reorder', requireFormPermission('IV', 'view'), inventoryController.getReorderPoints);

// Serial Numbers (requires IV form view permission)
router.get('/serial/:serialNo', requireFormPermission('IV', 'view'), inventoryController.getBySerialNumber);
router.get('/parts/:partId/serials', requireFormPermission('IV', 'view'), inventoryController.getPartSerialNumbers);

// Cost Analysis (requires IV form view permission)
router.get('/costs/calculated', requireFormPermission('IV', 'view'), inventoryController.getCalculatedCosts);
router.get('/costs/analysis', requireFormPermission('IV', 'view'), inventoryController.getCostAnalysis);

// Historical Data (requires IV form view permission)
router.get('/historical/data', requireFormPermission('IV', 'view'), inventoryController.getHistoricalInventoryData);
router.get('/historical/periods', requireFormPermission('IV', 'view'), inventoryController.getHistoricalPeriods);

module.exports = router;
