const express = require('express');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const multer = require('multer');

const UserLogin = require('../models/userModel')
const messages_model = require('../models/messages')
const reviews_model = require('../models/reviews')
const comments_model = require('../models/comments')
const offers_model = require('../models/offers')
const conversations_model = require('../models/conversations');
const userModel = require('../models/userModel');
const router = express.Router();

// Upload images with Multer
const storage = multer.diskStorage({
    destination(req, file, cb) {
        cb(null, './public/uploads/');
    },
    filename(req, file, cb) {
        let mimeType = file.mimetype.split('/');
        let fileType = mimeType.pop();
        
        cb(null, Date.now() + "." + fileType);
    }
})

const upload = multer({ 
    storage: storage,
    fileFilter(req, file, cb) {
        if (file.mimetype == "image/jpg" || file.mimetype == "image/jpeg" || file.mimetype == "image/png") {
            cb(null, true);
        } else {
            console.log("Filetype not supported.");
            cb(null, false);
        }
    }
});

// Routes
// Renders the home page
router.get('/', async (req, res) => {
    if (!req.session.loggedin) res.render('index', { title: 'Home', loggedIn: false })
    else res.render('index', { title: 'Home', loggedIn: true })
})

//Renders the chat with conversation id specified in URL
router.get('/chat', async (req, res) => {
    try{
        if (req.session.loggedin){
            var currentconvoid = 0;
            var currentConvo = [0];
            var messages = 0;
            //Retrieve all conversations for the current user
            const existingconvos = await conversations_model.find({
                $or: [{person1: req.session.name},{person2: req.session.name}]
            })
            if (existingconvos.length != 0){
                //If no conversation, specified, the first one is selected
                if (req.query.keyword == "No_convo"){
                    currentconvoid = existingconvos[0]._id
                }
                //Otherwise display specified conversation
                else{
                    currentconvoid = req.query.keyword;
                }
                //Obtain required conversation and its messages
                currentConvo = await conversations_model.find({"_id" : currentconvoid})
                messages = await messages_model.find({"conversation_id" : currentconvoid})
                //Show oldest messages first
                messages.reverse()
            }
            res.render('chat', { title: 'Chat', heading: 'Chat', loggedIn: true, username: req.session.name, convos: existingconvos, 
            currentconvo: currentConvo[0], messages: messages});
        }
        else{
            res.redirect('/login');
        };
    }
    catch (error) {
        console.error('Error executing query:', error);
        res.redirect('/');
    };
})
//Route for when user types a user and clicks the new chat buttobn
router.post('/new_chat', async (req, res)=> {
	try {
        receiver = req.body.chat_receiver;
        username = req.body.username;
        //We only create a new conversation if destination username exists and its not the user's
        const receiverexist = await UserLogin.find({"username": receiver})
        if (receiverexist.length != 0 && username != receiver){
            //Check if a conversation between the two uers exists already
            const existingconvo = await conversations_model.find({
                $or: [
                    {
                        $and: [
                            {"person1": receiver},
                            {"person2": username}
                        ]
                    },
                    {
                        $and: [
                            {"person1": username},
                            {"person2": receiver}
                        ]
                    }
                ]
            })
            //If no conversation exists create a new one
            if (existingconvo.length == 0){
                const newconvo = new conversations_model({
                    person1: username,
                    person2: receiver
                });
                await newconvo.save();
            }
            //Reload page so the new conversation is shown in the conversations list
            res.redirect("/chat?keyword="+"No_convo")
        }
        else{
            res.send('<p>User does not exist</p> <a href="/chat?keyword="+"No_convo">Click here to go back</a>');
        }
    } 
    catch (error) {
        console.error('Error executing query:', error);
        res.redirect('/');
    }
});

//Router for when a user clicks on a conversation to see its messages
router.post('/change_chat', async (req, res)=> {
    //reload page with the URL containing the id of the required conversation
    convo = req.body.convo_id;
    res.redirect('/chat?keyword='+convo);

});

