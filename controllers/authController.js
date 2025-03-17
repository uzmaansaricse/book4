import useragent from "useragent";
import bcrypt from 'bcryptjs';

import nodemailer from "nodemailer";
import jwt from "jsonwebtoken";
import twilio from "twilio";
import fs from 'fs';
import Razorpay from "razorpay";

import csvParser from 'csv-parser';

import { uploadToCloudinary, deleteFromCloudinary } from "../utility/cloudinary.js";

import { UserLogin } from "../models/User Model & OTP Model.js";
// import { authMiddleware } from "../utility/middleware.js";

import { Imageadmin } from "../models/imageModel.js";

// book add withqur code 


import path from "path";
import { fileURLToPath } from 'url';

import { Book } from "../models/BookSchema.js";
import { bookUploadToCloudinary } from "../utility/bookAddCloudinary.js";


// excel me data sve sl no or qr code 
import { Qurexcel } from "../models/QRexcelsheet.js";

// oder model..
import { Order } from "../models/Order Model.js";

//  Order Tracking Model

import { OrderTracking } from "../models/Order Tracking Model.js";


const JWT_SECRET = process.env.JWT_SECRET;
const ADMIN_MOBILE = "9461978435";
const ADMIN_PASSWORD = "123";
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

const sendOtp = async (req, res) => {
    try {
        const { mobile } = req.body;
        if (!mobile) return res.status(400).json({ message: "Mobile number is required." });

        const formattedMobile = mobile.startsWith("+") ? mobile : `+91${mobile}`;
        const otp = generateOTP();
        const otpExpiresAt = new Date(Date.now() + 5 * 60000);

        let user = await UserLogin.findOne({ mobile });
        if (user) {
            user.otp = otp;
            user.otpExpiresAt = otpExpiresAt;
        } else {
            user = new UserLogin({ name: "Unknown", mobile, password: "defaultpassword", otp, otpExpiresAt });
        }
        await user.save();

        await client.messages.create({
            body: `Your OTP is: ${otp}`,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: formattedMobile
        });

        res.status(200).json({ message: "OTP sent successfully." });
    } catch (error) {
        console.error("Twilio Error:", error);
        res.status(500).json({ message: "Failed to send OTP. Try again later." });
    }
};

