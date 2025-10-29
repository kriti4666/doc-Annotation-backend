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

app.use(cors({
  origin: "https://radiant-puffpuff-b52614.netlify.app",
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

app.use(bodyParser.json({ extended: true }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/', Route);

const io = new Server(httpServer, {
  cors: {
    origin: "https://radiant-puffpuff-b52614.netlify.app",
    methods: ["GET", "POST"]
  }
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-document', (documentId) => {
    socket.join(documentId);
    console.log(`User ${socket.id} joined document ${documentId}`);
  });

  socket.on('leave-document', (documentId) => {
    socket.leave(documentId);
    console.log(`User ${socket.id} left document ${documentId}`);
  });

  socket.on('new-annotation', async (annotationData) => {
    try {
      const annotation = await Annotation.create(annotationData);
      await Document.findByIdAndUpdate(annotationData.documentId, {
        $inc: { annotationCount: 1 }
      });
      io.to(annotationData.documentId).emit('annotation-added', annotation);
    } catch (error) {
      socket.emit('annotation-error', { message: error.message });
    }
  });

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

const PORT = process.env.PORT || 8000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