//When user clicks send after typing a message
router.post('/message_sent', async (req, res)=> {
    try{
        //save the new message
        const message = new messages_model({
            message: req.body.message,
            person_sent: req.session.name,
            conversation_id: req.body.convo_id
        });
        await message.save();
        //Reload the chat so user can see the new message sent
        res.redirect('/chat?keyword='+req.body.convo_id);
    }
    catch (error) {
        console.error('Error executing query:', error);
        res.redirect('/');
    };
});

//Function to calculate distance between two coordinates. Obtained at: 
function calculateDistance(lat1, lon1, lat2, lon2) {
    // Radius of the earth in kilometers
    var R = 6371;
    // Convert degrees to radians
    var dLat = toRadians(lat2 - lat1);
    var dLon = toRadians(lon2 - lon1);

    // Convert latitudes to radians
    lat1 = toRadians(lat1);
    lat2 = toRadians(lat2);

    // Apply the Haversine formula to find distance between two coordinates
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    // Calculate and return the distance
    var distance = R * c;
    return distance;
}

//Function to turn degrees to radians
function toRadians(degrees) {
    return degrees * (Math.PI / 180);
}

//This route is used to render the offers page
router.all('/offers', async (req, res) => {
    try{
        if (req.session.loggedin) {
            //Get the userdata for the logged in user
            const userData = await UserLogin.findOne({ username: req.session.name });
            //Get all offers still pending accepting
            let existingoffers = await offers_model.find({person_accepting:"None"});
            let filter_params = ["", 0, "", 0, 0];
            let sorting = req.body.sorting || "";
            //Get all unique categories for all offers
            let categories = [];
            for (i=0; i<existingoffers.length; i++){
                if (categories.includes(existingoffers[i].category) == false){
                    categories.push(existingoffers[i].category)
                }
            }
            //Route can be a get if url is typed in or a post after applying filters. This is the filters and sorting code
            if (req.method === 'POST') {
                //Retrieve filter parameters from input fields 
                filter_params = [
                    req.body.categories,
                    parseFloat(req.body.location),
                    req.body.availability,
                    parseFloat(req.body.max_price),
                    Number(req.body.rating)
                ];
                // Get today's date so only available dates after today are considered for availability
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                for (i=0; i<existingoffers.length; i++){
                    const futureDates = existingoffers[i].availability.filter(date => new Date(date) >= today);
                    existingoffers[i].availability = futureDates;
                }
                //Need to retrieve the ratings for each user so offers can be filtered/sorted based on the overall rating for a user
                let uniqueNames = [...new Set(existingoffers.map(offer => offer.person_offering))];
                let ratings_dic = {};
                let newUserData;
                //Create dictionary with usernames and their corresponding ratings
                for (i =0; i<uniqueNames.length; i++){
                    newUserData = await UserLogin.findOne({ username: uniqueNames[i] });
                    ratings_dic[uniqueNames[i]] = newUserData.user_rating;
                }
                //
                existingoffers = existingoffers.filter(offer => {
                    //measure the distance between user and each offer
                    const distance = calculateDistance(userData.location[0], userData.location[1], offer.location[0], offer.location[1]);
                    //measure time in days between each offer's earliest date and today
                    const days = (new Date(Math.min.apply(null, offer.availability.map(date => new Date(date)))) - new Date())/ (1000 * 60 * 60 * 24)
                    return (
                        //Filter based on category, price, days, price and user_rating
                        (filter_params[0] === "" || filter_params[0] === offer.category) &&
                        (filter_params[1] === 0 || distance <= filter_params[1]) &&
                        (filter_params[2] === "" || filter_params[2] >= days) &&
                        (filter_params[3] === 0 || offer.price <= filter_params[3]) &&
                        (filter_params[4] === 0 || ratings_dic[offer.person_offering] >= filter_params[4])
                    );
                });
                //To sort by location, measure distance for two offers and get smaller distance
                if (sorting === "Location") {
                    existingoffers = existingoffers.sort((first, second) => {
                        const distance1 = calculateDistance(userData.location[0], userData.location[1], first.location[0], first.location[1]);
                        const distance2 = calculateDistance(userData.location[0], userData.location[1], second.location[0], second.location[1]);
                        return distance1 - distance2;
                    });
                } 
                //To sort by availability, measure time in days between today and earliest availability for two offers. Get smaller time
                else if (sorting === "Availability") {
                    existingoffers = existingoffers.sort((first, second) => {
                        let smallestFirst = new Date(Math.min.apply(null, first.availability.map(date => new Date(date))));
                        let smallestSecond = new Date(Math.min.apply(null, second.availability.map(date => new Date(date))));
                        return smallestFirst - smallestSecond;
                    });
                }
                //Sort by price by getting the smallest price between each pair of offers
                else if (sorting === "Price") {
                    existingoffers = existingoffers.sort((first, second) => first.price - second.price);
                } 
                //Sort by rating by getting the largest user_rating between each pair of offers belonging to two users
                else if (sorting === "Rating") {
                    existingoffers = existingoffers.sort((first, second) => ratings_dic[second.person_offering] - ratings_dic[first.person_offering]);
                }

            }
            res.render('offers', {
                title: 'Offers',
                heading: 'Offers',
                loggedIn: true,
                offers: existingoffers,
                filters: filter_params,
                userData: userData,
                sorting: sorting,
                currentPage: 1, 
                categories: categories
            });

        } else {
            res.redirect('/login');
        }
    }
    catch (error) {
        console.error('Error executing query:', error);
        res.redirect('/');
    };
});