const signup = async (req, res) => {
    try {
        const { name, mobile, password, otp } = req.body;
        const user = await UserLogin.findOne({ mobile });
        if (!user || user.otp !== otp || user.otpExpiresAt < new Date()) {
            return res.status(400).json({ message: "Invalid OTP." });
        }
        user.name = name;
        user.password = await bcrypt.hash(password, 10);
        user.otp = null;
        user.otpExpiresAt = null;
        await user.save();
        res.status(201).json({ message: "Signup successful." });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const login = async (req, res) => {
    try {
        const { mobile, password } = req.body;

        if (mobile === ADMIN_MOBILE) {
            if (password !== ADMIN_PASSWORD) {
                return res.status(401).json({ message: "Invalid admin credentials." });
            }
            let admin = await UserLogin.findOne({ mobile: ADMIN_MOBILE });
            if (!admin) {
                admin = new UserLogin({
                    name: "Admin",
                    mobile: ADMIN_MOBILE,
                    password: await bcrypt.hash(ADMIN_PASSWORD, 10),
                    role: "admin"
                });
                await admin.save();
            }
            const token = jwt.sign({ role: "admin" }, JWT_SECRET, { expiresIn: "7d" });
            return res.status(200).json({ message: "Admin login successful.", token, role: "admin" });
        }

        const user = await UserLogin.findOne({ mobile });
        if (!user) return res.status(400).json({ message: "User not found." });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "Invalid credentials." });

        const token = jwt.sign({ userId: user._id, role: user.role }, JWT_SECRET, { expiresIn: "7d" });

        res.status(200).json({ message: "Login successful.", token, role: user.role });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


const forgotPassword = async (req, res) => {
    try {
        let { mobile } = req.body;
        const user = await UserLogin.findOne({ mobile });
        if (!user) return res.status(400).json({ message: "User not found." });

        const otp = generateOTP();
        user.otp = otp;
        user.otpExpiresAt = new Date(Date.now() + 5 * 60000);
        await user.save();

        await client.messages.create({
            body: `Your password reset OTP is: ${otp}`,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: mobile.startsWith("+") ? mobile : `+91${mobile}`
        });

        res.status(200).json({ message: "OTP sent for password reset." });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const resetPassword = async (req, res) => {
    try {
        const { mobile, otp, newPassword } = req.body;

        if (mobile === ADMIN_MOBILE) {
            return res.status(403).json({ message: "Admin password cannot be reset." });
        }

        const user = await UserLogin.findOne({ mobile });

        if (!user || user.otp !== otp || user.otpExpiresAt < new Date()) {
            return res.status(400).json({ message: "Invalid or expired OTP" });
        }

        user.password = await bcrypt.hash(newPassword, 10);
        user.otp = null;
        user.otpExpiresAt = null;
        await user.save();

        res.json({ message: "Password reset successful. You can now log in." });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

export { sendOtp, signup, login, forgotPassword, resetPassword };

// banner  uplaod ......
const uploadImage = async (req, res) => {
    try {
        const file = req.file;
        if (!file) return res.status(400).json({ success: false, message: "No file uploaded" });

        const result = await uploadToCloudinary(file.path);
        const newImage = await Imageadmin.create({ url: result.secure_url });

        res.json({ success: true, imageUrl: newImage.url, id: newImage._id });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// upoad image get admin panel banner
const getImages = async (req, res) => {
    const images = await Imageadmin.find();
    res.json({ success: true, images });
};
// delet image admin banner
const deleteImage = async (req, res) => {
    try {
        const { id } = req.params;
        const image = await Imageadmin.findById(id);
        if (!image) return res.status(404).json({ success: false, message: "Image not found" });

        await deleteFromCloudinary(image.url);
        await Imageadmin.findByIdAndDelete(id);

        res.json({ success: true, message: "Image deleted" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// bannaer update admin .............
const toggleBanner = async (req, res) => {
    try {
        const { id } = req.params;
        const image = await Imageadmin.findById(id);
        if (!image) return res.status(404).json({ success: false, message: "Image not found" });

        image.isBanner = !image.isBanner;
        await image.save();

        res.json({ success: true, message: "Banner status updated", isBanner: image.isBanner });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
//  user page get baner
const getBanners = async (req, res) => {
    const banners = await Imageadmin.find({ isBanner: true });
    res.json({ success: true, banners });
};



export { uploadImage, getImages, deleteImage, toggleBanner, getBanners };



// add book....

const addBook = async (req, res) => {
    try {
        console.log(" Request Body:", req.body);
        console.log(" Uploaded File:", req.file);

        let { title, author, price, offerPrice, description, category } = req.body;
        const bookImage = req.file?.path;

        //  Ensure category is "New", "Old", or "All"
        if (!["New", "Old", "All"].includes(category)) {
            return res.status(400).json({ message: "Category must be 'New', 'Old', or 'All'" });
        }

        //  Validate required fields
        if (!title || !author || !price || !offerPrice || !description || !bookImage) {
            return res.status(400).json({ message: "All fields are required" });
        }

        // ✅ Convert price & offerPrice to Number
        price = Number(price);
        offerPrice = Number(offerPrice);

        if (isNaN(price) || isNaN(offerPrice)) {
            return res.status(400).json({ message: "Price and Offer Price must be numbers" });
        }

        // ✅ Create and save book
        const newBook = new Book({
            title,
            author,
            price,
            offerPrice,
            description,
            category,
            bookImage
        });

        await newBook.save();
        console.log("✅ Book saved successfully!");

        res.status(201).json({ message: "Book added successfully", book: newBook });
    } catch (error) {
        console.error("❌ Error adding book:", error.message || error);
        res.status(500).json({ message: "Error adding book", error: error.message || error });
    }
};

// get addbook and add cart
const getBooks = async (req, res) => {
    try {
        const category = req.query.category || "All";
        const filter = category === "All" ? {} : { category };
        const books = await Book.find(filter);
        res.json(books);
    } catch (error) {
        res.status(500).json({ message: "Error fetching books", error });
    }
};
export { addBook, getBooks, };


// new book  add
const getNewBooks = async (req, res) => {
    try {
        const books = await Book.find({ category: "New" }); // New category wali books lo
        res.json({ books });
    } catch (error) {
        res.status(500).json({ message: "Error fetching new books", error });
    }
};
// bookDetails....
const getBookDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const book = await Book.findById(id);

        if (!book) {
            return res.status(404).json({ message: "Book not found" });
        }

        res.json(book);
    } catch (error) {
        console.error("Error fetching book details:", error);
        res.status(500).json({ message: "Error fetching book details" });
    }
};
 export {getBookDetails}

// old book add
const getOldBooksAdd = async (req, res) => {
    try {
        const books = await Book.find({ category: "Old" }); // Old category wali books lo
        res.json({ books }); // Same format me response bhejo
    } catch (error) {
        res.status(500).json({ message: "Error fetching old books", error: error.message });
    }
};

// oldbook details
const oldgetBookDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const book = await Book.findById(id);

        if (!book) {
            return res.status(404).json({ message: "Book not found" });
        }

        res.json(book);
    } catch (error) {
        console.error("Error fetching book details:", error);
        res.status(500).json({ message: "Error fetching book details" });
    }
};
 export {oldgetBookDetails}

export { getNewBooks, getOldBooksAdd }
// 📌 Get Books API (New, Old, All)



// admin book  fatch requset delete book 

const getBooksAllCategory = async (req, res) => {
    try {
        // Fetch all books from the database
        const books = await Book.find();
        res.status(200).json({ message: "Books retrieved successfully", books });
    } catch (error) {
        console.error("Error retrieving books:", error.message || error);
        res.status(500).json({ message: "Error retrieving books", error: error.message || error });
    }
};

const deleteBookById = async (req, res) => {
    try {
        const { id } = req.params;
        const book = await Book.findByIdAndDelete(id);

        if (!book) {
            return res.status(404).json({ message: "Book not found" });
        }

        res.status(200).json({ message: "Book deleted successfully" });
    } catch (error) {
        console.error("Error deleting book:", error.message || error);
        res.status(500).json({ message: "Error deleting book", error: error.message || error });
    }
};


export { getBooksAllCategory, deleteBookById };




// add book all show and cart

const getAllBooks = async (req, res) => {
    try {
        // Fetch all books from the database
        const books = await Book.find();

        // Respond with the list of books
        res.status(200).json({ message: "Books retrieved successfully", books });
    } catch (error) {
        console.error("Error retrieving books:", error.message || error);
        res.status(500).json({ message: "Error retrieving books", error: error.message || error });
    }
};
export { getAllBooks };

// search buttion ...
const SearchgetAllBooks = async (req, res) => {
    try {
        const { search } = req.query;
        let query = {};

        if (search) {
            query = {
                $or: [
                    { title: { $regex: search, $options: "i" } },  // Title match
                    { author: { $regex: search, $options: "i" } }, // Author match
                ],
            };
        }

        const books = await Book.find(query);

        res.status(200).json({ message: "Books retrieved successfully", books });
    } catch (error) {
        console.error("Error retrieving books:", error.message || error);
        res.status(500).json({ message: "Error retrieving books", error: error.message || error });
    }
};

export {SearchgetAllBooks};






// 📌 Excel File Upload API (QR Code Number and Serial Number upload)

// CSV Upload Controller
const uploadCSV = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: "CSV file required" });
    }

    const results = [];

    fs.createReadStream(req.file.path)
        .pipe(csvParser()) // Now it will work
        .on("data", (data) => {
            if (data.qrCode && data.serialNumber) {
                results.push({
                    qrCode: data.qrCode,
                    serialNumber: data.serialNumber
                });
            }
        })
        .on("end", async () => {
            try {
                if (results.length === 0) {
                    return res.status(400).json({ message: "No valid data found in CSV" });
                }

                await Qurexcel.insertMany(results);
                fs.unlinkSync(req.file.path); // Delete uploaded CSV
                res.json({ message: "CSV uploaded successfully", data: results });
            } catch (err) {
                res.status(500).json({ message: "Error saving data", error: err });
            }
        });
};

// QR Code Validation Controller
const validateQR = async (req, res) => {
    try {
        const { qrCode } = req.params;
        console.log("Scanned QR Code:", qrCode);

        const book = await Qurexcel.findOne({ qrCode: { $regex: new RegExp(`^${qrCode}$`, 'i') } });
        console.log("Database Book:", book);

        if (book) {
            return res.json({ message: "Valid Book", serialNumber: book.serialNumber });
        } else {
            return res.json({ message: "Fake Book" });
        }
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ message: "Server Error", error });
    }
};




export { uploadCSV, validateQR };




// 🔹 Razorpay Instance


import mongoose from "mongoose";


//  Razorpay Configuration
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// **🔹 Order Create API**
const createorder = async (req, res) => {
    try {
        console.log("Received Data:", req.body); // Debugging ke liye

        let { cart } = req.body;
        if (!cart || !Array.isArray(cart) || cart.length === 0) {
            return res.status(400).json({ error: "Cart is empty or invalid format" });
        }

        // ✅ Total Amount Calculate karo
        const totalAmount = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

        // ✅ Razorpay Order Options
        const options = {
            amount: totalAmount * 100, // Convert to paise
            currency: "INR",
        };

        // ✅ Razorpay Order Create
        const order = await razorpay.orders.create(options);
        res.json({ orderId: order.id, amount: options.amount });

    } catch (error) {
        console.error("Payment Error:", error); // Debugging ke liye
        res.status(500).json({ error: "Payment error", details: error.message });
    }
};

// **🔹 Save Order API**
const saveorder = async (req, res) => {
    try {
        const { paymentId, deliveryDetails, cart, totalAmount } = req.body;

        if (!cart || !Array.isArray(cart) || cart.length === 0) {
            return res.status(400).json({ success: false, message: "Cart data is invalid" });
        }

        // Order Save Logic
        const newOrder = new Order({
            userId: new mongoose.Types.ObjectId(), // JWT se set karna h
            books: cart.map(book => ({
                bookId: new mongoose.Types.ObjectId(book.id), //  Fix ID issue
                title: book.title,
                price: book.price,
                quantity: book.quantity,
            })),
            totalPrice: totalAmount,
            deliveryDetails,
            paymentId,
            status: "Paid"
        });

        await newOrder.save();
        res.json({ success: true, message: "Order saved successfully" });

    } catch (error) {
        console.error("Order Save Error:", error);
        res.status(500).json({ success: false, message: "Failed to save order" });
    }
};



export { createorder, saveorder };
// getRazorpaykey...
const getRazorpayKey = (req, res) => {
    res.json({ key: process.env.RAZORPAY_KEY_ID });
};
export { getRazorpayKey };


// 🔹 Get Orders API (Order Summary Table)

const usergetOrders = async (req, res) => {
    try {
        const { page = 1, limit = 10, status, search } = req.query;

        console.log("Page:", page, "Limit:", limit, "Status:", status, "Search:", search);

        let filter = {};
        if (status) filter.status = status;
        if (search) {
            filter.$or = [
                { orderId: { $regex: search, $options: "i" } },
                { customerName: { $regex: search, $options: "i" } }
            ];
        }

        console.log("Filter Applied:", filter);

        // SELECT hata diya taaki pura data aaye
        const orders = await Order.find(filter)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit));

        const totalOrders = await Order.countDocuments(filter);

        console.log("Orders Found:", orders); // Debugging

        res.json({
            success: true,
            orders,
            totalPages: Math.ceil(totalOrders / limit),
            currentPage: parseInt(page)
        });

    } catch (error) {
        console.error("Fetch Orders Error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch orders" });
    }
};

export { usergetOrders }




// order  traking........


const getOrderAnalytics = async (req, res) => {
    try {
        const dailyOrders = await Order.aggregate([
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    count: { $sum: 1 },
                    orderIds: { $push: "$_id" } // ✅ Order IDs include kiye
                }
            },
            { $sort: { _id: 1 } }
        ]);

        const monthlyOrders = await Order.aggregate([
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
                    count: { $sum: 1 },
                    orderIds: { $push: "$_id" } // ✅ Order IDs include kiye
                }
            },
            { $sort: { _id: 1 } }
        ]);

        const yearlyOrders = await Order.aggregate([
            {
                $group: {
                    _id: { $dateToString: { format: "%Y", date: "$createdAt" } },
                    count: { $sum: 1 },
                    orderIds: { $push: "$_id" } // ✅ Order IDs include kiye
                }
            },
            { $sort: { _id: 1 } }
        ]);

        res.json({ dailyOrders, monthlyOrders, yearlyOrders });
    } catch (error) {
        res.status(500).json({ error: "Server error" });
    }
};

