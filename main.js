import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import cors from "cors";
import multer from "multer"
import { fileURLToPath } from "url";
 import { upload } from "./utility/cloudinary.js";
 import { uploadBook } from "./utility/bookAddCloudinary.js";

 import fs, { appendFile } from 'fs';


 import {  addBook,  createorder,     deleteBookById,     deleteImage,   deleteOrderPending,   forgotPassword,  getAllBooks,  getAllOrders, getBanners,  getBookDetails,  getBooks,    getBooksAllCategory,    getImages,    getNewBooks,        getOldBooksAdd,    getOrderAnalytics,     
          
         
          
     getPendingOrders,      getRazorpayKey,          getUserOrders,    login,        oldgetBookDetails,        pendingUpdateAutoDelete,        resetPassword,               saveorder,        SearchgetAllBooks,        sendOtp,   signup,   toggleBanner,          trackOrder,          updateOrderStatus,  
    uploadCSV,    uploadImage,      usergetOrders,      validateQR,   } from "./controllers/authController.js";
// import { authMiddleware } from "./utility/middleware.js";
//   import { upload } from "./utility/bookAddCloudinary.js";


dotenv.config({});



const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
// Middl
app.use(express.json());  // To parse JSON data
app.use(cors()); // To allow cross-origin requests
// app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, "../forntendbook")));
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../index.html"));
});


// regester user with otp ..........
//
// ✅ Send OTP
app.post("/send-otp", sendOtp);

// ✅ User Signup
app.post("/signup", signup);

// ✅ User/Admin Login (Both handled here)
app.post("/login", login);

app.post("/forgot-password", forgotPassword);

app.post("/reset-password", resetPassword);

// app.get("/admin", authMiddleware)


// baner show...
app.post("/api/upload-imagepanel", upload.single("image"), uploadImage);
app.get("/api/get-images", getImages);
app.delete("/api/delete-image/:id", deleteImage);
app.put("/api/toggle-banner/:id", toggleBanner);
app.get("/api/banners", getBanners);


// book add with qur logo ..........

// 📌 Book Routes
 app.post("/api/add-book", uploadBook.single("image"), addBook);
 app.get("/api/get-books", getBooks);  // add cart  

 //  admin delete book 
app.get("/api/get-All-books", getBooksAllCategory);  
app.delete("/api/delete-book/:id", deleteBookById);
// all books show and addcart
app.get("/api/all-book-Show",getAllBooks);
app.get("/api/newbook",getNewBooks );
app.get("/api/old-book",getOldBooksAdd);

app.get("/api/Searchbook",SearchgetAllBooks);
app.get("/BookDetails/:id", getBookDetails);
app.get("/oldBookDetails/:id", oldgetBookDetails);




// Qr code csv file upolad
// 📌 Ensure upload directory exists
const uploadDir = path.join(__dirname, "uploads");

// 📌 Multer Storage Setup
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir); // Ensure "uploads" folder is correct
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + "-" + file.originalname);
    }
});

const excelupload = multer({ storage });

// 📌 CSV Upload Route
app.post("/api/csvupload", excelupload.single("file"), uploadCSV);

// 📌 QR Code Validation Route
app.get("/api/validate/:qrCode", validateQR);

// // order....

app.post("/api/create-order",createorder);

app.post("/api/save-order", saveorder );
app.get("/api/get-razorpay-key", getRazorpayKey);

// user order  by chek admin.(Order Summary Table)
app.get("/api/get", usergetOrders)


// order tarcking..

app.get("/admin/analytics", getOrderAnalytics); // Admin Order Analytics (Graph ke liye)
app.get("/admin/orders", getAllOrders);
app.put("/admin/order/:orderId", updateOrderStatus); //Admin Order Update (Order status update kare)
app.get("/track/:orderId", trackOrder); // Order Tracking (User Order ID se order check kare)
app.get("/user-orders/:mobile", getUserOrders);//User Order History (Mobile number se orders check kare)

//  7+ din se pending orders lene ke liye
app.get("/api/admin/pending-orders", getPendingOrders);//7 Days se Pending Orders (Admin Alert Page)

//  Admin manually delete kare
app.delete("/api/admin-delete-order/:orderId", deleteOrderPending);
//  Agar status update ho jaye to order auto-delete ho
app.post("/api/update-order-status", pendingUpdateAutoDelete);






// MongoDB Connect
// MongoDB Connection
const connectionMongoDb = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
         
        });
        console.log("MongoDB se connected successfully");
    } catch (error) {
        console.error("MongoDB connection error:", error);
        process.exit(1); // Fatal error, exit process
    }
};

// Server start
const PORT = 9000; // Port number
app.listen(PORT, async () => {
    console.log(`App is running on http://localhost:${PORT}`);
    await connectionMongoDb(); // MongoDB connection call
});











