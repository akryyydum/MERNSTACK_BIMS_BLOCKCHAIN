const UnverifiedResident = require('../models/unverifiedResident.model');
const Resident = require('../models/resident.model');
const User = require('../models/user.model');

// List all unverified resident submissions
async function list(req, res) {
  try {
    const submissions = await UnverifiedResident.find().populate('user', 'username contact fullName isVerified isActive');
    res.json({ data: submissions });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
}

// Approve an unverified submission: move to Resident model
async function approve(req, res) {
  try {
    const { id } = req.params;
    const submission = await UnverifiedResident.findById(id);
    if (!submission) return res.status(404).json({ message: 'Unverified submission not found' });

    // Safety: ensure user still exists
    const user = await User.findById(submission.user);
    if (!user) return res.status(400).json({ message: 'Linked user account missing' });

    // Prevent creating duplicate resident if somehow created meanwhile
    const existingResident = await Resident.findOne({ user: user._id });
    if (existingResident) {
      // Delete stale unverified entry
      await submission.deleteOne();
      return res.status(200).json({ message: 'Resident already exists; removed stale unverified entry.' });
    }

    const resident = await Resident.create({
      user: user._id,
      firstName: submission.firstName,
      middleName: submission.middleName,
      lastName: submission.lastName,
      suffix: submission.suffix,
      dateOfBirth: submission.dateOfBirth,
      birthPlace: submission.birthPlace,
      sex: submission.sex,
      civilStatus: submission.civilStatus,
      religion: submission.religion,
      ethnicity: submission.ethnicity,
      address: submission.address,
      citizenship: submission.citizenship,
      occupation: submission.occupation,
      sectoralInformation: submission.sectoralInformation,
      employmentStatus: submission.employmentStatus,
      registeredVoter: submission.registeredVoter,
      contact: submission.contact,
      status: 'pending'
    });

    // Delete original unverified entry
    await submission.deleteOne();

    res.status(201).json({ message: 'Submission approved and resident record created (pending verification).', resident });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
}

// Reject & delete an unverified submission
async function reject(req, res) {
  try {
    const { id } = req.params;
    const submission = await UnverifiedResident.findById(id);
    if (!submission) return res.status(404).json({ message: 'Unverified submission not found' });
    await submission.deleteOne();
    res.json({ message: 'Submission rejected and removed.' });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
}

module.exports = { list, approve, reject };
