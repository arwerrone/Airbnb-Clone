const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema ({
    roomTitle: {type: String, required: true},
    price: {type: Number, required: true},
    desc: {type: String, required: true},
    location: {type: String, required: true},
    photo: {type: String, required: true}
});

const userModel = mongoose.model("quartos", userSchema);

module.exports = userModel;
