##Blockchain-Based Barangay Management System (MERN + Hyperledger)

A secure and decentralized Barangay Management System built with MERN stack and Hyperledger Fabric, designed to manage resident data, document requests, and approvals with transparency and immutability.

Table of Contents

Project Overview

Features

Technologies Used

System Architecture

Setup Instructions

Usage

Contributing

License

Project Overview

This system modernizes barangay operations using blockchain technology to secure and verify all transactions. Built on the MERN stack, it provides a responsive web interface and integrates Hyperledger Fabric to ensure that resident records and document requests are tamper-proof, auditable, and secure.

Key goals:

Reduce manual paperwork and streamline processes.

Ensure data integrity using blockchain.

Provide a user-friendly system for residents and barangay officials.

Features

Resident Registration: Add and manage residents with complete personal and contact information.

Verification System: Officials can verify or reject residents.

Document Requests: Submit, process, and track requests for certificates.

Notification System: Automatically notify residents when documents are ready.

Admin Dashboard: View statistics, reports, and summaries.

Blockchain Ledger: All actions recorded securely on Hyperledger Fabric for auditability.

Technologies Used

Frontend: React.js (with MUI or Ant Design)

Backend: Node.js + Express.js

Database: MongoDB

Blockchain Framework: Hyperledger Fabric

Containerization: Docker & Docker Compose

Version Control: Git & GitHub

System Architecture
[React Frontend] <---> [Express + Node.js Backend] <---> [Hyperledger Fabric Network]
                             |
                             v
                         [MongoDB Database]


Hyperledger Fabric: Manages immutable ledger operations.

Express Backend: Handles REST API requests, authentication, and blockchain interactions.

React Frontend: Provides a responsive and user-friendly interface.
