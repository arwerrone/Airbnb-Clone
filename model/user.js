const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const Schema = mongoose.Schema;


const userSchema = new Schema ({
    email: {type: String, required: true, unique: true},
    password: {type: String, required: true},
    fistName: {type: String, required: true},
    lastName: {type: String},
    admin: {type: Boolean}
});

userSchema.methods.comparePassword = function(txt, callback) {
    return callback(null, bcrypt.compareSync(txt, this.password));
};

userSchema.pre("save", function(next) {
    this.password = bcrypt.hashSync(this.password, 10);
    next();
});

const userModel = mongoose.model("usuario", userSchema);

module.exports = userModel;