//Renders the seller dashboard page
router.get('/seller-dashboard', async (req, res) => {
    try{
        if (req.session.loggedin){
            //retrieve teh data for the logged in user
            const userData = await UserLogin.findOne({ username: req.session.name });
            ////retrieve all offers in which the logged in user is involved
            const offers = await offers_model.find({$or: [{person_offering: req.session.name},{person_accepting: req.session.name}]});
            //retrieve all conversations in which the logged in user is involved
            const existingconvos = await conversations_model.find({
                $or: [{person1: req.session.name},{person2: req.session.name}]
            });
            //retrieve all reviews in which the logged in user is involved
            const reviews = await reviews_model.find({person_offering:req.session.name})
            let earnings = 0;
            //Calculate earnings.
            for (i = 0; i<offers.length; i++){
                //If a person is offering a service he will receive the price money for it
                if (offers[i].person_offering == req.session.name && offers[i].person_accepting != "None"){
                    earnings += offers[i].price;

                }
                //If a person is accepting a service he will have to pay the price money for it
                else if (offers[i].person_accepting != "None"){
                    earnings -= offers[i].price;
                }
            }
            res.render('seller-dashboard', { title: 'Seller Dashboard', heading: 'Seller Dashboard', loggedIn: true, convos: existingconvos, userData: userData, offers: offers, reviews: reviews, earnings: earnings});
        }
        else{
            res.redirect('/login');
        }
    }
    catch (error) {
        console.error('Error executing query:', error);
        res.redirect('/');
    };
})

//If the user offering the service accepts the CTA, the user who made th CTA becomes the accepting user
router.post('/accept_proposal', async (req, res) => {
    try{
        await offers_model.updateOne(
            { _id: req.body.offerid },
            //All people proposing are deleted from offer as offer is already accepted
            { $set: { person_proposing: [], person_accepting: req.body.person } }
        )
        
        res.send('<p>Proposal has been accepted</p> <a href="/">Click here to go home</a>');
    }
    catch (error) {
        console.error('Error executing query:', error);
        res.redirect('/');
    };
})

//If the user offering the service rejcts the CTA, the user who made the CTA is removed from person_offering
router.post('/reject_proposal', async (req, res) => {
    try{
        const ouroffer = await offers_model.findOne({_id : req.body.offerid})
        array = ouroffer.person_proposing;
        let newArray = array.filter(item => item !== req.body.person);
        await offers_model.updateOne(
            { _id: req.body.offerid },
            { $set: { person_proposing: newArray} }
        )
        res.send('<p>Proposal has been refused</p> <a href="/">Click here to go home</a>');
    }
    catch (error) {
        console.error('Error executing query:', error);
        res.redirect('/');
    };
})