const getAllOrders = async (req, res) => {
    try {
        const { date } = req.query;
        let filter = {};

        if (date) {
            const startDate = new Date(date);
            startDate.setHours(0, 0, 0, 0); // 🔹 Day start time

            const endDate = new Date(date);
            endDate.setHours(23, 59, 59, 999); // 🔹 Day end time

            filter.createdAt = { $gte: startDate, $lte: endDate };
        }

        const orders = await Order.find(filter).sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: "Server error" });
    }
};


// ✅ Order Update API bhi latest sorting ke saath response bhejega
const updateOrderStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status } = req.body;

        const order = await Order.findByIdAndUpdate(
            orderId,
            { status, pendingSince: status === "Pending" ? Date.now() : null, $push: { statusHistory: { status } } },
            { new: true }
        );

        if (!order) return res.status(404).json({ error: "Order not found" });

        const { sortBy } = req.query;
        let sortQuery = sortBy === "serialNumber" ? { serialNumber: 1 } : { createdAt: -1 };
        const updatedOrders = await Order.find({}).sort(sortQuery);

        res.json(updatedOrders);
    } catch (error) {
        res.status(500).json({ error: "Server error" });
    }
};




// ✅ 3️⃣ Order Tracking (User Order ID se apna order check kare)

const trackOrder = async (req, res) => {
    try {
        const { orderId } = req.params;
        const order = await Order.findById(orderId).populate('books.bookId', 'title price');

        if (!order) return res.status(404).json({ error: "Order not found" });

        // Calculate total price for each book
        const books = order.books.map(book => ({
            title: book.bookId.title,
            quantity: book.quantity,
            totalPrice: book.quantity * book.bookId.price
        }));

        res.json({
            orderId: order._id,
            status: order.status,
            lastUpdated: order.updatedAt,
            books: books,
            statusHistory: order.statusHistory.map(entry => ({
                status: entry.status,
                updatedAt: entry.updatedAt || null
            }))
        });
    } catch (error) {
        console.error("Error tracking order:", error);
        res.status(500).json({ error: "Server error" });
    }
};


