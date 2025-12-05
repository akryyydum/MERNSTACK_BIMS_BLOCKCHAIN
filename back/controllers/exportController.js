const Resident = require("../models/resident.model");
const Household = require("../models/household.model");
const UtilityPayment = require("../models/utilityPayment.model");
const FinancialTransaction = require("../models/financialTransaction.model");
const DocumentRequest = require("../models/document.model");
const Settings = require("../models/settings.model");
const { getDashboard } = require("./adminFinancialController");
const dayjs = require("dayjs");
const isSameOrBefore = require("dayjs/plugin/isSameOrBefore");
const isSameOrAfter = require("dayjs/plugin/isSameOrAfter");

dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);

/**
 * Sanitize CSV value to prevent formula injection and handle special characters
 * @param {*} value - Value to sanitize
 * @returns {string} - Sanitized value
 */
const sanitizeCsvValue = (value) => {
  if (value === null || value === undefined) return "";
  
  // Convert to string
  let strValue = String(value);
  
  // Prevent formula injection: if starts with =, +, -, @, prefix with single quote
  if (/^[=+\-@]/.test(strValue)) {
    strValue = "'" + strValue;
  }
  
  // Escape double quotes by doubling them
  strValue = strValue.replace(/"/g, '""');
  
  // Wrap in quotes if contains comma, newline, or double quote
  if (/[",\n\r]/.test(strValue)) {
    strValue = '"' + strValue + '"';
  }
  
  return strValue;
};

/**
 * Calculate date range based on filter type and date value
 * @param {string} type - Filter type: 'day' | 'week' | 'month' | 'year'
 * @param {string} dateString - ISO date string
 * @returns {Object} - { startDate, endDate }
 */
const calculateDateRange = (type, dateString) => {
  const date = dayjs(dateString);
  
  let startDate, endDate;
  
  switch (type) {
    case "day":
      startDate = date.startOf("day").toDate();
      endDate = date.endOf("day").toDate();
      break;
    case "week":
      startDate = date.startOf("week").toDate();
      endDate = date.endOf("week").toDate();
      break;
    case "month":
      startDate = date.startOf("month").toDate();
      endDate = date.endOf("month").toDate();
      break;
    case "year":
      startDate = date.startOf("year").toDate();
      endDate = date.endOf("year").toDate();
      break;
    default:
      // Default to current month if invalid type
      startDate = dayjs().startOf("month").toDate();
      endDate = dayjs().endOf("month").toDate();
  }
  
  return { startDate, endDate };
};

/**
 * Generate comprehensive summary data for CSV export
 * @param {Date} startDate - Start of date range
 * @param {Date} endDate - End of date range
 * @returns {Object} - Summary data object
 */
const generateSummaryData = async (startDate, endDate) => {
  try {
    // Fetch settings for barangay info
    const settings = await Settings.findOne().lean();
    const barangayName = settings?.barangayName || "La Torre North";
    
    // ==========================
    // RESIDENTS DATA
    // ==========================
    const allResidents = await Resident.find().lean();
    const residentsInRange = await Resident.find({
      createdAt: { $gte: startDate, $lte: endDate }
    }).lean();
    
    const totalPopulation = allResidents.length;
    const newResidentsInRange = residentsInRange.length;
    
    // Gender counts
    const maleCount = allResidents.filter(r => 
      (r.sex || r.gender || "").toLowerCase() === "male"
    ).length;
    const femaleCount = allResidents.filter(r => 
      (r.sex || r.gender || "").toLowerCase() === "female"
    ).length;
    
    // Age distribution
    const now = new Date();
    const ages = allResidents.map(r => {
      if (!r.dateOfBirth) return null;
      const age = now.getFullYear() - new Date(r.dateOfBirth).getFullYear();
      return age;
    }).filter(age => age !== null);
    
    const age0_12 = ages.filter(age => age >= 0 && age <= 12).length;
    const age13_17 = ages.filter(age => age >= 13 && age <= 17).length;
    const age18_59 = ages.filter(age => age >= 18 && age <= 59).length;
    const age60Plus = ages.filter(age => age >= 60).length;
    
    // Voter registration
    const registeredVoters = allResidents.filter(r => r.registeredVoter === true).length;
    
    // Employment status
    const employed = allResidents.filter(r => 
      r.employmentStatus === "Labor Force" && r.occupation && r.occupation.toLowerCase() !== "none"
    ).length;
    const unemployed = allResidents.filter(r => 
      r.employmentStatus === "Unemployed" || !r.occupation || r.occupation.toLowerCase() === "none"
    ).length;
    
    // Students (based on occupation or age)
    const students = allResidents.filter(r => 
      r.occupation && r.occupation.toLowerCase().includes("student")
    ).length;
    
    // Sectoral information
    const pwdCount = allResidents.filter(r => 
      r.sectoralInformation && r.sectoralInformation.includes("PWD")
    ).length;
    const seniorCitizenCount = ages.filter(age => age >= 60).length;
    const soloParentCount = allResidents.filter(r => 
      r.sectoralInformation && r.sectoralInformation.includes("Solo Parent")
    ).length;
    
    // ==========================
    // HOUSEHOLDS DATA
    // ==========================
    const allHouseholds = await Household.find().lean();
    const householdsInRange = await Household.find({
      createdAt: { $gte: startDate, $lte: endDate }
    }).lean();
    
    const totalHouseholds = allHouseholds.length;
    const newHouseholdsInRange = householdsInRange.length;
    
    // Average household size
    const totalMembers = allHouseholds.reduce((sum, h) => sum + (h.members?.length || 0), 0);
    const avgHouseholdSize = totalHouseholds > 0 
      ? (totalMembers / totalHouseholds).toFixed(2) 
      : 0;
    
    // ==========================
    // FEES DATA
    // ==========================
    // Fetch all utility payments (garbage and streetlight) - same as AdminGarbageFees/AdminStreetLightFees
    const allGarbagePayments = await UtilityPayment.find({ type: "garbage" })
      .populate("household", "householdId address headOfHousehold")
      .sort({ month: -1, createdAt: -1 })
      .lean();
    
    const allStreetlightPayments = await UtilityPayment.find({ type: "streetlight" })
      .populate("household", "householdId address headOfHousehold")
      .sort({ month: -1, createdAt: -1 })
      .lean();
    
    // Filter by date range - check both createdAt and month field
    const garbagePayments = allGarbagePayments.filter(p => {
      const dateToCheck = new Date(p.createdAt);
      return dateToCheck >= startDate && dateToCheck <= endDate;
    });
    
    const streetlightPayments = allStreetlightPayments.filter(p => {
      const dateToCheck = new Date(p.createdAt);
      return dateToCheck >= startDate && dateToCheck <= endDate;
    });
    
    // Calculate fee compliance rate based on household expected revenue (matching admin pages logic)
    // Get current year payments for all households to calculate collection rate
    const currentYear = new Date().getFullYear();
    const yearStart = new Date(currentYear, 0, 1);
    const yearEnd = new Date(currentYear, 11, 31, 23, 59, 59, 999);
    
    // Get all payments for current year
    const currentYearGarbagePayments = allGarbagePayments.filter(p => {
      if (!p.month) return false;
      const paymentDate = new Date(p.month + '-01');
      return paymentDate >= yearStart && paymentDate <= yearEnd;
    });
    
    const currentYearStreetlightPayments = allStreetlightPayments.filter(p => {
      if (!p.month) return false;
      const paymentDate = new Date(p.month + '-01');
      return paymentDate >= yearStart && paymentDate <= yearEnd;
    });
    
    // Calculate yearly collected amounts
    const yearlyGarbageCollected = currentYearGarbagePayments.reduce((sum, p) => 
      sum + (Number(p.amountPaid) || 0), 0
    );
    const yearlyStreetlightCollected = currentYearStreetlightPayments.reduce((sum, p) => 
      sum + (Number(p.amountPaid) || 0), 0
    );
    
    // Calculate expected yearly revenue based on households
    // Garbage fee varies by household (with/without business)
    let expectedGarbageMonthly = 0;
    allHouseholds.forEach(household => {
      const garbageFee = household.hasBusiness 
        ? (settings?.garbageBusinessFee || 50) 
        : (settings?.garbageFee || 35);
      expectedGarbageMonthly += garbageFee;
    });
    const expectedGarbageYearly = expectedGarbageMonthly * 12;
    
    // Streetlight fee is same for all households
    const streetlightMonthlyFee = settings?.streetlightFee || 10;
    const expectedStreetlightYearly = totalHouseholds * streetlightMonthlyFee * 12;
    
    // Calculate total expected and collected
    const expectedYearly = expectedGarbageYearly + expectedStreetlightYearly;
    const yearlyCollected = yearlyGarbageCollected + yearlyStreetlightCollected;
    
    // Collection rate (compliance rate) = (yearly collected / expected yearly) * 100
    const feeComplianceRate = expectedYearly > 0 
      ? ((yearlyCollected / expectedYearly) * 100).toFixed(2) 
      : 0;
    
    // ==========================
    // DOCUMENT REQUESTS DATA
    // ==========================
    // Fetch all document requests with populated fields (same as AdminDocumentRequests.jsx)
    const allDocRequests = await DocumentRequest.find({})
      .populate('residentId', 'firstName middleName lastName suffix civilStatus address')
      .populate('requestedBy', 'firstName middleName lastName suffix civilStatus address')
      .populate('requestFor', 'firstName middleName lastName suffix civilStatus address')
      .sort({ requestedAt: -1 })
      .lean();
    
    // Filter by date range using requestedAt field (primary) or createdAt as fallback (for counts only)
    const docRequests = allDocRequests.filter(d => {
      const dateToCheck = new Date(d.requestedAt || d.createdAt);
      return dateToCheck >= startDate && dateToCheck <= endDate;
    });
    
    const totalDocRequests = docRequests.length;
    
    // For revenue calculation, use ALL completed/claimed requests (matching dashboard logic - no date filter)
    const revenueDocRequests = allDocRequests.filter(d => 
      (d.status === "completed" || d.status === "claimed") && (d.amount > 0 || d.feeAmount > 0)
    );
    
    // Count by document type (using exact matching like in AdminDocumentRequests)
    const clearanceCount = docRequests.filter(d => 
      d.documentType && (
        d.documentType === "Barangay Clearance" ||
        d.documentType.toLowerCase().includes("barangay clearance")
      )
    ).length;
    
    const indigencyCount = docRequests.filter(d => 
      d.documentType && (
        d.documentType === "Certificate of Indigency" ||
        d.documentType === "Indigency" ||
        d.documentType.toLowerCase().includes("indigency")
      )
    ).length;
    
    const businessClearanceCount = docRequests.filter(d => 
      d.documentType && (
        d.documentType === "Business Clearance" ||
        d.documentType.toLowerCase().includes("business clearance")
      )
    ).length;
    
    // Status counts (matching AdminDocumentRequests status logic)
    const completedRequests = docRequests.filter(d => 
      d.status === "completed" || d.status === "released"
    ).length;
    
    const pendingRequests = docRequests.filter(d => 
      d.status === "pending"
    ).length;
    
    const acceptedRequests = docRequests.filter(d => 
      d.status === "accepted"
    ).length;
    
    const declinedRequests = docRequests.filter(d => 
      d.status === "declined"
    ).length;
    
    // ==========================
    // FINANCIAL DATA - Get from Financial Dashboard (matching AdminFinancialReports)
    // ==========================
    // Fetch financial transactions for counts and blockchain tracking
    const financialTransactions = await FinancialTransaction.find({
      createdAt: { $gte: startDate, $lte: endDate }
    }).lean();
    
    // Get total revenue from Financial Dashboard (matching AdminFinancialReports)
    let dashboardStats = null;
    try {
      // Call getDashboard internally to get the same statistics used in AdminFinancialReports
      const mockReq = { query: {} };
      const mockRes = {
        json: (data) => { dashboardStats = data; },
        status: (code) => ({ json: (data) => { dashboardStats = data; } })
      };
      await getDashboard(mockReq, mockRes);
    } catch (error) {
      console.error('Error fetching dashboard stats for export:', error);
    }
    
    // Extract revenue statistics from dashboard (same source as AdminFinancialReports)
    const totalRevenue = dashboardStats?.statistics?.totalRevenue || 0;
    const expenseTotal = dashboardStats?.statistics?.totalExpenses || 0;
    const netBalance = dashboardStats?.statistics?.balance || 0;
    
    // For backward compatibility, also calculate document request revenue for detail rows
    const docRequestRevenue = revenueDocRequests.reduce((sum, d) => {
      const docAmount = Number(d.amount || 0);
      return sum + docAmount;
    }, 0);
    
    // Most requested document type
    const docTypeCounts = {};
    docRequests.forEach(d => {
      const type = d.documentType || "Unknown";
      docTypeCounts[type] = (docTypeCounts[type] || 0) + 1;
    });
    
    const mostRequestedDocument = Object.keys(docTypeCounts).length > 0
      ? Object.entries(docTypeCounts).sort((a, b) => b[1] - a[1])[0][0]
      : "None";
    
    // ==========================
    // BLOCKCHAIN DATA (Optional)
    // ==========================
    // Note: Blockchain data counting is optional since it requires fabric connection
    // For simplicity, we'll count from MongoDB blockchain fields
    const blockchainResidents = allResidents.filter(r => 
      r.blockchain?.hash || r.blockchain?.lastTxId
    ).length;
    
    const blockchainDocRequests = docRequests.filter(d => 
      d.blockchain?.hash || d.blockchain?.lastTxId
    ).length;
    
    const blockchainFinancial = financialTransactions.filter(t => 
      t.blockchain?.hash || t.blockchain?.txId
    ).length;
    
    const totalBlockchainRecords = blockchainResidents + blockchainDocRequests + blockchainFinancial;
    const blockchain = totalBlockchainRecords > 0; // Check if blockchain has any records
    
    // ==========================
    // RETURN SUMMARY OBJECT
    // ==========================
    return {
      // General Info
      barangay_name: barangayName,
      report_range_start: dayjs(startDate).format("YYYY-MM-DD"),
      report_range_end: dayjs(endDate).format("YYYY-MM-DD"),
      
      // Dashboard Metrics (Top Cards)
      total_residents: totalPopulation,
      pending_document_requests: pendingRequests,
      total_financial_transactions: financialTransactions.length,
      total_revenue: totalRevenue.toFixed(2),
      
      // Gender Demographics (Pie Chart)
      male_count: maleCount,
      female_count: femaleCount,
      male_percentage: totalPopulation > 0 ? ((maleCount / totalPopulation) * 100).toFixed(1) + "%" : "0%",
      female_percentage: totalPopulation > 0 ? ((femaleCount / totalPopulation) * 100).toFixed(1) + "%" : "0%",
      
      // Purok Distribution (Pie Chart)
      purok_1_count: allResidents.filter(r => r.address?.purok === 'Purok 1').length,
      purok_2_count: allResidents.filter(r => r.address?.purok === 'Purok 2').length,
      purok_3_count: allResidents.filter(r => r.address?.purok === 'Purok 3').length,
      purok_4_count: allResidents.filter(r => r.address?.purok === 'Purok 4').length,
      purok_5_count: allResidents.filter(r => r.address?.purok === 'Purok 5').length,
      
      // Document Requests (from Area Chart & Table)
      barangay_clearance_count: clearanceCount,
      certificate_of_indigency_count: indigencyCount,
      business_clearance_count: businessClearanceCount,
      completed_doc_requests: completedRequests,
      accepted_doc_requests: acceptedRequests,
      declined_doc_requests: declinedRequests,
      
      // Blockchain Network Status
      blockchain_records: totalBlockchainRecords,
      blockchain_status: blockchain ? "Active" : "Inactive"
    };
    
  } catch (error) {
    console.error("Error generating summary data:", error);
    throw error;
  }
};

/**
 * Convert summary object to CSV string
 * @param {Object} summary - Summary data object
 * @returns {string} - CSV string
 */
const convertToCSV = (summary) => {
  // Create CSV header (field names)
  const headers = Object.keys(summary);
  
  // Create CSV data row (values)
  const values = Object.values(summary).map(val => sanitizeCsvValue(val));
  
  // Combine header and values
  const csvContent = [
    headers.join(","),
    values.join(",")
  ].join("\n");
  
  return csvContent;
};

/**
 * Export summary CSV endpoint
 * GET /api/export/summary-csv?type={type}&date={date}
 */
exports.exportSummaryCSV = async (req, res) => {
  try {
    // Check authorization (admin only)
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ 
        message: "Forbidden: Admin access required" 
      });
    }
    
    // Extract and validate query parameters
    const { type, date } = req.query;
    
    if (!type || !date) {
      return res.status(400).json({ 
        message: "Missing required parameters: type and date" 
      });
    }
    
    // Validate type
    const validTypes = ["day", "week", "month", "year"];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ 
        message: `Invalid type. Must be one of: ${validTypes.join(", ")}` 
      });
    }
    
    // Validate date format
    if (!dayjs(date).isValid()) {
      return res.status(400).json({ 
        message: "Invalid date format. Please provide a valid ISO date string." 
      });
    }
    
    // Calculate date range
    const { startDate, endDate } = calculateDateRange(type, date);
    
    console.log(`[Export CSV] Type: ${type}, Date: ${date}`);
    console.log(`[Export CSV] Range: ${startDate.toISOString()} - ${endDate.toISOString()}`);
    
    // Generate summary data
    const summary = await generateSummaryData(startDate, endDate);
    
    // Convert to CSV
    const csvContent = convertToCSV(summary);
    
    // Generate filename with timestamp
    const timestamp = dayjs().format("YYYYMMDD_HHmmss");
    const filename = `bims_summary_${type}_${timestamp}.csv`;
    
    // Set response headers for CSV download
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Pragma", "no-cache");
    
    // Send CSV content
    res.status(200).send(csvContent);
    
    console.log(`[Export CSV] Successfully generated: ${filename}`);
    
  } catch (error) {
    console.error("[Export CSV] Error:", error);
    res.status(500).json({ 
      message: "Failed to generate CSV export",
      error: error.message 
    });
  }
};
