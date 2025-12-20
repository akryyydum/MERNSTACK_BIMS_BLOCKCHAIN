const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const Resident = require('../models/resident.model');
const Household = require('../models/household.model');
const GarbagePayment = require('../models/gasPayment.model');
const StreetlightPayment = require('../models/streetlightPayment.model');
const FinancialTransaction = require('../models/financialTransaction.model');
const DocumentRequest = require('../models/document.model');
const User = require('../models/user.model');
const db = require('../config/db');

// Configuration
const PUROKS = ['Purok 1', 'Purok 2', 'Purok 3', 'Purok 4', 'Purok 5'];
const RESIDENTS_PER_PUROK = 100;
const TRANSACTIONS_PER_MONTH = 2;
const MONTHS = [
  '2025-01', '2025-02', '2025-03', '2025-04', '2025-05', '2025-06',
  '2025-07', '2025-08', '2025-09', '2025-10', '2025-11', '2025-12'
];

// First names, last names for Filipino-sounding names
const FIRST_NAMES = [
  'Maria', 'Juan', 'Jose', 'Ana', 'Pedro', 'Rosa', 'Luis', 'Carmen', 'Miguel', 'Elena',
  'Antonio', 'Dolores', 'Ramon', 'Lucia', 'Manuel', 'Sofia', 'Carlos', 'Catalina', 'Diego', 'Francisca',
  'Fernando', 'Graciela', 'Roberto', 'Herminia', 'Jorge', 'Irene', 'Ricardo', 'Jovita', 'Pablo', 'Lidia',
  'Alfonso', 'Magdalena', 'Guillermo', 'Monserrat', 'Hector', 'Natividad', 'Ignacio', 'Ofelia', 'Javier', 'Paulina',
  'Marcelino', 'Quintina', 'Benito', 'Raquel', 'Constancio', 'Salvadora', 'Damiano', 'Teodora', 'Eugenio', 'Urbana'
];

const LAST_NAMES = [
  'Santos', 'Cruz', 'Garcia', 'Rodriguez', 'Martinez', 'Lopez', 'Gonzales', 'Fernandez', 'Rivera', 'Morales',
  'Castillo', 'Diaz', 'Reyes', 'Ramos', 'Flores', 'Villanueva', 'Mendoza', 'Ramirez', 'Gutierrez', 'Ortiz',
  'Salazar', 'Vargas', 'Vega', 'Valenzuela', 'Valencia', 'Valdez', 'Valdez', 'Vargas', 'Vasquez', 'Velez',
  'Vera', 'Vergara', 'Verin', 'Verona', 'Verret', 'Verrette', 'Verreuil', 'Verrier', 'Verrill', 'Versprille'
];

const OCCUPATIONS = [
  'Farmer', 'Vendor', 'Laborer', 'Carpenter', 'Electrician', 'Plumber', 'Mechanic', 'Tailor', 'Cook', 'Housekeeper',
  'Street Vendor', 'Jeepney Driver', 'Tricycle Driver', 'Fisherman', 'Teacher', 'Nurse', 'Government Employee', 'Retired', 'Student', 'Unemployed'
];

const DOCUMENT_TYPES = ['Certificate of Indigency', 'Indigency', 'Barangay Clearance', 'Business Clearance'];

// Helper functions
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function randomName() {
  return `${randomElement(FIRST_NAMES)} ${randomElement(LAST_NAMES)}`;
}

function generateResidentData() {
  const name = randomName();
  const parts = name.split(' ');
  const dob = new Date(
    randomInt(1950, 2010),
    randomInt(0, 11),
    randomInt(1, 28)
  );

  return {
    firstName: parts[0],
    lastName: parts[1],
    dateOfBirth: dob,
    birthPlace: 'Barangay San Isidro',
    sex: randomElement(['male', 'female']),
    civilStatus: randomElement(['single', 'married', 'widowed']),
    religion: 'Catholic',
    ethnicity: 'Bisaya',
    address: {
      purok: randomElement(PUROKS),
      barangay: 'San Isidro',
      municipality: 'San Jose',
      province: 'Antique',
      zipCode: '5706'
    },
    citizenship: 'Filipino',
    occupation: randomElement(OCCUPATIONS),
    sectoralInformation: randomElement(['Solo Parent', 'OFW (Overseas Filipino Worker)', 'PWD (Person with Disability)', 'None']),
    employmentStatus: randomElement(['Unemployed', 'Labor Force']),
    registeredVoter: randomElement([true, false]),
    contact: {
      mobile: `09${randomInt(100000000, 999999999)}`,
      email: `${parts[0].toLowerCase()}.${parts[1].toLowerCase()}@example.com`
    },
    status: 'verified'
  };
}

