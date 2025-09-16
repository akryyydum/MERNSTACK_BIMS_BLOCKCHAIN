const express = require('express');
const crypto = require('crypto');
const multer = require('multer');
const Document = require('../models/publicdocs.model');
const fabricService = require('../services/fabricService');

const router = express.Router();

router.post('/upload', multer().single('file'), async (req, res) => {
    try{
        const fiileBuffer = require('fs').readFileSync(req.file.path);
        const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

        const newDoc = new Document({
            title: req.body.title,
            filename: req.file.originalname,
            uri: req.file.path,
            hash: hash,
        }); 

        await newDoc.save();

        await fabricService.storeDocument(newDoc._id.toString(), newDoc.title, newDoc.hash, newDoc.uri);

        res.status(201).json({ message: 'Document uploaded successfully in blockchain!', document: newDoc });
    } catch (error) {
        console.error('Error uploading document:', error);
        res.status(500).json({ message: 'Error uploading document', error: error.message });
    }
});

router.get('/', async (req, res) => {
    const docs = await Document.find();
    res.json(docs);
});

module.exports = router;
