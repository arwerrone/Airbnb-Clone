const dotenv = require('dotenv').config();
const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const { check, validationResult, body } = require("express-validator");
const nodemailer = require("nodemailer");
const exphbs = require('express-handlebars');
const flash = require('connect-flash');
const session = require('express-session');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const User = require('./model/user');
const cookieParser = require('cookie-parser');
const Room = require('./model/room');
const multer = require('multer');

//////////////////DEFINE STORAGE FOR IMG
const storage = multer.diskStorage({
    destination: function(request, file, callback) {
        callback(null, './public/uploads/images')
    },

    filename:function(request, file, callback){
        callback(null, Date.now() + file.originalname);
    },
});

/////////////upload parameters for multer
const upload = multer({
    storage: storage,
    limits: {
      fieldSize: 1024 * 1024 * 100,
    },
});

/////////////////MONGO CONNECT///////////
const DBUSER = process.env.MONGOUSER;
const DBPASS= process.env.MONGOPASS;
const DBAT= process.env.MONGOAT;

mongoose.connect('mongodb+srv://'+DBUSER+':'+DBPASS+'@'+DBAT);

/////////////////////////////////////////////////////////////
const HTTP_PORT = process.env.PORT || 8080;

function onHttpStart(){
    console.log("Express server is running " + HTTP_PORT);
}

app.use(express.static('public'));
app.use('/css', express.static(__dirname + 'public/css'));
app.use('/img', express.static(__dirname + 'public/img'));
///////session
app.use(session({key: "user_sid", secret: process.env.SECRETT, 
    resave: false,
    saveUninitialized: false,
    cookie: {
        expires: 600000,
    },
}));

app.use(flash());
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// view
app.engine('.hbs', exphbs({ extname: '.hbs', layout: false }));
app.set('view engine', '.ejs');
//
const urlencodedParser = bodyParser.urlencoded({ extended: false});


//ROTAS
app.get('/', (req, res) =>{
    ok = false;
    if(req.session.user){
        ok = true;
    }
    res.render(__dirname + '/views/index.ejs',{ok});
});

app.get('/room', async (req, res) =>{
    isadmin=false;
    ok = false;
    if(req.session.user){
        ok = true;
    }

    //assignment4
    let admUser = req.session.user;
    let userr = await User.find();
    let rooms = await Room.find();
    if(admUser){
        if(admUser.admin){
            res.render(__dirname + '/views/room.ejs', {ok, isadmin, room: rooms, user: admUser});
        }else{
            res.render(__dirname + '/views/room.ejs', {ok, isadmin, room: rooms, user: admUser});
        }
    }
    else{
        res.render(__dirname + '/views/room.ejs', {ok, isadmin, room: rooms, user: userr});
    }
});

app.get('/singup', (req, res) =>{
    res.render(__dirname + '/views/singup.ejs');
});

app.get('/logout', (req, res) =>{
    if (req.session.user){
        res.clearCookie("user_sid");
        res.redirect("/");
    }
});

// validacao LOGIN
app.post('/login', urlencodedParser, [

//CHECKING FOR NULL
    check('password', 'LOGIN: Please put a password')
    .exists({checkFalsy: true}),

    check('email_z', 'LOGIN: Please put an e-mail')
    .exists({checkFalsy: true}),
//////////////////////

    check('email_z', 'LOGIN: Invalid e-mail')
        .isEmail().normalizeEmail()


], async (req, res) =>{
    
    const errors = validationResult(req);
    if(!errors.isEmpty()){
        //return res.status(422).jsonp(errors.array())
        const alert = errors.array();
        res.render('singup', {
            alert
        });
    }
    else{
           //ASSIGNMENT 3:

        var eemail = req.body.email_z,
        password = req.body.password;

        ok = false;

        var user = await User.findOne({ email: eemail }).exec();

        if(!user) {
            ok = "User not found! ヽ(。_°)ノ";
            res.render('singup',{ok});
        }
        user.comparePassword(password, (error, match) => {
            if(!match) {
            ok = "Wrong Password! (╯°□°）╯︵ ┻━┻";
            res.render('singup',{ok});
            }
        });

        req.session.user = user;

        if (user.admin){
            res.render(__dirname + '/views/admindashboardlogin.ejs', {user});
        }
        else{
            res.render(__dirname + '/views/dashboardlogin.ejs', {user});
        }

    }
 

});

