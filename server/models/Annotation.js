import mongoose from 'mongoose';

const annotationSchema = new mongoose.Schema({
    documentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Document',
        required: true,
        index: true // Index for faster queries
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    username: {
        type: String,
        required: true
    },
    userColor: {
        type: String,
        default: '#FF5733'
    },
    selectedText: {
        type: String,
        required: true
    },
    comment: {
        type: String,
        required: true
    },
    startIndex: {
        type: Number,
        required: true
    },
    endIndex: {
        type: Number,
        required: true
    },
    // Unique identifier for the text range to prevent duplicates
    rangeHash: {
        type: String,
        required: true,
        index: true
    }
}, {
    timestamps: true
});

// Compound index to prevent duplicate annotations for same range by same user
annotationSchema.index({ documentId: 1, userId: 1, rangeHash: 1 }, { unique: true });

const Annotation = mongoose.model('Annotation', annotationSchema);
export default Annotation;