function generateTransactionId(type, index) {
  const typePrefix = {
    'garbage_fee': 'GARBAGE',
    'streetlight_fee': 'STREETLIGHT',
    'document_request': 'DOC'
  };
  return `${typePrefix[type]}-2025-${String(index).padStart(5, '0')}`;
}

async function seedData() {
  try {
    // Connect to MongoDB
    await db();
    console.log('Connected to MongoDB');

    // Clear existing data
    console.log('Clearing existing data...');
    await Resident.deleteMany({});
    await Household.deleteMany({});
    await GarbagePayment.deleteMany({});
    await StreetlightPayment.deleteMany({});
    await FinancialTransaction.deleteMany({});
    await DocumentRequest.deleteMany({});
    console.log('Cleared existing data');

    // Create or get admin user for createdBy field
    console.log('Creating system admin user...');
    let adminUser = await User.findOne({ username: 'system_admin' });
    if (!adminUser) {
      adminUser = await User.create({
        username: 'system_admin',
        passwordHash: 'system_admin_hash', // This would normally be hashed
        role: 'admin',
        fullName: 'System Administrator',
        contact: {
          email: 'admin@system.local'
        },
        isActive: true,
        isVerified: true
      });
    }
    console.log(`Using admin user: ${adminUser._id}`);
    const adminUserId = adminUser._id;

    // Generate residents and households
    console.log('Generating residents and households...');
    const households = [];
    const allResidents = [];
    let householdCounter = 1;

    for (const purok of PUROKS) {
      for (let i = 0; i < RESIDENTS_PER_PUROK; i++) {
        // Generate household head
        const headData = generateResidentData();
        headData.address.purok = purok;
        const head = await Resident.create(headData);
        allResidents.push(head);

        // Generate 2-4 household members
        const memberCount = randomInt(2, 4);
        const members = [head._id];

        for (let j = 0; j < memberCount - 1; j++) {
          const memberData = generateResidentData();
          memberData.address.purok = purok;
          const member = await Resident.create(memberData);
          allResidents.push(member);
          members.push(member._id);
        }

        // Create household
        const householdId = `HH-${purok.replace(' ', '')}-${String(householdCounter).padStart(4, '0')}`;
        const household = await Household.create({
          householdId,
          headOfHousehold: head._id,
          members,
          address: {
            purok,
            barangay: 'San Isidro',
            municipality: 'San Jose',
            province: 'Antique',
            zipCode: '5706'
          },
          hasBusiness: randomElement([true, false]),
          businessType: randomElement(['', 'Sari-sari Store', 'Tricycle', 'Laundry', 'Carpentry', 'Welding'])
        });

        households.push(household);
        householdCounter++;

        if (i % 50 === 0) {
          console.log(`  Generated ${i} households for ${purok}`);
        }
      }
    }

    console.log(`✓ Generated ${households.length} households and ${allResidents.length} residents`);

    // Generate payment transactions for all months
    console.log('Generating payment transactions...');
    let garbageIndex = 1;
    let streetlightIndex = 1;
    let docIndex = 1;
    let transactionIndex = 1;

    for (const month of MONTHS) {
      console.log(`  Processing month: ${month}`);

      // Generate garbage and streetlight payments
      const selectedHouseholds = households.sort(() => 0.5 - Math.random()).slice(0, TRANSACTIONS_PER_MONTH);

      for (const household of selectedHouseholds) {
        const amountPaid = randomInt(20, 100);
        const totalCharge = 35; // Standard garbage fee

        // Garbage payment
        await GarbagePayment.create({
          household: household._id,
          month,
          totalCharge,
          amountPaid,
          balance: Math.max(0, totalCharge - amountPaid),
          status: amountPaid === 0 ? 'unpaid' : amountPaid >= totalCharge ? 'paid' : 'partial',
          payments: [
            {
              amount: amountPaid,
              method: 'Cash',
              paidAt: new Date(`${month}-15`)
            }
          ]
        });

        // Financial transaction for garbage
        const garbageTransId = generateTransactionId('garbage_fee', garbageIndex++);
        await FinancialTransaction.create({
          transactionId: garbageTransId,
          type: 'garbage_fee',
          category: 'revenue',
          description: `Garbage Collection Fee - ${month}`,
          amount: amountPaid,
          householdId: household._id,
          residentId: household.headOfHousehold,
          residentName: household.headOfHousehold.firstName + ' ' + household.headOfHousehold.lastName,
          paymentMethod: 'Cash',
          status: 'completed',
          transactionDate: new Date(`${month}-15`),
          createdBy: adminUserId
        });

        // Streetlight payment
        const slAmountPaid = randomInt(5, 15);
        const slTotalCharge = 10;

        await StreetlightPayment.create({
          household: household._id,
          month,
          totalCharge: slTotalCharge,
          amountPaid: slAmountPaid,
          balance: Math.max(0, slTotalCharge - slAmountPaid),
          status: slAmountPaid === 0 ? 'unpaid' : slAmountPaid >= slTotalCharge ? 'paid' : 'partial',
          payments: [
            {
              amount: slAmountPaid,
              method: 'Cash',
              paidAt: new Date(`${month}-15`)
            }
          ]
        });

        // Financial transaction for streetlight
        const slTransId = generateTransactionId('streetlight_fee', streetlightIndex++);
        await FinancialTransaction.create({
          transactionId: slTransId,
          type: 'streetlight_fee',
          category: 'revenue',
          description: `Streetlight Collection Fee - ${month}`,
          amount: slAmountPaid,
          householdId: household._id,
          residentId: household.headOfHousehold,
          residentName: household.headOfHousehold.firstName + ' ' + household.headOfHousehold.lastName,
          paymentMethod: 'Cash',
          status: 'completed',
          transactionDate: new Date(`${month}-16`),
          createdBy: adminUserId
        });
      }

      // Generate document requests
      for (let i = 0; i < TRANSACTIONS_PER_MONTH; i++) {
        const randomHousehold = randomElement(households);
        const randomResident = randomElement(allResidents);
        const docType = randomElement(DOCUMENT_TYPES);
        const amount = randomInt(50, 150);

        const docRequest = await DocumentRequest.create({
          residentId: randomResident._id,
          requestedBy: randomResident._id,
          requestFor: randomResident._id,
          documentType: docType,
          quantity: randomInt(1, 3),
          purpose: 'Official Use',
          amount,
          feeAmount: amount,
          status: randomElement(['completed', 'released']),
          requestedAt: new Date(`${month}-10`),
          completedAt: new Date(`${month}-12`)
        });

        // Financial transaction for document request
        const docTransId = generateTransactionId('document_request', docIndex++);
        await FinancialTransaction.create({
          transactionId: docTransId,
          type: 'document_request',
          category: 'revenue',
          description: `${docType} - ${month}`,
          amount,
          residentId: randomResident._id,
          householdId: randomHousehold._id,
          documentRequestId: docRequest._id,
          residentName: randomResident.firstName + ' ' + randomResident.lastName,
          paymentMethod: 'Cash',
          status: 'completed',
          transactionDate: new Date(`${month}-12`),
          createdBy: adminUserId
        });
      }

      console.log(`  ✓ Generated transactions for ${month}`);
    }

    console.log(`✓ Generated all payment and transaction data`);
    console.log('\n=== SEED SUMMARY ===');
    console.log(`Total Households: ${households.length}`);
    console.log(`Total Residents: ${allResidents.length}`);
    console.log(`Months Seeded: ${MONTHS.length}`);
    console.log(`Garbage Transactions: ${garbageIndex - 1}`);
    console.log(`Streetlight Transactions: ${streetlightIndex - 1}`);
    console.log(`Document Requests: ${docIndex - 1}`);
    console.log(`Financial Transactions: ${transactionIndex - 1}`);
    console.log('====================\n');

    console.log('✓ Seed completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
}

// Run the seed
seedData();