// When the personal details were updated via the Seller Dashboard
router.post('/updated', upload.single('image'), async (req, res) => {
	try {
        const userData = await UserLogin.findOne({ username: req.session.name });
        const userId = userData._id.toHexString();

        if (!userId) {
            console.log("userId is not defined.");
        } else {
            // Update profile picture and text fields
            if (req.file) {
                await UserLogin.findByIdAndUpdate(userId, {
                    name: req.body.name,
                    location: [req.body.lat, req.body.lng],
                    description: req.body.description,
                    qualifications: req.body.qualifications,
                    image: req.file.filename,
                    facebook: req.body.facebook,
                    instagram: req.body.instagram,
                    tiktok: req.body.tiktok
                })
                    .then(() => {
                        console.log("Profile updated successfully.");
                        res.redirect('/seller-dashboard');
                    })
                    .catch((err) => console.log("Profile update failed:", err));
            // Update only text fields
            } else if (!req.file) {
                await UserLogin.findByIdAndUpdate(userId, {
                    name: req.body.name,
                    location: [req.body.lat, req.body.lng],
                    description: req.body.description,
                    qualifications: req.body.qualifications,
                    facebook: req.body.facebook,
                    instagram: req.body.instagram,
                    tiktok: req.body.tiktok
                })
                    .then(() => {
                        console.log("Profile updated successfully.");
                        res.redirect('/seller-dashboard');
                    })
                    .catch((err) => console.log("Profile update failed:", err));
            }
        }
    } 
    catch (error) {
        console.error('Error executing query:', error);
        res.redirect('/');
    }
});

//Renders the offer page for the offer specified in the URL
router.get('/offer-page', async (req, res) => {
    try{
        if (req.session.loggedin) {
            offer_id = req.query.keyword;
            var existingoffer = 0;
            //If no offer specified in URL, default to 0
            if (offer_id == undefined){
                const existingoffers = await offers_model.find();
                existingoffer = existingoffers[0]
            }
            //Retrieve the offer specified in URL
            else{
                existingoffer = await offers_model.findOne({_id: offer_id });
            }
            //Retrieve comments for the offer and reviews and userdata for logged in user
            const comments = await comments_model.find({offer_id:existingoffer._id})
            const reviews = await reviews_model.find({person_offering:existingoffer.person_offering})
            const userData = await UserLogin.findOne({ username: existingoffer.person_offering });
            res.render('offer-page', { title: 'Offer Page', heading: existingoffer.title, loggedIn: true, offer_data: existingoffer, username: req.session.name, comments:comments, reviews: reviews, user_rating: userData.user_rating });
        } else {
            res.redirect('/login');
        }
    }
    catch (error) {
        console.error('Error executing query:', error);
        res.redirect('/');
    };
})
//Renders the seller profile page for the user specified in the URL (searched for home search bar)
router.get('/seller-profile', async (req, res) => {
    try{
        const user_searched = req.query.keyword;
        //Get all data for the searched user
        const userData = await UserLogin.findOne({ username: user_searched });
        if (userData != null){
            //If user exists get offers and reviews associated with him
            const offers = await offers_model.find({$or: [{person_offering: user_searched},{person_accepting: user_searched}]});
            const reviews = await reviews_model.find({person_offering:user_searched})
            if (!req.session.loggedin) res.render('seller-profile', { title: 'Seller Profile', heading: 'Seller Profile', loggedIn: false, offers: offers, reviews: reviews, user_rating: userData.user_rating, userData: userData })
            else res.render('seller-profile', { title: 'Seller Profile', heading: 'Seller Profile', loggedIn: true, offers: offers, reviews: reviews, user_rating: userData.user_rating, userData: userData })
        }
        else{
            res.send('<p>User does not exist</p> <a href="/">Click here to go home</a>');
        }
    }
    catch (error) {
        console.error('Error executing query:', error);
        res.redirect('/');
    };
})

router.get('/edit-listing', (req, res) => {
    if (req.session.loggedin) {
        res.render('edit-listing', { title: 'Edit Listing', heading: 'Edit Listing', loggedIn: true });
    } else {
        res.redirect('/login');
    }
})

