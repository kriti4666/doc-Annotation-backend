import Document from '../models/Document.js';
import Annotation from '../models/Annotation.js';
import User from '../models/User.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { createRequire } from 'module';

// Use pdfjs-dist for better PDF parsing
const require = createRequire(import.meta.url);
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

// Set worker path
pdfjs.GlobalWorkerOptions.workerSrc = 'pdfjs-dist/build/pdf.worker.min.mjs';



const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create or get user
export const createOrGetUser = async (req, res) => {
    try {
        const { username, email } = req.body;
        
        let user = await User.findOne({ email });
        if (!user) {
            user = await User.create({ username, email });
        }
        
        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};



// Upload document
export const uploadDocument = async (req, res) => {
    try {
        const { userId } = req.body;
        const file = req.file;
        console.log(file);
        
        if (!file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        let content = '';
        const fileType = file.mimetype === 'application/pdf' ? 'pdf' : 'text';
        

        if (fileType === 'pdf') {
            try {
                const dataBuffer = fs.readFileSync(file.path);
                
                // Load the PDF document
                const loadingTask = pdfjs.getDocument({
                    data: new Uint8Array(dataBuffer),
                    verbosity: 0 // Suppress logging
                });
                
                const pdfDocument = await loadingTask.promise;
                
                // Extract text from all pages
                let fullText = '';
                for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
                    const page = await pdfDocument.getPage(pageNum);
                    const textContent = await page.getTextContent();
                    const pageText = textContent.items
                        .map(item => item.str)
                        .join(' ');
                    fullText += pageText + '\n';
                }
                
                content = fullText;
                
            } catch (pdfError) {
                console.error('Error parsing PDF:', pdfError);
                throw new Error(`Failed to parse PDF: ${pdfError.message}`);
            }
        } else {
            content = fs.readFileSync(file.path, 'utf-8');
        }

        // Delete the uploaded file after reading
        fs.unlinkSync(file.path);

        const document = await Document.create({
            filename: file.filename,
            originalName: file.originalname,
            fileType,
            content,
            uploadedBy: userId
        });

        res.status(201).json(document);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get all documents
export const getDocuments = async (req, res) => {
    try {
        const documents = await Document.find()
            .populate('uploadedBy', 'username email')
            .sort({ createdAt: -1 });
        
        res.status(200).json(documents);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get single document with annotations
export const getDocument = async (req, res) => {
    try {
        const { id } = req.params;
        
        const document = await Document.findById(id)
            .populate('uploadedBy', 'username email');
        
        if (!document) {
            return res.status(404).json({ message: 'Document not found' });
        }

        // Get annotations efficiently (with pagination for large datasets)
        const page = parseInt(req.query.page) || 1;
        const limit = 100; // Limit annotations per request for performance
        const skip = (page - 1) * limit;

        const annotations = await Annotation.find({ documentId: id })
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip(skip);

        res.status(200).json({
            document,
            annotations,
            totalAnnotations: document.annotationCount,
            page,
            totalPages: Math.ceil(document.annotationCount / limit)
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Create annotation
export const createAnnotation = async (req, res) => {
    try {
        const { documentId, userId, selectedText, comment, startIndex, endIndex } = req.body;

        // Create hash for the range to prevent duplicates
        const rangeHash = crypto.createHash('md5')
            .update(`${documentId}-${userId}-${startIndex}-${endIndex}`)
            .digest('hex');

        const user = await User.findById(userId);
        
        const annotation = await Annotation.create({
            documentId,
            userId,
            username: user.username,
            userColor: user.color,
            selectedText,
            comment,
            startIndex,
            endIndex,
            rangeHash
        });

        // Update document annotation count
        await Document.findByIdAndUpdate(documentId, {
            $inc: { annotationCount: 1 }
        });

        res.status(201).json(annotation);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Duplicate annotation detected' });
        }
        res.status(500).json({ message: error.message });
    }
};

// Get annotations for a document (paginated)
export const getAnnotations = async (req, res) => {
    try {
        const { documentId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = 100;
        const skip = (page - 1) * limit;

        const annotations = await Annotation.find({ documentId })
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip(skip);

        const total = await Annotation.countDocuments({ documentId });

        res.status(200).json({
            annotations,
            total,
            page,
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Delete annotation
export const deleteAnnotation = async (req, res) => {
    try {
        const { id } = req.params;
        
        const annotation = await Annotation.findByIdAndDelete(id);
        
        if (!annotation) {
            return res.status(404).json({ message: 'Annotation not found' });
        }

        // Update document annotation count
        await Document.findByIdAndUpdate(annotation.documentId, {
            $inc: { annotationCount: -1 }
        });

        res.status(200).json({ message: 'Annotation deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


