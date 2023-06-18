if (process.env.NODE_ENV !== "production") {
    require('dotenv').config();
}
const {storage}=require("./cloudinary")
const multer  = require('multer')
const upload = multer({ storage })
const mbxGeocoding = require("@mapbox/mapbox-sdk/services/geocoding");
const mapBoxToken = process.env.MAPBOX_TOKEN;
const geocoder = mbxGeocoding({ accessToken: mapBoxToken });
const express = require('express');
const mongoose = require('mongoose');
const methodOverride=require('method-override');
const path = require('path');
const ejsMate = require('ejs-mate');
const { campgroundSchema,reviewSchema } = require('./schemas.js');
const catchAsync = require('./utils/catchAsync');
const session = require('express-session');
const ExpressError = require('./utils/ExpressError');
const Campground = require("./models/campground");
const Review = require('./models/review');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const User = require('./models/user');
const {isLoggedIn}=require("./middleware.js")
const dburl=process.env.DB_URL;
const MongoDBStore=require('connect-mongo')(session);

mongoose.connect(dburl);
const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
    console.log("Database connected");
});

const app=express();
app.engine('ejs',ejsMate);
app.set('view engine','ejs');
app.set('views',path.join(__dirname,'views'));
app.use(express.urlencoded({extended:true}));
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')))

const store = new MongoDBStore({
    url: dburl,
    secret: 'thisshouldbeabettersecret!',
    touchAfter: 24 * 60 * 60
});
const sessionConfig = {
    store,
    secret: 'thisshouldbeabettersecret!',
    resave: false,
    saveUninitialized: true,
    cookie: {
        httpOnly: true,
        expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
        maxAge: 1000 * 60 * 60 * 24 * 7
    }
}
app.use(session(sessionConfig))
// app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => {
    console.log(req.session)
    res.locals.currentUser = req.user;
    // res.locals.success = req.flash('success');
    // res.locals.error = req.flash('error');
    next();
})

app.listen(8080,()=>{
    console.log("LISTENING PORT 3000!");
})

const validateCampground = (req, res, next) => {
    const { error } = campgroundSchema.validate(req.body);
    if (error) {
        const msg = error.details.map(el => el.message).join(',')
        throw new ExpressError(msg, 400)
    } else {
        next();
    }
}

const validateReview = (req, res, next) => {
    const { error } = reviewSchema.validate(req.body);
    if (error) {
        const msg = error.details.map(el => el.message).join(',')
        throw new ExpressError(msg, 400)
    } else {
        next();
    }
}

app.get('/', (req, res) => {
    res.render('home')
});
app.get('/campgrounds', catchAsync(async (req, res) => {
    const campgrounds = await Campground.find({});
    res.render('campgrounds/index', { campgrounds })
}));

app.get('/campgrounds/new', isLoggedIn, (req, res) => {
    res.render('campgrounds/new');
})

app.get("/register",(req,res)=>{
    // res.send("hello gauttam");
    res.render("users/register");
})
app.post("/register",async (req,res,next)=>{
    // res.send(req.body)
    const { email, username, password } = req.body;
    const user = new User({ email, username });
    const registeredUser = await User.register(user, password);
    req.logIn(registeredUser,(err)=>{
        console.log("hello moto njnkf");
        if(err){
            return next(err);
        }
        res.redirect("/campgrounds");
    })
    
    // res.render("users/register");
})

// login user

app.get('/login', (req, res) => {
    res.render('users/login');
})

app.post('/login', passport.authenticate('local', { failureRedirect: '/login' }), (req, res) => {
    // req.flash('success', 'welcome back!');
    // const redirectUrl = req.session.returnTo || '/campgrounds';
    // delete req.session.returnTo;
    res.redirect("/campgrounds");
})

//logout user

app.get('/logout', (req, res, next) => {
    req.logout(function (err) {
        if (err) {
            return next(err);
        }
        console.log("successfully logged out")
        // req.flash('success', 'Goodbye!');
        res.redirect('/campgrounds');
    });
}); 

app.post('/campgrounds', isLoggedIn, (upload.array('image',12)),validateCampground, catchAsync(async (req, res, next) => {
    const geoData = await geocoder.forwardGeocode({
        query: req.body.campground.location,
        limit: 1
    }).send()
    const campground = new Campground(req.body.campground);
    campground.geometry = geoData.body.features[0].geometry;
    campground.images= req.files.map((f)=>({url:f.path, filename: f.filename}))
    campground.author = req.user._id;
    await campground.save();
    res.redirect(`/campgrounds/${campground._id}`)
}))

// app.post('/campgrounds',(upload.single('image')),(req,res)=>{
//     res.send(req.body);
//     console.log(req.body,req.file);
// })
app.get('/campgrounds/:id', catchAsync(async (req, res,) => {
    const campground = await Campground.findById(req.params.id).populate({ 
        path:'reviews',
        populate: { path: 'author' }
        }).populate('author');
    console.log(campground);
    res.render('campgrounds/show', { campground });
}));

app.get('/campgrounds/:id/edit', catchAsync(async (req, res) => {
    const campground = await Campground.findById(req.params.id)
    res.render('campgrounds/edit', { campground });
}))

app.put('/campgrounds/:id', isLoggedIn ,(upload.array('image')), validateCampground, catchAsync(async (req, res) => {
    const { id } = req.params;
    console.log(req.body);
    const geoData = await geocoder.forwardGeocode({
        query: req.body.campground.location,
        limit: 1
    }).send()
    const campground = await Campground.findByIdAndUpdate(id, { ...req.body.campground });
    const img=req.files.map((f)=>({url:f.path, filename: f.filename}));
    campground.images.push(...img); 
    campground.geometry = geoData.body.features[0].geometry;
    await campground.save();
    if (req.body.deleteImages) {
        await campground.updateOne({ $pull: { images: { filename: { $in: req.body.deleteImages } } } })
    }
    res.redirect(`/campgrounds/${campground._id}`)
}));

app.delete('/campgrounds/:id', catchAsync(async (req, res) => {
    const { id } = req.params;
    await Campground.findByIdAndDelete(id);
    res.redirect('/campgrounds');
}));

app.post('/campgrounds/:id/reviews', validateReview, catchAsync(async (req, res) => {
    const campground = await Campground.findById(req.params.id);
    const review = new Review(req.body.review);
    review.author = req.user._id;
    campground.reviews.push(review);
    await review.save();
    await campground.save();
    res.redirect(`/campgrounds/${campground._id}`);
}))

app.delete('/campgrounds/:id/reviews/:reviewId',isLoggedIn, catchAsync(async (req, res) => {
    const { id, reviewId } = req.params;
    await Campground.findByIdAndUpdate(id, { $pull: { reviews: reviewId } });
    await Review.findByIdAndDelete(reviewId);
    res.redirect(`/campgrounds/${id}`);
}))

app.all('*', (req, res, next) => {
    next(new ExpressError('Page Not Found', 404))
})

app.use((err, req, res, next) => {
    const { statusCode = 500 } = err;
    if (!err.message) err.message = 'Oh No, Something Went Wrong!'
    res.status(statusCode).render('error', { err })
})


app.listen(3000, () => {
    console.log('Serving on port 3000')
})