//Called when a user clicks the CTA button for an offer
router.post('/CTA', async (req, res) => {
    try{
        if (req.session.loggedin) {
            //Find the data for current offer
            const offerData = await offers_model.findOne({ _id: req.body.id });
            //Only accept request if offer is not accepted already and if user clicking CTA is not the same as offering user
            if (offerData.person_accepting == "None" && req.session.name != offerData.person_offering){
                //Add person who clicked CTA to person_offering
                proposals = offerData.person_proposing;
                if (proposals.includes(req.session.name) == false){
                    proposals.push(req.session.name)
                }
                const result = await offers_model.updateOne({ _id: req.body.id}, { $set: { person_proposing: proposals } });
                res.send('<p>Offer has been sent</p> <a href="/offers">Click here to go back to offers</a>');
            }
            else{
                res.send('<p>Offer has already been fulfilled/This is your offer</p> <a href="/offers">Click here to go back to offers</a>');
            }
        }
        else{
            res.redirect('/login')
        }
    }
    catch (error) {
        console.error('Error executing query:', error);
        res.redirect('/');
    };
})

//Renders form to add a new listing
router.get('/new-listing', async (req, res) => {
    try{
        if (req.session.loggedin) {
            //Get data for logged in user and all offers
            const userData = await UserLogin.findOne({ username: req.session.name });
            const offers = await offers_model.find();
            let categories = [];
            //get all unique categories for the offers
            for (i=0; i<offers.length; i++){
                if (categories.includes(offers[i].category) == false){
                    categories.push(offers[i].category)
                }
            }
            res.render('new-listing', { title: 'New Listing', heading: 'New Listing', loggedIn: true, userData: userData, categories: categories });
        } else {
            res.redirect('/login');
        }
    }
    catch (error) {
        console.error('Error executing query:', error);
        res.redirect('/');
    };
})

router.post('/new_offer', upload.single('image'), async (req, res) => {
    try{
        // Insert new offer into the database
        if (req.body.categories == "Other"){
            category = req.body.other_cat;
        } else {
            category = req.body.categories
        };

        // Update offer picture and text fields
        if (req.file) {
            const newOffer = new offers_model({
                person_offering: req.session.name,
                title: req.body.title,
                person_accepting: "None",
                person_proposing: [],
                category: category,
                description: req.body.description,
                price: req.body.price,
                rating: 0,
                availability: req.body.selectedDates.split(","),
                location: [req.body.lat, req.body.lng],
                image: req.file.filename
            });

            await newOffer.save();
        // Update only text fields
        } else if (!req.file) {
            const newOffer = new offers_model({
                person_offering: req.session.name,
                title: req.body.title,
                person_accepting: "None",
                person_proposing: [],
                category: category,
                description: req.body.description,
                price: req.body.price,
                rating: 0,
                availability: req.body.selectedDates.split(","),
                location: [req.body.lat, req.body.lng],
            });

            await newOffer.save();
        }
        res.send('<p>Submission successful</p> <a href="/">Click here to go to the home page</a>');
    }
    catch (error) {
        console.error('Error executing query:', error);
        res.redirect('/');
    };
})

//Renders the login form if user is not logged in yet
router.get('/login', (req, res) => {
    if (req.session.loggedin){
        res.send('<p>You are already logged</p> <a href="/">Go home</a>');
    }
    else{
        res.render('login', { title: 'Login', heading: 'Login', loggedIn: false });
    };
})

//Called after user submits the  login form
router.post('/loggedin', async (req, res)=> {
	try {
        const user = req.body.user;
        const password = req.body.pass;
    
        // Find user in MongoDB
        const userData = await UserLogin.findOne({ username: user });
        if (!userData) {
            return res.send('<p>Username not found</p> <a href="/login">Go back</a>');
        }
    
        // Compare password hash
        const passwordMatch = await bcrypt.compare(password, userData.password);
        if (passwordMatch) {
            req.session.loggedin = true;
            req.session.name = user;
            return res.send('<p>Login has been successful</p> <a href="/">Click here to go to the home page</a>');
        } 
        else {
            return res.send('<p>Wrong Password</p> <a href="/login">Go back</a>');
        }
    } 
    catch (error) {
        console.error('Error executing query:', error);
        res.redirect('/');
    }
});

