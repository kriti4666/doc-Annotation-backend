import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    color: {
        type: String,
        default: '#FF5733' // Default color for user annotations
    }
}, {
    timestamps: true
});

const User = mongoose.model('User', userSchema);
export default User;

