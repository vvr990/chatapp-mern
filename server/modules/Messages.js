const mongoose = require('mongoose');

const messageSchema = mongoose.Schema({
    conversationId: {
        type: String,
        required: true,
    },
    senderId:{
        type:String
    },
    message:{
        type:String
    }
});

const Users = mongoose.model('Message', messageSchema);

module.exports = Users;