//Display register form if user is not already logged in
router.get("/register", (req, res) => {
    if (req.session.loggedin){
        res.send('<p>You are already logged in</p> <a href="/">Go back</a>');
    }
    else{
        res.render('register', { title: 'Register', heading: 'Register', loggedIn: false });
    };
});

//called after a user submits the register form
router.post('/registerred', async (req, res)=> {
    try{
        //Do the hash before the query call so the try except structure done in the login code above is not necessary
        let passwordHash = await bcrypt.hash(req.body.pass, 8);

        const existingUser = await UserLogin.findOne({ username: req.body.user });
        if (existingUser) {
            return res.send('<p>Username already taken</p> <a href="/register">Go back</a>');
        }
        
        // Insert new user into the database
        const newUser = new UserLogin({
            username: req.body.user,
            password: passwordHash,
            name: req.body.name,
            description: req.body.description,
            location: [req.body.lat, req.body.lng],
            user_rating: 0
        });
        await newUser.save();
        
        // Set session variables for logged in user
        req.session.loggedin = true;
        req.session.name = req.body.user;
        
        // Send response to the client
        res.send('<p>Registration successful</p> <a href="/">Click here to go to the home page</a>');
    } 
    catch (error) {
        console.error(error);
        res.redirect('/');
    }
});

//Called when a user clciks the submit comment button in an offer page
router.post('/add_comment', async (req, res)=> {
    try{
        // Insert new comment into the comments collection
        const newComment = new comments_model({
            username: req.body.username,
            comment: req.body.comment,
            offer_id: req.body.offerid
        });
        await newComment.save();
        res.redirect('/offer-page?keyword='+req.body.offerid);
    } 
    catch (error) {
        console.error(error);
        res.redirect('/');
    }
})
//Renders form to write a review
router.get('/write_review', async (req, res) => {
    try{
        //Get offer data so review form title contains the offer name
        if (req.session.loggedin){
            const offerData = await offers_model.findOne({ _id: req.query.keyword });
            res.render('review_writing', { title: offerData.title+' Review', heading: offerData.title+' Review', loggedIn: true, offer: offerData })
        }
        else{
            res.redirect('/login');
        };
    } 
    catch (error) {
        console.error(error);
        res.redirect('/');
    }
})

//called when user submits the review for an offer
router.post('/review_submitted', async (req, res)=> {
    try{
        //Add new review to reviews collection
        const newReview = new reviews_model({
            title: req.body.title,
            message: req.body.text,
            offer_id: req.body.offerid,
            rating: req.body.rating,
            person_offering: req.body.offerer,
            person_accepting: req.body.accepter
        });
        await newReview.save();
        //Update offer so its rating is equal to that specified in the review
        const result = await offers_model.updateOne({ _id: req.body.offerid}, { $set: { rating: req.body.rating } });
        const reviews = await reviews_model.find({person_offering:req.body.offerer})
        let user_rating = 0;
        //Must update user rating so it takes new rating into consideration
        for (i=0; i<reviews.length; i++){
            user_rating += reviews[i].rating;
        }
        user_rating = user_rating/reviews.length;
        const result2 = await userModel.updateOne({ username: req.body.offerer}, { $set: { user_rating: user_rating } });
        res.send('<p>Review Submitted. </p> <a href="/">Click here to go home</a>');
    } 
    catch (error) {
        console.error(error);
        res.redirect('/');
    }

})

//Called when someone searches for a user in the search tab
router.get('/find_user', async (req, res) => {
    try{
        //Make sure user specified exists before redirecting
        const userData = await UserLogin.find({ username: req.query.keyword });
        if (userData.length == 0){
            res.send('<p>User does not exist. </p> <a href="/">Click here to go home</a>');
        }
        else{
            res.redirect("/seller-profile?keyword="+req.query.keyword);
        }
    }
    catch (error) {
        console.error(error);
        res.redirect('/');
    }

})

module.exports = router;