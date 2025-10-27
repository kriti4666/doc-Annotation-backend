import express from 'express';
import multer from 'multer';
import {
    createOrGetUser,
    uploadDocument,
    getDocuments,
    getDocument,
    createAnnotation,
    getAnnotations,
    deleteAnnotation
} from '../controllers/documentController.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['text/plain', 'application/pdf'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only text and PDF files are allowed.'));
        }
    }
});

// Create uploads directory if it doesn't exist
import fs from 'fs';
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

// Routes
router.post('/user', createOrGetUser);
router.post('/upload', upload.single('file'), uploadDocument);
router.get('/documents', getDocuments);
router.get('/document/:id', getDocument);
router.post('/annotation', createAnnotation);
router.get('/annotations/:documentId', getAnnotations);
router.delete('/annotation/:id', deleteAnnotation);

export default router;


