/**
 * Centralized Intake Configuration
 * 
 * This file defines the available student intakes for Mushagashe VTC.
 * Intakes follow the format: "<Month> <Year>"
 * 
 * Three intakes per year: January, May, September
 */

const generateIntakes = (startYear, endYear) => {
  const intakes = [];
  const months = ['January', 'May', 'September'];
  
  for (let year = startYear; year <= endYear; year++) {
    months.forEach(month => {
      intakes.push(`${month} ${year}`);
    });
  }
  
  return intakes;
};

// Generate intakes for current and next 2 years
const currentYear = new Date().getFullYear();
const AVAILABLE_INTAKES = generateIntakes(currentYear - 1, currentYear + 2);

// Default intake for current registration period
const DEFAULT_INTAKE = AVAILABLE_INTAKES.find(intake => 
  intake.includes(new Date().toLocaleString('default', { month: 'long' })) && 
  intake.includes(currentYear.toString())
) || `January ${currentYear}`;

/**
 * Get all available intakes
 */
const getIntakes = () => AVAILABLE_INTAKES;

/**
 * Get default intake
 */
const getDefaultIntake = () => DEFAULT_INTAKE;

/**
 * Validate if a given intake string is valid
 */
const isValidIntake = (intake) => AVAILABLE_INTAKES.includes(intake);

/**
 * Extract year from intake string
 * Example: "January 2026" -> 2026
 */
const extractYearFromIntake = (intake) => {
  const match = intake.match(/\d{4}/);
  return match ? parseInt(match[0]) : null;
};

/**
 * Extract month from intake string
 * Example: "January 2026" -> "January"
 */
const extractMonthFromIntake = (intake) => {
  const match = intake.match(/^([A-Za-z]+)/);
  return match ? match[1] : null;
};

/**
 * Get intake order for sorting
 * January = 1, May = 2, September = 3
 */
const getIntakeOrder = (intake) => {
  const month = extractMonthFromIntake(intake);
  const monthOrder = { 'January': 1, 'May': 2, 'September': 3 };
  return monthOrder[month] || 0;
};

module.exports = {
  getIntakes,
  getDefaultIntake,
  isValidIntake,
  extractYearFromIntake,
  extractMonthFromIntake,
  getIntakeOrder,
  AVAILABLE_INTAKES,
  DEFAULT_INTAKE
};
