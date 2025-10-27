import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import Connection from './database/db.js';
import Route from './routes/route.js';
import cors from 'cors';
import bodyParser from 'body-parser';
import Annotation from './models/Annotation.js';
import Document from './models/Document.js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(bodyParser.json({extended: true}));
app.use(bodyParser.urlencoded({extended: true}));
app.use('/', Route);

// Socket.io for real-time collaboration
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Join a document room
    socket.on('join-document', (documentId) => {
        socket.join(documentId);
        console.log(`User ${socket.id} joined document ${documentId}`);
    });

    // Leave a document room
    socket.on('leave-document', (documentId) => {
        socket.leave(documentId);
        console.log(`User ${socket.id} left document ${documentId}`);
    });

    // Handle new annotation
    socket.on('new-annotation', async (annotationData) => {
        try {
            // Create annotation in database
            const annotation = await Annotation.create(annotationData);
            
            // Update document annotation count
            await Document.findByIdAndUpdate(annotationData.documentId, {
                $inc: { annotationCount: 1 }
            });

            // Broadcast to all users in the document room
            io.to(annotationData.documentId).emit('annotation-added', annotation);
        } catch (error) {
            socket.emit('annotation-error', { message: error.message });
        }
    });

    // Handle annotation deletion
    socket.on('delete-annotation', async ({ annotationId, documentId }) => {
        try {
            const annotation = await Annotation.findByIdAndDelete(annotationId);
            
            if (annotation) {
                await Document.findByIdAndUpdate(documentId, {
                    $inc: { annotationCount: -1 }
                });
                
                io.to(documentId).emit('annotation-deleted', { annotationId });
            }
        } catch (error) {
            socket.emit('annotation-error', { message: error.message });
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

Connection();

const PORT = 8000;
httpServer.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});