// VALIDACAO REGISTER

let d = new Date();
let year = d.getFullYear();
let month = d.getMonth();
let day = d.getDate();
let totss = new Date(year - 18, month, day).toDateString();

app.post('/register', urlencodedParser, [

//CHECK FOR NULL

    check('password1', 'REGISTER: Please put a Password')
    .exists({checkFalsy: true}),

    check('email1', 'REGISTER: Please put an e-mail')
    .exists({checkFalsy: true}),

    check('firstName', 'REGISTER: Please put a First Name')
    .exists({checkFalsy: true}),

    check('lastName', 'REGISTER: Please put a Last Name')
    .exists({checkFalsy: true}),

    check('birthday', 'REGISTER: Please put a Birth Date')
    .exists({checkFalsy: true}),
////////

    check('password1', 'REGISTER: Password must be at least 6 characters long' )
        .isLength({ min: 6}),

    check('password1', 'REGISTER: Password must have at least ONE uppercase')
        .matches(/(?=.*[A-Z])/),

    check('password1', 'REGISTER: Password must have ONE low character and number')
        .matches(/(?=.*\d)(?=.*[a-z])/),

    check('email1', 'REGISTER: Invalid e-mail')
        .isEmail().normalizeEmail(),

    check('firstName', 'REGISTER: Invalid First Name, only letters is allowed, minimum 2 characters')
        .isAlpha().isLength({ min: 2 }),

    check('lastName', 'REGISTER: Invalid Last Name, only letters is allowed, minimum 2 characters')
        .isAlpha().isLength({ min: 2 }),

    check('birthday', 'REGISTER: You must be at least 18 years old to create an account')
        .isBefore(totss)

], (req, res) => {

    const errors = validationResult(req);
    if(!errors.isEmpty()){
        const alert = errors.array();
        res.render('singup', {
            alert
        });
    }
    else{
        //
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL,
                pass: process.env.PASSWORD
            }
        });

        let mailOption = {
            from: process.env.EMAIL,
            to: req.body.email1,
            subject: "Airbnbclone Account Created Sucessfully",
            text: 'Hello ' +req.body.firstName+',\nyour account has been created.\nYour password is: '+req.body.password1
        };

        //ASSIGNMENT 3:
        
            var registerUser = new User({
                email: req.body.email1,
                password: req.body.password1,
                fistName: req.body.firstName,
                lastName: req.body.lastName,
                admin: false
            });
            ok = false;
            registerUser.save((err) =>{
                if(err){
                    console.log("\n\nThere was a problem creating account :c \n\n");
                    if(err.code === 11000){
                        ok = "E-mail already in use! (°^°)";
                        res.render('singup',{ok});
                    }
                } 
                else{
                    transporter.sendMail(mailOption, function(err, data){
                        if(err){
                            console.log("Something went wrong :(", err);
                        }else{
                            console.log("Email sent!");
                        }
                    });
                    console.log("\n\nAccount created sucessfully :D\n\n");
                    res.render(__dirname + '/views/dashboard.hbs', {data: req.body, layout: false});
                }
            });

    }

});

///////////ASSIGNMENT 4
//////////////CREATE ROOM
app.get('/createroom', async (req, res) =>{
    let commUser = req.session.user;
    isadmin = false;
    ok = false;
    if(commUser){
        ok = true;
    }

    let rooms = await Room.find();
    let userr = await User.find();
    if(commUser){
        if(commUser.admin){
            res.render(__dirname + '/views/createroom.ejs');
        }
        else{
            isadmin = "Only admin is allowed to create room!";
            res.render(__dirname + '/views/room.ejs', {isadmin, room: rooms, user: userr});
        }
    }else {
        isadmin = "You must be logged in!";
        res.render(__dirname + '/views/room.ejs', {isadmin, room: rooms, user: userr});
    }
});

app.post('/createRoom',upload.single('image') ,(req, res) => {
    var createRoom = new Room({
        roomTitle: req.body.rtitle,
        price: req.body.price,
        desc: req.body.desc,
        location: req.body.location,
        photo: req.file.filename
    });
    createRoom.save((err) =>{
        if(err){
            console.log("\nSomething went wrong creating room :c\n");
        }else{
            console.log("\nRoom Created Successfully :D\n");
            res.render(__dirname + '/views/createroom.ejs');
        }
    });
});

