/**
 * Area Dashboard Configuration
 * 
 * This file defines which PUs (Production Units) belong to each area
 * for the Area Dashboard display.
 * 
 * To find PU IDs (puno):
 * 1. Query the database: SELECT puno, pudescription, plant, area, line, machine FROM IgxPUExtension
 * 2. Or use the hierarchy API endpoints to explore the structure
 * 
 * Structure:
 * - areaCode: The area code (e.g., "UACN", "CANT")
 * - areaName: Display name for the area
 * - plant: Plant code (e.g., "AJ", "AO")
 * - puIds: Array of PU IDs (puno) that belong to this area
 */

import type { AreaDashboardConfig } from '@/services/areaDashboardService';

/**
 * Area Dashboard Configuration by Area Name
 * 
 * Each area has its own configuration with the area name as the key.
 * The area name matches the route parameter (e.g., /dashboard/area/pouch)
 * 
 * Structure:
 * - Each area contains machines
 * - Each machine has a name and an array of PU IDs
 * - Metrics are summed from all PU IDs in each machine's array
 * 
 * To find PU IDs (puno):
 * 1. Query the database: SELECT puno, pudescription, plant, area, line, machine FROM IgxPUExtension
 * 2. Or use the hierarchy API endpoints to explore the structure
 */

export const areaDashboardConfigs: Record<string, AreaDashboardConfig[]> = {
  /**
   * Pouch Area Configuration
   * Route: /dashboard/area/pouch
   */
  pouch: [
    {
      areaCode: "PP-FILA",
      areaName: "Filler Area",
      plant: "PP",
      machines: [
        {
          machineName: "Filler1",
          puIds: [895],
        },
        {
          machineName: "Filler2",
          puIds: [917],
        },
        {
          machineName: "Filler3",
          puIds: [939],
        },
        {
          machineName: "Filler4",
          puIds: [961],
        },
        {
          machineName: "Filler5",
          puIds: [980],
        },
        {
          machineName: "Filler6",
          puIds: [1000],
        },
        {
          machineName: "Filler7",
          puIds: [3651],
        },
        {
          machineName: "Filler8",
          puIds: [3986],
        },
        {
          machineName: "Filler9",
          puIds: [4250],
        },
        {
          machineName: "Filler10",
          puIds: [4251],
        },

        // Add more machines as needed
      ],
    },
  ],

  /**
   * Dry Area Configuration
   * Route: /dashboard/area/dry
   */
  dry: [
    {
      areaCode: "DRY",
      areaName: "Dry",
      plant: "AO",
      machines: [
        // Example:
        // {
        //   machineName: "Dry Machine 1",
        //   puIds: [2345, 2346, 2347]
        // }
      ],
    },
  ],

  /**
   * PT Area Configuration
   * Route: /dashboard/area/pt
   */
  pt: [
    {
      areaCode: "PT",
      areaName: "PT",
      plant: "AO",
      machines: [
        // Example:
        // {
        //   machineName: "PT Machine 1",
        //   puIds: [3456, 3457, 3458]
        // }
      ],
    },
  ],
};

/**
 * Get configuration for a specific area
 */
export const getAreaConfig = (areaName: string): AreaDashboardConfig[] => {
  return areaDashboardConfigs[areaName] || [];
};
