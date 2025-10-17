/**
 * Utility function to map critical numbers to text
 * @param {number} criticalNumber - The critical number to map
 * @returns {string} - The corresponding text description
 */
const mapCriticalNumberToText = (criticalNumber) => {
  const criticalMapping = {
    4: 'Not available',
    5: 'Production Stop',
    6: 'Production Dropped',
    7: 'No Impact'
  };

  return criticalMapping[criticalNumber] || 'Unknown';
};

/**
 * Get critical level text with fallback for null/undefined values
 * @param {number|null|undefined} criticalNumber - The critical number to map
 * @returns {string} - The corresponding text description or default
 */
const getCriticalLevelText = (criticalNumber) => {
  if (criticalNumber === null || criticalNumber === undefined) {
    return 'Not available';
  }
  
  return mapCriticalNumberToText(criticalNumber);
};

module.exports = {
  mapCriticalNumberToText,
  getCriticalLevelText
};