// ✅ 4️⃣ User Order History (Mobile number se user apne orders dekhe)
const getUserOrders = async (req, res) => {
    try {
        const { mobile } = req.params;
        const orders = await Order.find({ "deliveryDetails.mobile": mobile })
            .select("status createdAt updatedAt books totalPrice"); // ✅ Necessary fields fetch karo

        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: "Server error" });
    }
};


// ✅ Get orders pending for more than 7 days
const getPendingOrders = async (req, res) => {
    try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        console.log("Seven Days Ago:", sevenDaysAgo);

        const pendingOrders = await Order.find({
            status: "Pending",
            pendingSince: { $lte: sevenDaysAgo }, // Ensure this is a Date field
        }).select("_id status pendingSince deliveryDetails");

        console.log("Orders Found:", pendingOrders);
        res.json(pendingOrders);
    } catch (error) {
        res.status(500).json({ error: "Server error" });
    }
};

// ✅ Manually delete an order
const deleteOrderPending = async (req, res) => {
    try {
        const { orderId } = req.params;
        await Order.findByIdAndDelete(orderId);
        res.json({ success: true, message: "Order deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to delete order" });
    }
};

// ✅ Auto-delete orders when status is updated
const pendingUpdateAutoDelete = async (req, res) => {
    try {
        const { orderId, status } = req.body;
        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        // ✅ Agar order 7 din se pending tha aur status update ho gaya, to delete kar do
        if (order.status === "Pending" && new Date(order.pendingSince) <= new Date(new Date().setDate(new Date().getDate() - 7))) {
            await Order.findByIdAndDelete(orderId);
            return res.json({ success: true, message: "Order auto-deleted as status updated." });
        }

        order.status = status;
        await order.save();
        res.json({ success: true, message: "Order status updated." });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to update status." });
    }
};




export { getOrderAnalytics, updateOrderStatus, trackOrder, getUserOrders, getPendingOrders, getAllOrders, deleteOrderPending, pendingUpdateAutoDelete }


