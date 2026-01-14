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
    {
      areaCode: "PP-LOADER",
      areaName: "Loader Area",
      plant: "PP",
      machines: [
        {
          machineName: "Loader1",
          puIds: [895],
        },
        {
          machineName: "Loader2",
          puIds: [917],
        }
      ],
    },
    {
      areaCode: "PP-FRONT PROCESS",
      areaName: "FRONT PROCESS",
      plant: "PP",
      machines: [
        {
          machineName: "OFM1",
          puIds: [895],
        },
        {
          machineName: "OFM2",
          puIds: [917],
        },
        {
          machineName: "Fish",
          puIds: [917],
        },
        {
          machineName: "Chicken",
          puIds: [917],
        },
      ],
    },
    {
      areaCode: "PP-RECIPE",
      areaName: "RECIPE",
      plant: "PP",
      machines: [
        {
          machineName: "Sauce Makeup",
          puIds: [895],
        },
        {
          machineName: "Tote",
          puIds: [917],
        },
        {
          machineName: "Weight Scale",
          puIds: [917],
        },
        {
          machineName: "Soy Oil Station",
          puIds: [917],
        }
      ],
    },
    {
      areaCode: "PP-NISHIBE",
      areaName: "NISHIBE",
      plant: "PP",
      machines: [
        {
          machineName: "Nishibe1",
          puIds: [895],
        },
        {
          machineName: "Nishibe2",
          puIds: [917],
        },
        {
          machineName: "Nishibe3",
          puIds: [917],
        },
        {
          machineName: "Nishibe4",
          puIds: [917],
        },
        {
          machineName: "Nishibe5",
          puIds: [917],
        },
      ],
    },
    {
      areaCode: "PP-RETORT",
      areaName: "RETORT",
      plant: "PP",
      machines: [
        {
          machineName: "Retort1",
          puIds: [895],
        },
        {
          machineName: "Retort2",
          puIds: [917],
        },
        {
          machineName: "Retort3",
          puIds: [917],
        },
        {
          machineName: "Retort4",
          puIds: [917],
        },
        {
          machineName: "Retort5",
          puIds: [917],
        },
        {
          machineName: "Retort6",
          puIds: [917],
        },
        {
          machineName: "Retort7",
          puIds: [917],
        },
        {
          machineName: "Retort8",
          puIds: [917],
        }
      ],
    },
    {
      areaCode: "PP-UNLOADER",
      areaName: "UNLOADER",
      plant: "PP",
      machines: [
        {
          machineName: "Unloader1",
          puIds: [895],
        },
        {
          machineName: "Unloader2",
          puIds: [917],
        },
        {
          machineName: "Unloader3",
          puIds: [917],
        },
      ],
    },
    {
      areaCode: "PP-PACKING",
      areaName: "PACKING",
      plant: "PP",
      machines: [
        {
          machineName: "Packing Line 1",
          puIds: [895],
        },
        {
          machineName: "Packing Line 2",
          puIds: [917],
        },
        {
          machineName: "Packing Line 3",
          puIds: [917],
        }
      ],
    },
    {
      areaCode: "PP-VLM",
      areaName: "VLM",
      plant: "PP",
      machines: [
        {
          machineName: "VLM",
          puIds: [895],
        }
      ],
    },
    {
      areaCode: "PP-PACKMASTER",
      areaName: "PACKMASTER",
      plant: "PP",
      machines: [
        {
          machineName: "Packmaster",
          puIds: [895],
        }
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