/////////UPADTE ROOM
app.get('/editroom/:_id', async (req,res) =>{
    let room = await Room.findById(req.params._id);
    res.render(__dirname + '/views/editroom.ejs', {roo: room});
});

app.post('/updateroom/:_id', (req,res) =>{

    Room.updateOne(
        { _id: req.params._id},
        { $set: {
            roomTitle: req.body.rtitle,
            price: req.body.price,
            desc: req.body.desc,
            location: req.body.location
        } }
    ).exec();
    res.redirect("/room");
});
/////////////DELETE ROOM
app.get('/deleteroom/:_id', (req,res) =>{

    Room.deleteOne({ _id: req.params._id }).exec()
    .then(() => {
        console.log("\nRoom Deleted\n");
    }).catch((err) => {
        console.log(err);
    });
    res.redirect("/room");
});
///////////////SEARCH BAR
app.post('/search', async (req,res) =>{
    isadmin=false;
    ok = false;
    if(req.session.user){
        ok = true;
    }
    let admUser = req.session.user;
    let userr = await User.find();

    let loc = req.body.location;

    if(loc == "Anywhere"){
        var rooms = await Room.find();
    }else{
        var rooms = await Room.find({ location: loc });
    }

    if(admUser){
        if(admUser.admin){
            res.render(__dirname + '/views/room.ejs', {ok, isadmin, room: rooms, user: admUser});
        }else{
            res.render(__dirname + '/views/room.ejs', {ok, isadmin, room: rooms, user: admUser});
        }
    }
    else{
        res.render(__dirname + '/views/room.ejs', {ok, isadmin, room: rooms, user: userr});
    }

});

///////////////ASSIGNMENT 5
app.get('/viewroom/:_id', async (req,res) =>{
    let total = 0;
    let room = await Room.findById(req.params._id);

    let commUser = req.session.user;
    loggedd = false;
    if(commUser){
        loggedd = true;
    }
    res.render(__dirname + '/views/viewroom.ejs', {loggedd, roo: room, tot: total});
});

app.post('/calculatetotal/:_id', async (req, res) =>{
    const oneDay = 1000 * 60 * 60 * 24;
    const din = req.body.dateIN;
    const dout = req.body.dateOUT;
    const date1 = new Date(din);
    const date2 = new Date(dout);
    const difftime = date2.getTime() - date1.getTime();
    const diffday = Math.round(difftime / oneDay);

    let room = await Room.findById(req.params._id);
    let total = room.price * diffday;
    loggedd = false;
    res.render(__dirname + '/views/viewroom.ejs', { loggedd, roo: room, tot: total});
});

app.post('/book/:_id', async (req,res) =>{
    let room = await Room.findById(req.params._id);
    let total = 0;
    let commUser = req.session.user;
    loggedd = false;
    if(commUser){
        loggedd = true;
    }

    if(commUser){
        const oneDay = 1000 * 60 * 60 * 24;
        const persons = req.body.guest;
        const din = req.body.chekindate;
        const dout = req.body.checkoutdate;
        const date1 = new Date(din);
        const date2 = new Date(dout);
        const difftime = date2.getTime() - date1.getTime();
        const diffday = Math.round(difftime / oneDay);
        const total = room.price * diffday;

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL,
                pass: process.env.PASSWORD
            }
        });

        let mailOption = {
            from: process.env.EMAIL,
            to: commUser.email,
            subject: "Airbnb room booked sucessfully",
            text: 'Hello ' +commUser.fistName+',\nyou booked: '+room.roomTitle+'\nFor '+persons+'person during '+diffday+' days\nTotal price: $'+total
        };

        transporter.sendMail(mailOption, function(err, data){
            if(err){
                console.log("Something went wrong :(", err);
            }else{
                console.log("Email sent!");
            }
        });
        res.render(__dirname + '/views/booked.ejs');

    }else {
        res.render(__dirname + '/views/viewroom.ejs', { loggedd, roo: room, tot: total});
    }

});

app.listen(HTTP_PORT, onHttpStart);