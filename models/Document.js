import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema({
    filename: {
        type: String,
        required: true
    },
    originalName: {
        type: String,
        required: true
    },
    fileType: {
        type: String,
        required: true,
        enum: ['text', 'pdf']
    },
    content: {
        type: String,
        required: true
    },
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    annotationCount: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Index for faster queries
documentSchema.index({ uploadedBy: 1, createdAt: -1 });

const Document = mongoose.model('Document', documentSchema);
export default Document;

